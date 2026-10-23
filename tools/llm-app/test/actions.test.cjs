const { test } = require('node:test');
const assert = require('node:assert/strict');
const findSchools = require('../actions/find-schools/index.js');
const compareSchools = require('../actions/compare-schools/index.js');
const definitions = require('../action-definitions.json');
const createServer = require('../serve.cjs');

test('find_schools returns the handler/widget contract and the curated Northern VA shortlist', async () => {
  const result = await findSchools({ query: ' Cybersecurity ', state: 'VA', format: 'hybrid' });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.mode, 'search');
  assert.equal(result.structuredContent.illustrativeData, true);
  assert.equal(result.structuredContent.records.length, 3);
  assert.deepEqual(result.structuredContent.arguments, { query: 'Cybersecurity', state: 'VA', format: 'hybrid' });
  assert.match(result.content[0].text, /school names and data are illustrative/i);
  assert.match(result.structuredContent.disclaimer, /eligibility and benefit amounts are not determined/i);
  assert.match(result.content[0].text, /https:\/\/www.va.gov\/education\/gi-bill-comparison-tool\//);
});

test('search combines filters, supports city lookup and preserves genuine empty results', async () => {
  const online = await findSchools({ state: 'VA', format: 'online' });
  assert.deepEqual(online.structuredContent.records.map((record) => record.id), ['school-commonwealth', 'school-capital']);
  const city = await findSchools({ query: 'ROCKVILLE' });
  assert.equal(city.structuredContent.records[0].id, 'school-chesapeake');
  const empty = await findSchools({ query: 'not-a-real-program' });
  assert.deepEqual(empty.structuredContent.records, []);
  assert.equal(empty.isError, undefined);
  const all = await findSchools();
  assert.equal(all.structuredContent.records.length, 6);
});

test('search rejects malformed, unsupported and excessive inputs explicitly', async () => {
  const inputs = [
    null, [], 'cybersecurity', { query: 10 }, { query: 'a'.repeat(101) },
    { state: 'CA' }, { format: 'remote' }, { query: null }, { state: [] },
    { format: {} }, { email: 'not-required@example.com' },
  ];
  await Promise.all(inputs.map(async (input) => {
    const result = await findSchools(input);
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.length > 0);
    assert.deepEqual(result.structuredContent.records, []);
  }));
  const boundary = await findSchools({ query: 'a'.repeat(100) });
  assert.equal(boundary.isError, undefined);
});

test('comparison preserves the chosen order for two or three schools', async () => {
  const schoolIds = ['school-capital', 'school-potomac', 'school-commonwealth'];
  const result = await compareSchools({ schoolIds });
  assert.equal(result.structuredContent.mode, 'comparison');
  assert.deepEqual(result.structuredContent.records.map((record) => record.id), schoolIds);
  assert.equal(result.structuredContent.records[0].annualTuitionUsd, 32000);
  assert.equal(result.structuredContent.illustrativeData, true);
  const pair = await compareSchools({ schoolIds: schoolIds.slice(0, 2) });
  assert.equal(pair.structuredContent.records.length, 2);
});

test('comparison rejects invalid selections without silently dropping schools', async () => {
  const inputs = [
    undefined, null, [], {}, { schoolIds: [] }, { schoolIds: ['school-potomac'] },
    { schoolIds: ['school-potomac', 'school-potomac'] },
    { schoolIds: ['school-potomac', 'unknown'] },
    { schoolIds: ['school-potomac', 1] },
    { schoolIds: 'school-potomac,school-capital' },
    { schoolIds: ['school-potomac', 'school-capital', 'school-commonwealth', 'school-district'] },
    { schoolIds: ['school-potomac', 'school-capital'], email: 'not-required@example.com' },
  ];
  await Promise.all(inputs.map(async (input) => {
    const result = await compareSchools(input);
    assert.equal(result.isError, true);
    assert.deepEqual(result.structuredContent.records, []);
  }));
});

test('manual action metadata matches identifiers, supported filters and read-only behavior', () => {
  assert.deepEqual(definitions.map((definition) => definition.code), ['find_schools', 'compare_schools']);
  definitions.forEach((definition) => {
    assert.equal(definition.annotations.readOnlyHint, true);
    assert.equal(definition.inputSchema.additionalProperties, false);
  });
  assert.deepEqual(definitions[0].inputSchema.properties.state.enum, ['VA', 'MD', 'DC']);
  assert.equal(definitions[1].inputSchema.properties.schoolIds.minItems, 2);
  assert.equal(definitions[1].inputSchema.properties.schoolIds.maxItems, 3);
  assert.equal(definitions[1].inputSchema.properties.schoolIds.uniqueItems, true);
});

test('local host serves test content and real handlers without exposing repository files', async (context) => {
  const server = createServer();
  await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /VA education benefits/);
  assert.doesNotMatch(html, /demo/i);
  const action = await fetch(`${origin}/api/find-schools?args=${encodeURIComponent(JSON.stringify({ query: 'Cybersecurity', state: 'VA' }))}`);
  assert.equal((await action.json()).structuredContent.records.length, 3);
  const catalog = await fetch(`${origin}/scripts/gi-bill-schools.json`);
  assert.equal(catalog.status, 200);
  assert.equal((await catalog.json()).length, 6);
  const sharedModule = await fetch(`${origin}/scripts/gi-bill-catalog.mjs`);
  assert.match(sharedModule.headers.get('content-type'), /javascript/);
  assert.match(await sharedModule.text(), /export function findSchools/);
  const invalid = await fetch(`${origin}/api/find-schools?args=not-json`);
  assert.equal(invalid.status, 400);
  const hidden = await fetch(`${origin}/scripts/auth.js`);
  assert.equal(hidden.status, 404);
  const post = await fetch(`${origin}/api/find-schools`, { method: 'POST' });
  assert.equal(post.status, 400);
});

test('school actions and metadata do not label the experience as a demonstration', async () => {
  const search = await findSchools({ state: 'VA' });
  const comparison = await compareSchools({ schoolIds: ['school-potomac', 'school-commonwealth'] });
  const invalid = await compareSchools({});
  [search, comparison, invalid, definitions].forEach((value) => {
    assert.doesNotMatch(JSON.stringify(value), /demo/i);
  });
});

test('site and server actions share identical catalog behavior and result shapes', async () => {
  const { findSchools: siteSearch, compareSchools: siteCompare } = await import('../../../scripts/gi-bill-catalog.mjs');
  // eslint-disable-next-line global-require
  const schools = require('../../../scripts/gi-bill-schools.json');
  const args = { query: 'cybersecurity', state: 'VA', format: 'hybrid' };
  assert.deepEqual(siteSearch(schools, args), await findSchools(args));
  const schoolIds = ['school-potomac', 'school-commonwealth'];
  assert.deepEqual(siteCompare(schools, { schoolIds }), await compareSchools({ schoolIds }));
});

test('shared result validation keeps empty search results distinct from invalid catalog data', async () => {
  const { validRecord, validData } = await import('../../../scripts/gi-bill-catalog.mjs');
  const search = await findSchools();
  const [school] = search.structuredContent.records;
  assert.equal(validData(search.structuredContent), true);
  assert.equal(validData({ ...search.structuredContent, records: [] }), true);
  assert.equal(validData({ ...search.structuredContent, records: [{ id: 'school-missing-fields' }] }), false);
  assert.equal(validRecord(null), null);
  assert.equal(validData({ ...search.structuredContent, records: Array(7).fill(school) }), false);
  assert.equal(validData({ ...search.structuredContent, mode: 'comparison', records: [] }), false);
  assert.equal(validData({ ...search.structuredContent, records: [school, school] }), false);
});

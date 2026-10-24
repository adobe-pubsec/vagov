const DISCLAIMER = 'School names and data are illustrative, not verified institution information. Confirm school approval, tuition, and Yellow Ribbon participation with VA. Eligibility and benefit amounts are not determined here.';
const OFFICIAL_TOOL = 'https://www.va.gov/education/gi-bill-comparison-tool/';

export function validRecord(record) {
  return record && typeof record.id === 'string' && /^school-[a-z-]+$/.test(record.id)
    && ['name', 'city', 'state', 'type'].every((key) => (
      typeof record[key] === 'string' && record[key].length > 0 && record[key].length <= 150
    ))
    && ['programs', 'formats'].every((key) => (
      Array.isArray(record[key]) && record[key].length > 0 && record[key].length <= 10
      && record[key].every((value) => typeof value === 'string' && value.length <= 100)
    ))
    && Number.isFinite(record.annualTuitionUsd) && record.annualTuitionUsd >= 0
    && typeof record.yellowRibbon === 'boolean';
}

export function validData(data) {
  return data?.illustrativeData === true && ['search', 'comparison'].includes(data.mode)
    && typeof data.disclaimer === 'string' && data.disclaimer.length > 0
    && Array.isArray(data.records) && data.records.length <= 6
    && data.records.every(validRecord)
    && new Set(data.records.map((record) => record.id)).size === data.records.length
    && (data.mode !== 'comparison' || (data.records.length >= 2 && data.records.length <= 3));
}

function result(mode, args, records) {
  return {
    content: [{
      type: 'text',
      text: `${mode === 'search' ? 'Found' : 'Comparing'} ${records.length} schools. ${DISCLAIMER} Official VA GI Bill Comparison Tool: ${OFFICIAL_TOOL}`,
    }],
    structuredContent: {
      mode, arguments: args, records, illustrativeData: true, disclaimer: DISCLAIMER,
    },
  };
}

function error(text) {
  return {
    isError: true,
    content: [{ type: 'text', text }],
    structuredContent: { records: [], illustrativeData: true, disclaimer: DISCLAIMER },
  };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function findSchools(schools, args = {}) {
  if (!isObject(args) || Object.keys(args).some((key) => !['query', 'state', 'format'].includes(key))) {
    return error('Use only query, state, and format to search schools.');
  }
  const { query = '', state = '', format = '' } = args;
  if (typeof query !== 'string' || query.length > 100) {
    return error('Use a program or school search of at most 100 characters.');
  }
  if (typeof state !== 'string' || !['', 'VA', 'MD', 'DC'].includes(state)) {
    return error('Choose VA, MD, or DC, or omit state to search all locations.');
  }
  if (typeof format !== 'string' || !['', 'in-person', 'hybrid', 'online'].includes(format)) {
    return error('Choose in-person, hybrid, or online, or omit format.');
  }
  const normalizedQuery = query.trim().toLowerCase();
  const records = schools.filter((school) => {
    const searchable = [school.name, school.city, ...school.programs].join(' ').toLowerCase();
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (!state || school.state === state)
      && (!format || school.formats.includes(format));
  });
  return result('search', { query: query.trim(), state, format }, records);
}

export function compareSchools(schools, args = {}) {
  if (!isObject(args) || Object.keys(args).some((key) => key !== 'schoolIds')) {
    return error('Provide schoolIds with two or three distinct IDs from find_schools.');
  }
  const { schoolIds } = args;
  if (!Array.isArray(schoolIds) || schoolIds.length < 2 || schoolIds.length > 3
    || schoolIds.some((id) => typeof id !== 'string' || !schools.some((school) => school.id === id))
    || new Set(schoolIds).size !== schoolIds.length) {
    return error('Choose two or three distinct, known school IDs from find_schools.');
  }
  return result('comparison', { schoolIds }, schoolIds.map((id) => (
    schools.find((school) => school.id === id)
  )));
}

import {
  findSchools, compareSchools, validRecord, validData,
} from '../../scripts/gi-bill-catalog.mjs';

const OFFICIAL_TOOL = 'https://www.va.gov/education/gi-bill-comparison-tool/';
const MONEY = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function buildTable(records) {
  const scroll = el('div', undefined, 'comparison-scroll');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'School comparison; scroll horizontally on small screens');
  const table = el('table');
  table.append(el('caption', 'Your school shortlist'));
  const head = el('thead');
  const titles = el('tr');
  [el('th', 'Compare'), ...records.map((record) => el('th', record.name))].forEach((cell) => {
    cell.scope = 'col';
    titles.append(cell);
  });
  head.append(titles);
  const body = el('tbody');
  const rows = [
    ['Location', (record) => `${record.city}, ${record.state}`],
    ['School type', (record) => record.type],
    ['Programs', (record) => record.programs.join(', ')],
    ['Attendance options', (record) => record.formats.join(', ')],
    ['Illustrative annual tuition', (record) => MONEY.format(record.annualTuitionUsd)],
    ['Yellow Ribbon participation', (record) => (record.yellowRibbon ? 'Yes' : 'No')],
    ['GI Bill payment / remaining cost', () => 'Not calculated. Verify eligibility and current rates with VA.'],
  ];
  rows.forEach(([label, value]) => {
    const row = el('tr');
    const heading = el('th', label);
    heading.scope = 'row';
    row.append(heading, ...records.map((record) => el('td', value(record))));
    body.append(row);
  });
  table.append(head, body);
  scroll.append(table);
  return scroll;
}

export default async function decorate(block, bridge) {
  const authoredLink = block.querySelector('a[href]');
  let destination;
  if (authoredLink) {
    try {
      destination = new URL(authoredLink.href);
      if (destination.protocol !== 'https:' || destination.username || destination.password) {
        throw new Error('The education handoff must be an HTTPS URL without credentials.');
      }
      destination.search = '';
      destination.hash = '';
    } catch (error) {
      destination = undefined;
      // eslint-disable-next-line no-console
      console.error('[gi-bill-comparison] Invalid education link:', error);
    }
  }

  let previousSearch;
  let version = 0;
  let searchForm;
  let searchStatus;
  let schools;
  const connected = bridge?.isConnected && bridge.hostContext?.preview !== true;
  const canCompare = !connected || typeof bridge.callTool === 'function';
  const unsupportedComparison = 'Ask your assistant to compare these schools. This host does not support the comparison button.';

  async function callTool(name, args) {
    if (connected) return bridge.callTool(name, args);
    if (!schools) {
      const url = new URL('../../scripts/gi-bill-schools.json', import.meta.url);
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`School catalog request failed (${response.status}).`);
      const records = await response.json();
      if (!Array.isArray(records) || records.length > 6 || !records.every(validRecord)
        || new Set(records.map((record) => record.id)).size !== records.length) {
        throw new Error('School catalog has an invalid format.');
      }
      schools = records;
    }
    if (name === 'find_schools') return findSchools(schools, args);
    if (name === 'compare_schools') return compareSchools(schools, args);
    throw new Error(`Unsupported school action: ${name}`);
  }

  function handoff(ids) {
    if (!authoredLink) return null;
    if (!destination) return el('p', 'The education handoff link is invalid.', 'configuration-notice');
    const link = el('a', 'Explore GI Bill benefits', 'education-link');
    const url = new URL(destination);
    url.searchParams.set('source', connected ? 'llm-app' : 'school-comparison');
    if (ids.length) url.searchParams.set('schoolIds', ids.join(','));
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function render(result) {
    version += 1;
    const currentVersion = version;
    const header = el('div', undefined, 'comparison-header');
    const heading = el('h2', 'Find your next chapter');
    heading.tabIndex = -1;
    header.append(el('p', 'EDUCATION BENEFITS', 'eyebrow'), heading);
    block.replaceChildren(header);
    if (searchForm) block.append(searchForm, searchStatus);
    const data = result?.structuredContent;
    if (result?.isError || !validData(data)) {
      const errorText = Array.isArray(result?.content)
        ? result.content.find((part) => part?.type === 'text' && typeof part.text === 'string')?.text
        : undefined;
      const notice = el('p', result?.isError
        ? errorText || 'The action could not be completed.'
        : 'School results are unavailable or have an invalid format. Try searching again.', 'error');
      notice.setAttribute('role', 'alert');
      block.append(notice);
      if (previousSearch) {
        const back = el('button', 'Back to results');
        back.type = 'button';
        back.addEventListener('click', () => {
          render(previousSearch);
          block.querySelector('h2')?.focus();
        });
        block.append(back);
      }
      return;
    }
    const official = el('a', 'Visit the official VA GI Bill Comparison Tool');
    official.href = OFFICIAL_TOOL;
    official.target = '_blank';
    official.rel = 'noopener noreferrer';
    const sources = el('p', undefined, 'sources');
    sources.append(official);

    if (data.mode === 'comparison') {
      block.append(buildTable(data.records));
      const continueLink = handoff(data.records.map((record) => record.id));
      if (continueLink) block.append(continueLink);
      if (previousSearch) {
        const back = el('button', 'Back to results');
        back.type = 'button';
        back.className = 'secondary';
        back.addEventListener('click', () => {
          render(previousSearch);
          block.querySelector('h2')?.focus();
        });
        block.append(back);
      }
    } else {
      previousSearch = result;
      if (!data.records.length) {
        block.append(el('p', 'No schools match those filters. Try another program, location, or attendance option.', 'empty'));
      } else {
        const selected = new Set();
        const cards = el('div', undefined, 'school-grid');
        const status = el('p', canCompare ? 'Select 2 or 3 schools to compare.' : unsupportedComparison, 'selection-status');
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        const compare = el('button', 'Compare selected schools');
        compare.type = 'button';
        compare.disabled = true;
        let continueLink = handoff([]);

        data.records.forEach((record) => {
          const card = el('article', undefined, 'school-card');
          card.append(el('p', record.type, 'school-type'), el('h3', record.name));
          card.append(el('p', `${record.city}, ${record.state}`));
          card.append(el('p', record.programs.join(' / '), 'programs'));
          card.append(el('p', `Attendance: ${record.formats.join(', ')}`));
          card.append(el('p', `${MONEY.format(record.annualTuitionUsd)} illustrative annual tuition`, 'tuition'));
          const label = el('label', undefined, 'school-select');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = record.id;
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) selected.add(record.id);
            else selected.delete(record.id);
            cards.querySelectorAll('input').forEach((input) => {
              input.disabled = selected.size === 3 && !input.checked;
            });
            compare.disabled = selected.size < 2 || !canCompare;
            status.textContent = canCompare ? `${selected.size} selected. Choose 2 or 3 schools to compare.` : unsupportedComparison;
            if (continueLink) {
              const nextLink = handoff([...selected]);
              continueLink.replaceWith(nextLink);
              continueLink = nextLink;
            }
          });
          label.append(checkbox, el('span', `Compare ${record.name}`));
          card.append(label);
          cards.append(card);
        });
        compare.addEventListener('click', async () => {
          compare.disabled = true;
          cards.querySelectorAll('input').forEach((input) => { input.disabled = true; });
          status.textContent = 'Loading your comparison...';
          block.setAttribute('aria-busy', 'true');
          try {
            const comparison = await callTool('compare_schools', { schoolIds: [...selected] });
            if (version === currentVersion) {
              render(comparison);
              block.querySelector('h2')?.focus();
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[gi-bill-comparison] Comparison request failed:', error);
            if (version === currentVersion) {
              status.textContent = 'Unable to load the comparison. Try again.';
              compare.disabled = false;
              cards.querySelectorAll('input').forEach((input) => {
                input.disabled = selected.size === 3 && !input.checked;
              });
            }
          } finally {
            block.removeAttribute('aria-busy');
          }
        });
        block.append(cards, status, compare);
        if (continueLink) block.append(continueLink);
      }
    }
    block.append(sources, el('p', data.disclaimer, 'data-note'));
  }

  if (!connected) {
    searchForm = el('form', undefined, 'school-search');
    const queryLabel = el('label', 'Program or school');
    const query = document.createElement('input');
    query.name = 'query';
    query.type = 'search';
    query.maxLength = 100;
    query.value = 'cybersecurity';
    queryLabel.append(query);
    searchForm.append(queryLabel);
    const filters = [
      ['state', 'State', [['', 'All locations'], ['VA', 'Virginia'], ['MD', 'Maryland'], ['DC', 'Washington, DC']], 'VA'],
      ['format', 'Attendance', [['', 'Any format'], ['in-person', 'In person'], ['hybrid', 'Hybrid'], ['online', 'Online']], ''],
    ];
    filters.forEach(([name, title, options, value]) => {
      const label = el('label', title);
      const select = document.createElement('select');
      select.name = name;
      options.forEach(([optionValue, text]) => {
        const option = el('option', text);
        option.value = optionValue;
        select.append(option);
      });
      select.value = value;
      label.append(select);
      searchForm.append(label);
    });
    const submit = el('button', 'Find schools');
    submit.type = 'submit';
    searchForm.append(submit);
    searchStatus = el('p', undefined, 'search-status');
    searchStatus.setAttribute('role', 'status');
    searchStatus.setAttribute('aria-live', 'polite');

    const search = async () => {
      submit.disabled = true;
      searchStatus.textContent = 'Searching schools...';
      try {
        const result = await callTool('find_schools', Object.fromEntries(new FormData(searchForm)));
        render(result);
        searchStatus.textContent = result.isError
          ? 'Check the search filters below.'
          : `${result.structuredContent.records.length} schools found.`;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[gi-bill-comparison] School search failed:', error);
        render({
          isError: true,
          content: [{ type: 'text', text: 'Unable to load schools. Select Find schools to try again.' }],
        });
        searchStatus.textContent = 'School search is unavailable.';
      } finally {
        submit.disabled = false;
      }
    };
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      search();
    });
    block.replaceChildren(searchForm, searchStatus);
    await search();
    return;
  }
  try {
    render(await bridge.toolResult);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[gi-bill-comparison] Initial school results failed:', error);
    render(null);
  }
  bridge.onToolResult?.(render);
  bridge.autoResize?.(block);
}

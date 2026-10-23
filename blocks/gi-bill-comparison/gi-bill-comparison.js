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

function validRecord(record) {
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

function validData(data) {
  return data?.illustrativeData === true && ['search', 'comparison'].includes(data.mode)
    && typeof data.disclaimer === 'string' && data.disclaimer.length > 0
    && Array.isArray(data.records) && data.records.length <= 6
    && data.records.every(validRecord)
    && new Set(data.records.map((record) => record.id)).size === data.records.length
    && (data.mode !== 'comparison' || (data.records.length >= 2 && data.records.length <= 3));
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
  const connected = bridge?.isConnected && bridge.hostContext?.preview !== true;
  const canCompare = connected && typeof bridge.callTool === 'function';
  const unsupportedComparison = 'Ask your assistant to compare these schools. This host does not support the comparison button.';

  function handoff(ids) {
    if (!destination) return el('p', 'The education handoff link is not configured.', 'configuration-notice');
    const link = el('a', 'Explore GI Bill benefits', 'education-link');
    const url = new URL(destination);
    url.searchParams.set('source', 'llm-app');
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
      block.append(buildTable(data.records), handoff(data.records.map((record) => record.id)));
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
            const nextLink = handoff([...selected]);
            continueLink.replaceWith(nextLink);
            continueLink = nextLink;
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
            const comparison = await bridge.callTool('compare_schools', { schoolIds: [...selected] });
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
        block.append(cards, status, compare, continueLink);
      }
    }
    block.append(sources, el('p', data.disclaimer, 'data-note'));
  }

  if (!connected) {
    block.replaceChildren(el('p', 'This widget needs a connected LLM host to display school results. Use the local GI Bill app preview to explore schools.'));
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

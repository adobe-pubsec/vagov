import decorate from '../../blocks/gi-bill-comparison/gi-bill-comparison.js';

const block = document.querySelector('.gi-bill-comparison');
const form = document.querySelector('#search');
const status = document.querySelector('#search-status');
let onResult;

async function callTool(name, args) {
  const routes = { find_schools: 'find-schools', compare_schools: 'compare-schools' };
  if (!routes[name]) throw new Error('Unknown school finder action.');
  const url = new URL(`/api/${routes[name]}`, window.location.origin);
  url.searchParams.set('args', JSON.stringify(args));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`School finder action failed (${response.status}).`);
  return response.json();
}

const bridge = {
  isConnected: true,
  callTool,
  onToolResult(callback) { onResult = callback; },
};

async function search() {
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Searching schools...';
  try {
    const result = await callTool('find_schools', Object.fromEntries(new FormData(form)));
    if (onResult) onResult(result);
    else {
      bridge.toolResult = Promise.resolve(result);
      await decorate(block, bridge);
    }
    status.textContent = result.isError ? 'Check the search filters below.' : `${result.structuredContent.records.length} schools found.`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[gi-bill-preview] Search failed:', error);
    status.textContent = 'Search failed. Check that the local preview server is running, then try again.';
  } finally {
    button.disabled = false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  search();
});
search();

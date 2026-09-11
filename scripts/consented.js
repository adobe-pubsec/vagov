// Runs only after the user consents (loaded by consent-check.js).
// Loads Adobe Launch from the `launch` placeholder, then starts the custom
// event bridge that fires page-view and relays block interactions to Launch.
import { initializeCustomEvents } from './custom-events.js';

async function getLaunchUrl() {
  try {
    const res = await fetch('/placeholders.json', { credentials: 'same-origin' });
    if (!res.ok) return '';
    const json = await res.json();
    const row = (json?.data || []).find((r) => r?.Key === 'launch');
    return (row?.Text || '').trim();
  } catch (error) {
    return '';
  }
}

async function loadLaunch() {
  const src = await getLaunchUrl();
  if (!src) return;
  if (document.querySelector(`head > script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = () => {
    // eslint-disable-next-line no-underscore-dangle
    window._launchReady = true;
    document.dispatchEvent(new CustomEvent('launchReady'));
  };
  document.head.appendChild(script);
}

(async () => {
  await loadLaunch();
  initializeCustomEvents();
})();

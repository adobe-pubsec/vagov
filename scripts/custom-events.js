// Custom events for Adobe Launch. Fires "page-view" once the data layer and
// Launch are ready; blocks call dispatchCustomEvent(name) for interactions.
// Events raised before Launch is ready are queued (sessionStorage) and replayed.

const LAUNCH_WAIT_TIMEOUT_MS = 10000;
const LAUNCH_POLL_INTERVAL_MS = 50;
const QUEUE_STORAGE_KEY = 'va_launch_event_queue';
const QUEUE_TTL_MS = 30 * 60 * 1000;
const QUEUE_MAX_EVENTS = 100;

let pageViewHandled = false;

function isLaunchReady() {
  // eslint-disable-next-line no-underscore-dangle
  return Boolean((typeof window._satellite !== 'undefined' && window._satellite) || window._launchReady === true);
}

function getDataLayerSnapshot() {
  try {
    return typeof window.dataLayer !== 'undefined' ? JSON.parse(JSON.stringify(window.dataLayer)) : null;
  } catch (error) {
    return null;
  }
}

function emitEvent(name, dataLayer, meta = {}) {
  document.dispatchEvent(new CustomEvent(name, {
    bubbles: true,
    detail: { dataLayer, ...meta },
  }));
}

function readQueue() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((item) => item?.name && item.timestamp
      && now - Number(item.timestamp) <= QUEUE_TTL_MS);
  } catch (error) {
    return [];
  }
}

function writeQueue(queue) {
  try {
    sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    // ignore storage errors
  }
}

function enqueueEvent(name, dataLayer) {
  const queue = readQueue();
  queue.push({
    name, dataLayer, timestamp: Date.now(), path: `${window.location.pathname}${window.location.search}`,
  });
  writeQueue(queue.slice(-QUEUE_MAX_EVENTS));
}

export function flushQueuedEvents() {
  if (!isLaunchReady()) return 0;
  const queue = readQueue();
  if (!queue.length) return 0;
  writeQueue([]);
  queue.forEach((item) => emitEvent(item.name, item.dataLayer ?? null, { replayed: true, originalPath: item.path || '' }));
  return queue.length;
}

export function dispatchCustomEvent(eventName, options = {}) {
  const name = eventName && String(eventName).trim();
  if (!name) return false;
  const dataLayer = Object.prototype.hasOwnProperty.call(options, 'dataLayerSnapshot')
    ? options.dataLayerSnapshot
    : getDataLayerSnapshot();
  if (!isLaunchReady()) {
    if (options.allowQueue !== false) enqueueEvent(name, dataLayer);
    return false;
  }
  flushQueuedEvents();
  emitEvent(name, dataLayer, { replayed: false });
  return true;
}

// Waits for the data layer (and, up to a timeout, Launch) before firing page-view.
function firePageViewWhenReady(startTime = Date.now()) {
  if (pageViewHandled) return;
  // eslint-disable-next-line no-underscore-dangle
  if (!window.dataLayer || !window._dataLayerReady || (window._dataLayerQueue?.length)) {
    setTimeout(() => firePageViewWhenReady(startTime), LAUNCH_POLL_INTERVAL_MS);
    return;
  }
  if (!isLaunchReady() && Date.now() - startTime < LAUNCH_WAIT_TIMEOUT_MS) {
    setTimeout(() => firePageViewWhenReady(startTime), LAUNCH_POLL_INTERVAL_MS);
    return;
  }
  pageViewHandled = true;
  dispatchCustomEvent('page-view');
}

export function initializeCustomEvents() {
  document.addEventListener('launchReady', flushQueuedEvents);
  flushQueuedEvents();
  firePageViewWhenReady();
}

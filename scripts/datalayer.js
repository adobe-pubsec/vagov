/* eslint-disable no-underscore-dangle */
// _dataLayer* globals below are the cross-file contract with custom-events.js.
// Minimal data layer: maintains window.dataLayer.page so the Web SDK can send
// webPageDetails.viewName (window.dataLayer.page.name) for Target named-view
// decisioning. Blocks can push additional context via window.updateDataLayer().

window._dataLayerQueue = window._dataLayerQueue || [];
window._dataLayerReady = false;

let dataLayer = null;

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge(target, source) {
  if (!isObject(target) || !isObject(source)) {
    return isObject(source) ? { ...source } : source;
  }
  const output = { ...target };
  Object.keys(source).forEach((key) => {
    output[key] = isObject(source[key]) && isObject(target[key])
      ? deepMerge(target[key], source[key])
      : source[key];
  });
  return output;
}

// Page name used as Target's viewName: last non-locale path segment, or "home".
function getPageName(pathname) {
  const normalized = (pathname || '').replace(/\/+$/, '');
  if (!normalized || normalized === '/') return 'home';
  const segments = normalized.split('/').filter(Boolean);
  const last = (segments[segments.length - 1] || '').toLowerCase();
  const isLocaleOnly = /^[a-z]{2}(?:-[a-z]{2})?$/.test(last);
  return isLocaleOnly ? 'home' : last;
}

function dispatchDataLayerEvent(type) {
  document.dispatchEvent(new CustomEvent('dataLayerUpdated', {
    bubbles: true,
    detail: { dataLayer: JSON.parse(JSON.stringify(dataLayer)), type },
  }));
}

function processQueue() {
  if (!window._dataLayerQueue.length) return;
  window._dataLayerQueue.forEach(({ updates, merge }) => {
    dataLayer = merge ? deepMerge(dataLayer, updates) : { ...dataLayer, ...updates };
  });
  window._dataLayerQueue = [];
  window.dataLayer = dataLayer;
  dispatchDataLayerEvent('updated');
}

window.updateDataLayer = function updateDataLayer(updates, merge = true) {
  if (!isObject(updates)) return;
  if (!window._dataLayerReady) {
    window._dataLayerQueue.push({ updates, merge });
    return;
  }
  dataLayer = merge ? deepMerge(dataLayer, updates) : { ...dataLayer, ...updates };
  window.dataLayer = dataLayer;
  dispatchDataLayerEvent('updated');
};

window.getDataLayerProperty = function getDataLayerProperty(path) {
  if (!dataLayer) return undefined;
  if (!path) return JSON.parse(JSON.stringify(dataLayer));
  return path.split('.').reduce((val, key) => (
    val && typeof val === 'object' && key in val ? val[key] : undefined
  ), dataLayer);
};

function buildDataLayer() {
  dataLayer = {
    page: {
      name: getPageName(window.location.pathname),
      title: document.title,
      url: window.location.href,
    },
  };
  window.dataLayer = dataLayer;
  window._dataLayerReady = true;
  processQueue();
  dispatchDataLayerEvent('initialized');
}

buildDataLayer();

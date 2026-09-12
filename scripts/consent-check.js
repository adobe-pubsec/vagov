// Consent gate for analytics/martech. Shows a bottom banner the first time,
// remembers the choice, and bridges it to the Web SDK via the `consent.update`
// event. Stands in for a real CMP (OneTrust, etc.) — swap this out later.
//
// Testing override: ?consent=accept | ?consent=decline (also remembered).

const STORAGE_KEY = 'va-consent';
let consentedLoaded = false;

function loadConsented() {
  if (consentedLoaded) return;
  consentedLoaded = true;
  import('./consented.js');
}

/** Notify listeners (Web SDK bridge) and load consented scripts if granted. */
function applyConsent(consented) {
  window.dispatchEvent(new CustomEvent('consent.update', { detail: { consented } }));
  if (consented) loadConsented();
}

function storeDecision(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch (e) {
    // ignore storage errors
  }
}

function getStoredDecision() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function showBanner() {
  const banner = document.createElement('div');
  banner.className = 'va-consent-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Privacy consent');
  banner.innerHTML = `
    <div class="va-consent-inner">
      <p class="va-consent-text">We use analytics to understand how visitors use VA.gov so we can improve it. Do you accept analytics cookies?</p>
      <div class="va-consent-actions">
        <button type="button" class="va-consent-accept" data-consent="accept">Accept</button>
        <button type="button" class="va-consent-decline" data-consent="decline">Decline</button>
      </div>
    </div>`;
  banner.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-consent]');
    if (!btn) return;
    const accepted = btn.dataset.consent === 'accept';
    storeDecision(accepted ? 'accept' : 'decline');
    applyConsent(accepted);
    banner.remove();
  });
  document.body.append(banner);
}

function init() {
  // Testing override — apply and remember, no banner.
  const param = new URLSearchParams(window.location.search).get('consent');
  if (param !== null) {
    const accepted = ['accept', 'true', '1', 'yes'].includes(param.toLowerCase());
    storeDecision(accepted ? 'accept' : 'decline');
    applyConsent(accepted);
    return;
  }

  const stored = getStoredDecision();
  if (stored) {
    applyConsent(stored === 'accept');
    return;
  }

  // No decision yet: leave the Web SDK pending (nothing collected) until the
  // visitor chooses.
  showBanner();
}

init();

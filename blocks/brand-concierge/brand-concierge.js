// Adobe Brand Concierge mount point + consent-gated client loader.
//
// Web SDK (scripts.js configure → `conversation`) already handles identity,
// context, and comms as the `webSdk` instance. This block provides the mount,
// loads the Brand Concierge client + its style config after consent, then
// bootstraps the chat UI against our Web SDK instance.
// Ref: https://experienceleague.adobe.com/en/docs/brand-concierge/content/documentation/developer-customization-guide

const CLIENT_SRC = 'https://experience.adobe.net/solutions/experience-platform-brand-concierge-web-agent/static-assets/main.js';
// The Brand Concierge config UI ships this file; it defines window.styleConfiguration
// (branding + welcome/prompt content). Drop the generated file in this folder.
const STYLE_CONFIG_SRC = '/blocks/brand-concierge/styleConfigurations.js';
// Must match the Web SDK instance configured in scripts.js (window.webSdk).
const INSTANCE_NAME = 'webSdk';
const MOUNT_ID = 'brand-concierge-mount';

let clientLoaded = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadClient() {
  if (clientLoaded) return;
  clientLoaded = true;
  try {
    // styleConfigurations.js defines window.styleConfiguration; load it + the client.
    await loadScript(`${window.hlx.codeBasePath}${STYLE_CONFIG_SRC}`);
    await loadScript(CLIENT_SRC);

    if (!window.styleConfiguration) {
      // eslint-disable-next-line no-console
      console.warn('[brand-concierge] window.styleConfiguration missing — add the generated styleConfigurations.js');
      return;
    }

    window.adobe?.concierge?.bootstrap({
      instanceName: INSTANCE_NAME,
      selector: `#${MOUNT_ID}`,
      stylingConfigurations: window.styleConfiguration,
      stickySession: false,
      // Forward a few interactions into our analytics (keep this lightweight).
      onEvent: (event) => {
        if (!window.trackInteraction) return;
        if (['query:submitted', 'card:clicked', 'feedback:submitted'].includes(event.eventType)) {
          window.trackInteraction(`brand-concierge:${event.eventType}`);
        }
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[brand-concierge] failed to load client:', e);
  }
}

export default function decorate(block) {
  block.textContent = '';
  const mount = document.createElement('div');
  mount.id = MOUNT_ID;
  mount.className = 'brand-concierge-mount';
  block.append(mount);

  // Load only after consent (matches the rest of our martech). consent-check.js
  // dispatches consent.update after blocks decorate, so the listener catches it.
  window.addEventListener('consent.update', ({ detail }) => {
    if (detail?.consented) loadClient();
  });
}

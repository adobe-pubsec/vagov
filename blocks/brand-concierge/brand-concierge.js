// Adobe Brand Concierge mount point + consent-gated client loader.
//
// Web SDK (scripts.js configure → `conversation`) already handles identity,
// context, and comms. This block provides the mount element and loads the
// Brand Concierge *client* (chat UI) after the visitor consents, then bootstraps
// it against our Web SDK instance.
// Ref: https://experienceleague.adobe.com/en/docs/brand-concierge/content/documentation/developer-customization-guide

const CLIENT_SRC = 'https://experience.adobe.net/solutions/experience-platform-brand-concierge-web-agent/static-assets/main.js';
// Must match the Web SDK instance configured in scripts.js (window.webSdk).
const INSTANCE_NAME = 'webSdk';
const MOUNT_ID = 'brand-concierge-mount';

// Web Client styling/branding (see the dev guide for the full schema:
// metadata, behavior, disclaimer, text, arrays, assets, theme).
const stylingConfigurations = {
  metadata: {
    brandName: 'VA.gov',
    language: 'en-US',
    namespace: 'brand-concierge',
  },
};

let clientLoaded = false;

function bootstrap() {
  window.adobe?.concierge?.bootstrap({
    instanceName: INSTANCE_NAME,
    selector: `#${MOUNT_ID}`,
    stylingConfigurations,
    // Forward a few interactions into our analytics (keep this lightweight).
    onEvent: (event) => {
      if (!window.trackInteraction) return;
      if (['query:submitted', 'card:clicked', 'feedback:submitted'].includes(event.eventType)) {
        window.trackInteraction(`brand-concierge:${event.eventType}`);
      }
    },
  });
}

function loadClient() {
  if (clientLoaded) return;
  clientLoaded = true;
  const script = document.createElement('script');
  script.src = CLIENT_SRC;
  script.async = true;
  script.onload = bootstrap;
  document.head.appendChild(script);
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

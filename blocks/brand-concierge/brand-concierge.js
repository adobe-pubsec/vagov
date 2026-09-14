// Adobe Brand Concierge mount + consent-gated client loader.
//
// Web SDK (scripts.js configure → `conversation`) handles identity/context/comms
// as the `webSdk` instance. This block provides the mount, loads the client +
// its style config after consent, and bootstraps the chat UI.
//
// UX: the welcome view renders inline on the page; once a chat starts (the
// client's container gains `.active-state`) it opens as a modal. Closing the
// modal minimizes to a launcher button that reopens it.
// Ref: https://experienceleague.adobe.com/en/docs/brand-concierge/content/documentation/developer-customization-guide

const CLIENT_SRC = 'https://experience.adobe.net/solutions/experience-platform-brand-concierge-web-agent/static-assets/main.js';
// The Brand Concierge config UI ships this file; it defines window.styleConfiguration.
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

// Flip the block to modal once the client's chat becomes active.
function watchForActiveChat(mount, onActive) {
  const isActive = () => !!mount.querySelector('.brand-concierge-container.active-state');
  if (isActive()) { onActive(); return; }
  const observer = new MutationObserver(() => {
    if (isActive()) {
      observer.disconnect();
      onActive();
    }
  });
  observer.observe(mount, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['class'],
  });
}

async function loadClient(block, mount) {
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
      onEvent: (event) => {
        if (!window.trackInteraction) return;
        if (['query:submitted', 'card:clicked', 'feedback:submitted'].includes(event.eventType)) {
          window.trackInteraction(`brand-concierge:${event.eventType}`);
        }
      },
    });

    watchForActiveChat(mount, () => block.classList.add('bc-active'));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[brand-concierge] failed to load client:', e);
  }
}

export default function decorate(block) {
  block.textContent = '';

  // Modal overlay: backdrop (.bc-panel) → white dialog (.bc-dialog) → close + mount.
  const panel = document.createElement('div');
  panel.className = 'bc-panel';
  const dialog = document.createElement('div');
  dialog.className = 'bc-dialog';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'bc-close';
  close.setAttribute('aria-label', 'Close chat');
  close.textContent = '×'; // ×

  const mount = document.createElement('div');
  mount.id = MOUNT_ID;
  mount.className = 'brand-concierge-mount';

  dialog.append(close, mount);
  panel.append(dialog);

  // Inline "continue" button that sits where the welcome form was, shown once a
  // chat has started. Reopens the modal (the chat DOM stays mounted, so the
  // conversation is preserved).
  const reopen = document.createElement('button');
  reopen.type = 'button';
  reopen.className = 'bc-reopen';
  reopen.textContent = 'Continue chat';

  block.append(panel, reopen);

  close.addEventListener('click', () => block.classList.add('bc-minimized'));
  reopen.addEventListener('click', () => block.classList.remove('bc-minimized'));

  // Load only after consent (matches the rest of our martech).
  window.addEventListener('consent.update', ({ detail }) => {
    if (detail?.consented) loadClient(block, mount);
  });
}

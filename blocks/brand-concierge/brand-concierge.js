// Adobe Brand Concierge mount point + consent-gated client loader.
//
// Web SDK (scripts.js configure → `conversation`) already handles identity,
// context, and comms. This block provides the mount element and loads the
// Brand Concierge *client* (the chat UI) after the visitor consents.
//
// Brand Concierge is beta and the client is provisioned per-customer, so set
// the two values below from your Brand Concierge setup (Tags "Brand Concierge"
// extension / your Adobe contact). Until CLIENT_SRC is set, the block just
// renders the (empty) mount.
const CLIENT_SRC = ''; // e.g. 'https://.../brand-concierge-client.js'
const CLIENT_GLOBAL = ''; // window global the client exposes, e.g. 'AdobeBrandConcierge'

let clientLoaded = false;

function loadClient(mount) {
  if (clientLoaded || !CLIENT_SRC) return;
  clientLoaded = true;
  const script = document.createElement('script');
  script.src = CLIENT_SRC;
  script.async = true;
  script.onload = () => {
    // Many builds self-mount a launcher on load; if the client exposes an
    // init/render, point it at our mount.
    const client = CLIENT_GLOBAL ? window[CLIENT_GLOBAL] : null;
    if (client && typeof client.init === 'function') client.init({ mount });
    else if (client && typeof client.render === 'function') client.render(mount);
  };
  document.head.appendChild(script);
}

export default function decorate(block) {
  block.textContent = '';
  const mount = document.createElement('div');
  mount.className = 'brand-concierge-mount';
  block.append(mount);

  // Load only after consent (matches the rest of our martech). consent-check.js
  // dispatches consent.update after blocks decorate, so the listener catches it.
  window.addEventListener('consent.update', ({ detail }) => {
    if (detail?.consented) loadClient(mount);
  });
}

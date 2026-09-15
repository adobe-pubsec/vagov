// Mock authentication for the VA.gov demo.
//
// There is no real IdP: login.gov / ID.me / CLEAR all require an agency-
// sponsored OIDC client with no self-serve sandbox, so this fakes the flow while
// producing a real authenticated identity the martech stack can use. On sign-in
// it stores a session (localStorage) and dispatches an `auth.update` event;
// scripts.js bridges that to the Web SDK (identityMap) and data layer so AEP /
// Target / Brand Concierge personalize for a known, signed-in profile.
//
// Flow (mirrors VA.gov's real UX without leaving our domain):
//   1. Click "Sign in"                 → VA-branded chooser MODAL (openSignInModal)
//   2. Pick a provider                 → navigate to /sign-in/?provider=idme&return=…
//                                        (the "redirect" to the IdP)
//   3. Provider login page             → provider-branded credential screen
//   4. Submit                          → store session → redirect back to `return`
// The /sign-in/ page hosts steps 3 (and 2 as an inline fallback) via the sign-in
// block calling renderSignInFlow(); decorateAuthControls() wires the header.

import { loadCSS } from './aem.js';

const SESSION_KEY = 'va-auth';
const SIGN_IN_PATH = '/sign-in/';
// Authored fragment supplying the chooser modal's content (VA logo, heading,
// provider buttons, help links). Falls back to buildChooser() if not authored.
const CHOOSER_FRAGMENT_PATH = '/sign-in/modal';
const VA_LOGO_SRC = '/media_193e6cf6943079e43f2147ab9c40182603bc50e07.png';
const VA_LOGO_ALT = 'U.S. Department of Veterans Affairs';
const SUPPORT_PHONE = '866-279-3677';

// Authored sheet of demo users, standing in for the IdP's user store. Each row
// carries the "claims" an IdP would return — crucially demoSystemUserId, the
// stable ID that already exists on the user's AEP profile, so signing in stitches
// this browser onto that profile instead of creating a new identity.
const USERS_SHEET_PATH = '/sign-in/users.json';

// VA.gov's real sign-in partners today. (Medicare added CLEAR in Mar 2026; VA
// has not, so it is intentionally omitted.)
const PROVIDERS = {
  idme: {
    label: 'ID.me', className: 'idme', button: 'Continue', create: 'Create a wallet', remember: true, password: false,
  },
  logingov: {
    label: 'Login.gov', className: 'logingov', button: 'Sign in', create: 'Create an account', remember: false, password: true,
  },
};

/** @returns {object|null} the signed-in user, or null. */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function dispatchAuth(user) {
  window.dispatchEvent(new CustomEvent('auth.update', { detail: { user } }));
}

// Fetch + cache the demo user sheet, then look a row up by email (the login
// handle). Returns null if the sheet is unavailable or the email isn't found.
let usersPromise;
// The users sheet is a multi-sheet workbook (default `data` tab + one per user).
// A single-sheet fetch returns rows under `.data`; a multi-sheet fetch nests the
// default tab under `.data.data`. Handle both.
function extractDefaultRows(json) {
  if (Array.isArray(json.data)) return json.data;
  if (json.data && Array.isArray(json.data.data)) return json.data.data;
  return [];
}
function loadDefaultUsers() {
  if (!usersPromise) {
    usersPromise = fetch(USERS_SHEET_PATH)
      .then((r) => (r.ok ? r.json() : {}))
      .then(extractDefaultRows)
      .catch(() => []);
  }
  return usersPromise;
}

async function findUserByEmail(email) {
  const rows = await loadDefaultUsers();
  const target = (email || '').trim().toLowerCase();
  return rows.find((u) => (u.email || '').trim().toLowerCase() === target) || null;
}

/** Look a user up by id (sub-…), returning their full default-sheet record. */
export async function findUserById(id) {
  const rows = await loadDefaultUsers();
  return rows.find((u) => (u.id || '') === id) || null;
}

/**
 * Establish a mock session from a user-sheet record + chosen provider, and
 * announce it. The session carries demoSystemUserId (the AEP stitch key).
 */
function signInAs(record, providerKey) {
  const provider = PROVIDERS[providerKey] ? providerKey : 'idme';
  const user = {
    id: record.id,
    email: record.email,
    firstName: record.firstName,
    name: [record.firstName, record.lastName].filter(Boolean).join(' ') || record.email,
    demoSystemUserId: record.demoSystemUserId,
    provider,
    providerLabel: PROVIDERS[provider].label,
    since: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  dispatchAuth(user);
  return user;
}

/** Clear the session and announce sign-out. */
export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  dispatchAuth(null);
}

/**
 * Demo/test aid: `?user=<id|email>` (or `?as=`) signs in as that sheet user
 * without the login flow, so auth-only UI can be tested directly. Returns the
 * user (or null if no param / no match) and does nothing when the param is
 * absent, so there's no cost on normal loads. Persists like a real sign-in —
 * clear it with Sign out.
 */
export async function establishTestUserFromParam() {
  const params = new URLSearchParams(window.location.search);
  const key = (params.get('user') || params.get('as') || '').trim().toLowerCase();
  if (!key) return null;
  const rows = await loadDefaultUsers();
  const rec = rows.find((u) => (u.id || '').toLowerCase() === key
    || (u.email || '').trim().toLowerCase() === key);
  return rec ? signInAs(rec, 'idme') : null;
}

// ---- small DOM helpers -----------------------------------------------------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// The real VA signature, cloned from the header if present, else loaded direct.
function vaLogoImg() {
  const headerLogo = document.querySelector('.va-logo img');
  if (headerLogo) {
    const clone = headerLogo.cloneNode(true);
    clone.removeAttribute('loading');
    return clone;
  }
  const img = el('img');
  img.src = VA_LOGO_SRC;
  img.alt = VA_LOGO_ALT;
  return img;
}

// ID.me wordmark: "ID" + ".me". Colours come from CSS (white on the button,
// brand colours on the login page).
function idmeMark() {
  const mark = el('span', 'sign-in-mark-idme');
  mark.append(el('span', 'sign-in-mark-id', 'ID'), el('span', 'sign-in-mark-me', '.me'));
  return mark;
}

// Login.gov wordmark: shield glyph + "LOGIN.GOV".
function loginGovMark() {
  const mark = el('span', 'sign-in-mark-logingov');
  const shield = el('img', 'sign-in-mark-shield');
  shield.src = `${window.hlx?.codeBasePath || ''}/icons/shield.svg`;
  shield.alt = '';
  shield.setAttribute('aria-hidden', 'true');
  mark.append(shield, el('span', 'sign-in-mark-word', 'LOGIN.GOV'));
  return mark;
}

function providerMark(key) {
  return key === 'logingov' ? loginGovMark() : idmeMark();
}

// A same-origin, non-sign-in path is a safe redirect target.
function safeReturn(value) {
  return value && value.startsWith('/') && !/^\/sign-in\/?/.test(value) ? value : null;
}

// Where to send the visitor after signing in: ?return=… then referrer then home.
function getReturn() {
  const fromParam = safeReturn(new URLSearchParams(window.location.search).get('return'));
  if (fromParam) return fromParam;
  try {
    const ref = new URL(document.referrer);
    if (ref.origin === window.location.origin) {
      const r = safeReturn(ref.pathname);
      if (r) return r;
    }
  } catch (e) { /* no usable referrer */ }
  return '/';
}

function signInUrl(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `${SIGN_IN_PATH}?${q}` : SIGN_IN_PATH;
}

// ---- step 1/2: provider chooser (shared by the modal and the page) ---------
function buildChooser(ret) {
  const wrap = el('div', 'sign-in-chooser');

  const logo = el('div', 'sign-in-chooser-logo');
  logo.append(vaLogoImg());

  const heading = el('h1', 'sign-in-chooser-heading', 'Sign in or create an account');

  const providers = el('div', 'sign-in-providers');
  Object.keys(PROVIDERS).forEach((key) => {
    const btn = el('button', `sign-in-provider sign-in-provider-${PROVIDERS[key].className}`);
    btn.type = 'button';
    btn.append(providerMark(key));
    // Navigate to the provider login screen (the "redirect" to the IdP).
    btn.addEventListener('click', () => {
      window.location.href = signInUrl({ provider: key, ...(ret ? { return: ret } : {}) });
    });
    providers.append(btn);
  });

  const learn = el('a', 'sign-in-learn', 'Learn about creating an ID.me or Login.gov account');
  learn.href = '#';

  const helpHeading = el('h2', 'sign-in-help-heading', 'Help and support');
  const helpLinks = el('ul', 'sign-in-help-links');
  ['Sign-in errors', 'Verifying your identity', 'Deleting your account', 'Common issues with ID.me or Login.gov'].forEach((t) => {
    const li = el('li');
    const a = el('a', null, t);
    a.href = '#';
    li.append(a);
    helpLinks.append(li);
  });
  const phone = el('p', 'sign-in-help-phone');
  const phoneLink = el('a', null, SUPPORT_PHONE);
  phoneLink.href = `tel:${SUPPORT_PHONE.replace(/-/g, '')}`;
  phone.append('Call our VA.gov technical support line for help at ', phoneLink, '.');

  wrap.append(logo, heading, providers, learn, helpHeading, helpLinks, phone);
  return wrap;
}

// Turn authored provider links (href …?provider=idme / …?provider=logingov)
// inside a loaded fragment into branded, return-carrying provider buttons. The
// author supplies which providers, their order, and the href; the code supplies
// the exact brand treatment (wordmark) and wires the return target.
function enhanceProviderLinks(root, ret) {
  Object.keys(PROVIDERS).forEach((key) => {
    root.querySelectorAll(`a[href*="provider=${key}"]`).forEach((a) => {
      // drop any global button decoration so our provider styling wins
      a.classList.remove('button', 'primary', 'secondary', 'accent');
      a.classList.add('sign-in-provider', `sign-in-provider-${PROVIDERS[key].className}`);
      a.textContent = '';
      a.append(providerMark(key));
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = signInUrl({ provider: key, ...(ret ? { return: ret } : {}) });
      });
    });
  });
}

// Chooser content, preferring the authored fragment, else the built-in chooser.
async function loadChooserContent(ret) {
  try {
    // eslint-disable-next-line import/no-cycle
    const { loadFragment } = await import('../blocks/fragment/fragment.js');
    const frag = await loadFragment(CHOOSER_FRAGMENT_PATH);
    if (frag) {
      enhanceProviderLinks(frag, ret);
      const host = el('div', 'sign-in-chooser sign-in-chooser-authored');
      host.append(...frag.childNodes);
      return host;
    }
  } catch (e) { /* fall back to the built-in chooser */ }
  return buildChooser(ret);
}

/** Open the provider chooser as a modal over the current page (step 1). */
export function openSignInModal(ret) {
  // The modal opens from the header on any page, but the styles live with the
  // sign-in block (only auto-loaded where that block is authored) — load them.
  loadCSS(`${window.hlx.codeBasePath}/blocks/sign-in/sign-in.css`);

  const overlay = el('div', 'sign-in-modal');
  const dialog = el('div', 'sign-in-modal-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Sign in or create an account');

  const close = el('button', 'sign-in-modal-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';

  const controller = new AbortController();
  const remove = () => {
    overlay.remove();
    controller.abort(); // detaches the keydown listener below
  };

  const bodyHost = el('div', 'sign-in-modal-body');
  dialog.append(close, bodyHost);
  overlay.append(dialog);
  close.addEventListener('click', remove);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') remove();
  }, { signal: controller.signal });
  document.body.append(overlay);
  close.focus();

  loadChooserContent(ret).then((content) => bodyHost.append(content));
}

// ---- step 3: provider login page -------------------------------------------
function buildProviderLogin(providerKey, ret) {
  const meta = PROVIDERS[providerKey];
  const idp = el('div', `sign-in-idp sign-in-idp-${meta.className}`);

  // co-brand bar: provider mark + VA signature
  const top = el('div', 'sign-in-idp-top');
  const cobrand = el('div', 'sign-in-idp-cobrand');
  const pmark = providerMark(providerKey);
  pmark.classList.add('sign-in-idp-providermark');
  cobrand.append(pmark, el('span', 'sign-in-idp-plus', '+'), vaLogoImg());
  top.append(cobrand);

  const body = el('div', 'sign-in-idp-body');
  const card = el('div', 'sign-in-idp-card');
  card.append(el('h1', 'sign-in-idp-heading', `Sign in to ${meta.label}`));

  const form = el('form', 'sign-in-idp-form');
  const emailField = el('label', 'sign-in-idp-field');
  emailField.append(el('span', null, 'Email'));
  const email = el('input');
  email.type = 'email';
  email.name = 'email';
  email.placeholder = 'Enter email address';
  email.autocomplete = 'username';
  email.required = true;
  emailField.append(email);
  form.append(emailField);

  if (meta.password) {
    const pwField = el('label', 'sign-in-idp-field');
    pwField.append(el('span', null, 'Password'));
    const pw = el('input');
    pw.type = 'password';
    pw.name = 'password';
    pw.autocomplete = 'current-password';
    pw.required = true;
    pwField.append(pw);
    form.append(pwField);
  }

  if (meta.remember) {
    const remember = el('label', 'sign-in-idp-remember');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.name = 'remember';
    remember.append(cb, el('span', null, 'Remember me'));
    form.append(remember);
  }

  const error = el('p', 'sign-in-idp-error');
  error.hidden = true;
  form.append(error);

  const submit = el('button', 'sign-in-idp-submit', meta.button);
  submit.type = 'submit';
  form.append(submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    const record = await findUserByEmail(email.value);
    if (!record) {
      error.textContent = 'We couldn’t find an account with that email. Try a demo user from the sign-in sheet.';
      error.hidden = false;
      submit.disabled = false;
      return;
    }
    signInAs(record, providerKey);
    window.location.href = ret || '/';
  });

  const alt = el('p', 'sign-in-idp-alt');
  const createLink = el('a', null, meta.create);
  createLink.href = '#';
  alt.append(`New to ${meta.label}? `, createLink);

  const cancel = el('button', 'sign-in-idp-cancel', 'Cancel and return to VA.gov');
  cancel.type = 'button';
  cancel.addEventListener('click', () => {
    window.location.href = signInUrl(ret ? { return: ret } : {});
  });

  card.append(form, alt, cancel);
  body.append(card);

  const footer = el('div', 'sign-in-idp-footer');
  footer.append(el('p', 'sign-in-idp-lang', 'English'));
  const legal = el('p', 'sign-in-idp-legal');
  [`What is ${meta.label}?`, 'Terms of Service', 'Privacy Policy'].forEach((t, i) => {
    if (i) legal.append(el('span', 'sign-in-idp-sep', '|'));
    const a = el('a', null, t);
    a.href = '#';
    legal.append(a);
  });
  footer.append(legal);

  idp.append(top, body, footer);
  return idp;
}

/**
 * Renders the sign-in flow into `container` (the sign-in block): the provider
 * login page when `?provider=` is present, else the chooser inline (a direct
 * /sign-in/ visit — the header normally shows the chooser as a modal instead).
 * @param {Element} container
 */
export function renderSignInFlow(container) {
  container.textContent = '';
  const provider = new URLSearchParams(window.location.search).get('provider');
  const ret = getReturn();
  if (provider && PROVIDERS[provider]) {
    container.append(buildProviderLogin(provider, ret));
  } else {
    const page = el('div', 'sign-in-page');
    container.append(page);
    loadChooserContent(ret).then((content) => page.append(content));
  }
}

// ---- header account control ------------------------------------------------
function buildAccount(user) {
  const account = el('div', 'va-account');

  const toggle = el('button', 'va-account-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  const avatar = el('span', 'va-account-avatar', (user.firstName || user.name || '?').charAt(0).toUpperCase());
  avatar.setAttribute('aria-hidden', 'true');
  toggle.append(avatar, el('span', 'va-account-firstname', user.firstName || user.name));

  const menu = el('div', 'va-account-menu');
  menu.hidden = true;
  menu.append(
    el('p', 'va-account-name', user.name),
    el('p', 'va-account-email', user.email),
    el('p', 'va-account-via', `Signed in with ${user.providerLabel}`),
  );
  const out = el('button', 'va-account-signout', 'Sign out');
  out.type = 'button';
  out.addEventListener('click', signOut);
  menu.append(out);

  toggle.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!account.contains(e.target)) {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  account.append(toggle, menu);
  return account;
}

/**
 * Wires the header's authored "Sign in" link: opens the chooser modal when
 * signed out, and swaps it for an account control when signed in. Re-renders on
 * auth changes. Call with the `.va-tools` element.
 * @param {Element} tools
 */
export function decorateAuthControls(tools) {
  const signInLink = [...tools.querySelectorAll('a.va-tool-link')].find((a) => (
    /\/sign-in\/?$/.test(a.getAttribute('href') || '') || /sign\s*in/i.test(a.textContent)
  ));
  if (!signInLink) return;

  const anchor = document.createComment('auth-control');
  signInLink.replaceWith(anchor);
  let current = null;

  const render = () => {
    const user = getUser();
    let next;
    if (user) {
      next = buildAccount(user);
    } else {
      next = signInLink.cloneNode(true);
      next.addEventListener('click', (e) => {
        e.preventDefault();
        const ret = window.location.pathname + window.location.search + window.location.hash;
        openSignInModal(safeReturn(ret) ? ret : '');
      });
    }
    if (current) current.replaceWith(next);
    else anchor.replaceWith(next);
    current = next;
  };

  render();
  window.addEventListener('auth.update', render);
}

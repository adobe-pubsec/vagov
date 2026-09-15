// VA.gov header: utility bar + brand/search bar + click-triggered two-level megamenu.
// Content-first: all labels/links/images come from nav.plain.html.
// This module reads that DOM and builds the interactive header generically.

import { decorateAuthControls } from '../../scripts/auth.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

/** Fetch the nav fragment. */
async function fetchNav() {
  const resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const tpl = document.createElement('div');
  tpl.innerHTML = html;
  return tpl;
}

/** Close every open top-level menu. */
function closeAllMenus(nav) {
  nav.querySelectorAll('.va-nav-item.open').forEach((li) => {
    li.classList.remove('open');
    const btn = li.querySelector(':scope > button');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    li.querySelectorAll('.va-cat.open').forEach((c) => {
      c.classList.remove('open');
      const cb = c.querySelector(':scope > button');
      if (cb) cb.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Build a second-level category (button + grouped-links panel), used inside
 * a two-level top menu. `catLi` is the source <li> containing a <p>/<a> label
 * and a nested <ul> of groups.
 */
function buildCategory(catLi) {
  const li = document.createElement('li');
  li.className = 'va-cat';

  const labelEl = catLi.querySelector(':scope > p, :scope > a');
  const groupsUl = catLi.querySelector(':scope > ul');

  // A category with no nested groups is just a direct link.
  if (!groupsUl) {
    const a = catLi.querySelector(':scope > a');
    if (a) {
      li.classList.add('va-cat-link');
      li.append(a.cloneNode(true));
    }
    return li;
  }

  const catName = (labelEl?.textContent || '').trim();
  const catHref = labelEl?.tagName === 'A'
    ? labelEl.getAttribute('href')
    : (catLi.querySelector(':scope > p > a')?.getAttribute('href') || null);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'va-cat-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = catName;
  li.append(btn);

  const panel = document.createElement('div');
  panel.className = 'va-cat-panel';

  if (catHref) {
    const viewAll = document.createElement('a');
    viewAll.className = 'va-view-all';
    viewAll.href = catHref;
    viewAll.textContent = `View all in ${catName.toLowerCase()}`;
    panel.append(viewAll);
  }

  const groups = document.createElement('div');
  groups.className = 'va-groups';
  [...groupsUl.children].forEach((groupLi) => {
    const heading = groupLi.querySelector(':scope > p')?.textContent.trim();
    const linksUl = groupLi.querySelector(':scope > ul');
    if (!heading || !linksUl) return;
    const group = document.createElement('div');
    group.className = 'va-group';
    const h = document.createElement('h3');
    h.textContent = heading;
    group.append(h);
    group.append(linksUl.cloneNode(true));
    groups.append(group);
  });
  panel.append(groups);
  li.append(panel);

  btn.addEventListener('click', () => {
    const open = li.classList.contains('open');
    li.closest('.va-megapanel')?.querySelectorAll('.va-cat.open').forEach((c) => {
      c.classList.remove('open');
      c.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      li.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  return li;
}

/**
 * Build a top-level nav item. A plain <li><a> becomes a link; a
 * <li><p>label</p><ul>…</ul> becomes a click-triggered megamenu.
 */
function buildTopItem(srcLi, nav) {
  const li = document.createElement('li');
  li.className = 'va-nav-item';

  const label = srcLi.querySelector(':scope > p');
  const submenu = srcLi.querySelector(':scope > ul');
  const directLink = srcLi.querySelector(':scope > a, :scope > p > a');

  // No submenu → plain link, no toggle button and no dropdown arrow.
  if (directLink && !submenu) {
    li.classList.add('va-nav-link');
    li.append(directLink.cloneNode(true));
    return li;
  }

  const name = (label?.textContent || directLink?.textContent || '').trim();
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'va-nav-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = name;
  li.append(btn);

  const panel = document.createElement('div');
  panel.className = 'va-megapanel';
  const catList = document.createElement('ul');
  catList.className = 'va-cat-list';

  // Detect two-level (categories contain their own <ul> of groups) vs
  // single-level (each child is a group with heading + links).
  const children = submenu ? [...submenu.children] : [];
  const isTwoLevel = children.some((c) => {
    const inner = c.querySelector(':scope > ul');
    return inner && inner.querySelector(':scope > li > ul');
  });

  if (isTwoLevel) {
    children.forEach((catLi) => catList.append(buildCategory(catLi)));
    panel.classList.add('va-megapanel-two-level');
    panel.append(catList);
  } else {
    panel.classList.add('va-megapanel-single');
    const groups = document.createElement('div');
    groups.className = 'va-groups';
    children.forEach((groupLi) => {
      const heading = groupLi.querySelector(':scope > p')?.textContent.trim();
      const linksUl = groupLi.querySelector(':scope > ul');
      if (!heading || !linksUl) return;
      const group = document.createElement('div');
      group.className = 'va-group';
      const h = document.createElement('h3');
      h.textContent = heading;
      group.append(h);
      group.append(linksUl.cloneNode(true));
      groups.append(group);
    });
    panel.append(groups);
  }

  li.append(panel);

  btn.addEventListener('click', () => {
    const open = li.classList.contains('open');
    closeAllMenus(nav);
    if (!open) {
      li.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      const firstCat = panel.querySelector('.va-cat .va-cat-toggle');
      if (firstCat && !panel.querySelector('.va-cat.open')) firstCat.click();
    }
  });

  return li;
}

export default async function decorate(block) {
  const frag = await fetchNav();
  block.textContent = '';
  if (!frag) return;

  const sections = [...frag.children].filter((c) => c.tagName === 'DIV');
  const [brandSection, utilitySection, navSection] = sections;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');

  // --- Utility / gov banner bar (top) ---
  if (utilitySection) {
    const bar = document.createElement('div');
    bar.className = 'va-utility-bar';
    const inner = document.createElement('div');
    inner.className = 'va-utility-inner';
    const paras = utilitySection.querySelectorAll(':scope > p');
    if (paras[0]) {
      const notice = document.createElement('div');
      notice.className = 'va-gov-notice';
      notice.append(...paras[0].cloneNode(true).childNodes);
      inner.append(notice);
    }
    if (paras[1]) {
      const a = paras[1].querySelector('a');
      const c = document.createElement('a');
      c.className = 'va-crisis-line';
      c.href = a ? a.getAttribute('href') : '#';

      const crisisIcon = document.createElement('img');
      crisisIcon.className = 'va-crisis-icon';
      crisisIcon.src = '/icons/crisis-icon.svg';
      crisisIcon.alt = '';
      crisisIcon.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'va-crisis-text';
      const label = paras[1].textContent.trim();
      const phrase = 'Veterans Crisis Line';
      const idx = label.indexOf(phrase);
      if (idx !== -1) {
        const strong = document.createElement('strong');
        strong.textContent = phrase;
        text.append(label.slice(0, idx), strong, label.slice(idx + phrase.length));
      } else {
        text.textContent = label;
      }

      const arrowIcon = document.createElement('img');
      arrowIcon.className = 'va-crisis-arrow';
      arrowIcon.src = '/icons/arrow.svg';
      arrowIcon.alt = '';
      arrowIcon.setAttribute('aria-hidden', 'true');

      c.append(crisisIcon, text, arrowIcon);
      inner.append(c);
    }
    bar.append(inner);
    nav.append(bar);
  }

  // --- Brand bar (logo + utility links + search) ---
  const brandBar = document.createElement('div');
  brandBar.className = 'va-brand-bar';
  const brandInner = document.createElement('div');
  brandInner.className = 'va-brand-inner';

  if (brandSection) {
    const logoLink = document.createElement('a');
    logoLink.className = 'va-logo';
    const srcLink = brandSection.querySelector('p > a');
    logoLink.href = srcLink ? srcLink.getAttribute('href') : '/';
    const img = brandSection.querySelector('img');
    if (img) logoLink.append(img.cloneNode(true));
    logoLink.setAttribute('aria-label', img ? img.getAttribute('alt') : 'VA.gov home');
    brandInner.append(logoLink);
  }

  const tools = document.createElement('div');
  tools.className = 'va-tools';

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'va-search-toggle';
  searchBtn.setAttribute('aria-expanded', 'false');
  searchBtn.textContent = 'Search';
  tools.append(searchBtn);

  if (utilitySection) {
    const utilLinks = utilitySection.querySelector('ul');
    if (utilLinks) {
      utilLinks.querySelectorAll('a').forEach((a) => {
        const link = a.cloneNode(true);
        link.classList.add('va-tool-link');
        // A bolded link (author wraps it in strong/b) renders as a button.
        if (a.closest('strong, b')) link.classList.add('va-tool-button');
        tools.append(link);
      });
    }
  }
  // Swap the authored "Sign in" link for the auth control (modal chooser when
  // signed out, account menu when signed in).
  decorateAuthControls(tools);

  brandInner.append(tools);

  // search panel (built in JS, not in the fragment)
  const searchPanel = document.createElement('form');
  searchPanel.className = 'va-search-panel';
  searchPanel.setAttribute('role', 'search');
  searchPanel.action = 'https://search.va.gov/search';
  searchPanel.hidden = true;
  const searchLabel = document.createElement('label');
  searchLabel.setAttribute('for', 'va-search-input');
  searchLabel.textContent = 'Search';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.id = 'va-search-input';
  searchInput.name = 'query';
  searchInput.placeholder = 'Search';
  const searchSubmit = document.createElement('button');
  searchSubmit.type = 'submit';
  searchSubmit.textContent = 'Search';
  searchPanel.append(searchLabel, searchInput, searchSubmit);
  searchBtn.addEventListener('click', () => {
    const open = !searchPanel.hidden;
    searchPanel.hidden = open;
    searchBtn.setAttribute('aria-expanded', String(!open));
    if (!open) searchInput.focus();
  });

  brandBar.append(brandInner);
  brandBar.append(searchPanel);
  nav.append(brandBar);

  // --- Primary nav (megamenu) ---
  const navBar = document.createElement('div');
  navBar.className = 'va-nav-bar';
  const navInner = document.createElement('div');
  navInner.className = 'va-nav-inner';

  const hamburger = document.createElement('button');
  hamburger.type = 'button';
  hamburger.className = 'va-hamburger';
  hamburger.setAttribute('aria-label', 'Menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span class="va-hamburger-icon"></span>';

  const navList = document.createElement('ul');
  navList.className = 'va-nav-list';

  // A secondary top-level <ul> (e.g. My VA / My HealtheVet) sits inline with
  // the primary nav but is pushed to the far right on desktop.
  const secondaryList = document.createElement('ul');
  secondaryList.className = 'va-nav-list va-nav-list-secondary';

  if (navSection) {
    const [topUl, secondaryUl] = navSection.querySelectorAll(':scope > ul');
    if (topUl) {
      [...topUl.children].forEach((srcLi) => navList.append(buildTopItem(srcLi, nav)));
    }
    if (secondaryUl) {
      [...secondaryUl.children].forEach((srcLi) => secondaryList.append(buildTopItem(srcLi, nav)));
    }
  }

  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('va-menu-open');
    hamburger.setAttribute('aria-expanded', String(open));
    if (!open) closeAllMenus(nav);
  });

  navInner.append(hamburger);
  navInner.append(navList);
  if (secondaryList.children.length) navInner.append(secondaryList);
  navBar.append(navInner);
  nav.append(navBar);

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      closeAllMenus(nav);
      searchPanel.hidden = true;
      searchBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllMenus(nav);
      searchPanel.hidden = true;
      searchBtn.setAttribute('aria-expanded', 'false');
    }
  });

  isDesktop.addEventListener('change', () => {
    closeAllMenus(nav);
    nav.classList.remove('va-menu-open');
    hamburger.setAttribute('aria-expanded', 'false');
    searchPanel.hidden = true;
    searchBtn.setAttribute('aria-expanded', 'false');
  });

  block.append(nav);
}

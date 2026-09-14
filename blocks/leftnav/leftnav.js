import { loadFragment } from '../fragment/fragment.js';

function getMeta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content || '';
}

function currentPath() {
  return window.location.pathname.replace(/\/$/, '');
}

function isCurrent(a) {
  const href = a.getAttribute('href') || '';
  if (!href || href.startsWith('#')) return false; // placeholder links aren't "current"
  try {
    return new URL(a.href, window.location).pathname.replace(/\/$/, '') === currentPath();
  } catch (e) {
    return false;
  }
}

// Inside an accordion group every item is a link. Items are authored as
// `<li><p><a>…</a></p>` (real link) or `<li><p>text</p>` (plain) with optional
// nested <ul>. Normalize each <li> to `<a>` (+ nested <ul>); plain items link
// to '#' for now. Recurses to honor the full nesting.
function linkify(ul) {
  [...ul.children].forEach((li) => {
    const nested = li.querySelector(':scope > ul');
    const existing = li.querySelector(':scope > p > a, :scope > a');
    let a;
    if (existing) {
      a = existing.cloneNode(true);
    } else {
      const p = li.querySelector(':scope > p');
      const text = (p
        ? p.textContent
        : [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('')
      ).trim();
      a = document.createElement('a');
      a.href = '#';
      a.textContent = text;
    }
    li.replaceChildren(a, ...(nested ? [nested] : []));
    if (nested) linkify(nested);
  });
}

// The label of a top-level nav group: a leading <p>, plain text, or a link.
function groupLabel(li) {
  const p = li.querySelector(':scope > p');
  if (p) return p.textContent.trim();
  const text = [...li.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join('')
    .trim();
  if (text) return text;
  return li.querySelector(':scope > a')?.textContent.trim() || '';
}

// Build a USWDS-style bordered accordion from the nav document's top-level list.
// Each top-level <li> is an accordion group (label + nested link list); a
// top-level <li> that is only a link becomes a plain heading link. The group
// containing the current page is expanded and its link marked aria-current.
function buildAccordion(list) {
  const nav = document.createElement('nav');
  nav.className = 'leftnav-accordion';
  nav.setAttribute('aria-label', 'Secondary navigation');

  [...list.children].forEach((li, i) => {
    const sub = li.querySelector(':scope > ul');
    const item = document.createElement('div');
    item.className = 'leftnav-acc-item';

    // Top-level link with no children → a plain heading link.
    if (!sub) {
      const a = li.querySelector(':scope > a');
      if (a) {
        const link = a.cloneNode(true);
        link.className = 'leftnav-acc-link';
        if (isCurrent(link)) link.setAttribute('aria-current', 'page');
        item.append(link);
        nav.append(item);
      }
      return;
    }

    const id = `leftnav-acc-${i}`;
    const heading = document.createElement('h2');
    heading.className = 'leftnav-acc-heading';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'leftnav-acc-button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id);
    btn.textContent = groupLabel(li);
    heading.append(btn);

    const content = document.createElement('div');
    content.id = id;
    content.className = 'leftnav-acc-content';
    content.hidden = true;
    sub.classList.add('leftnav-sidenav');
    linkify(sub);
    content.append(sub);

    // Mark the current link and expand the group that holds it.
    let activeLink = null;
    content.querySelectorAll('a[href]').forEach((a) => {
      if (isCurrent(a)) {
        a.setAttribute('aria-current', 'page');
        // highlight the whole item (the page + its nested sub-pages)
        a.closest('li')?.classList.add('leftnav-current');
        activeLink = a;
      }
    });
    if (activeLink) {
      btn.setAttribute('aria-expanded', 'true');
      content.hidden = false;

      // Reveal only the active path: every ancestor list plus the active
      // page's immediate children. Deeper sub-lists stay collapsed.
      let el = activeLink.parentElement;
      while (el && el !== content) {
        if (el.tagName === 'UL') el.classList.add('leftnav-open');
        el = el.parentElement;
      }
      const childList = activeLink.closest('li')?.querySelector(':scope > ul');
      if (childList) childList.classList.add('leftnav-open');
    }

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      content.hidden = open;
    });

    item.append(heading, content);
    nav.append(item);
  });

  return nav;
}

// Left-rail section navigation. A title header (icon + section name) is built
// from `section-title`/`section-icon` metadata; the nav itself is loaded from a
// section-nav document (nested UL/LI) at the section root and rendered as a
// USWDS-style accordion.
export default async function decorate(block) {
  const section = block.closest('.section');
  const titleText = section?.dataset.sectionTitle || getMeta('section-title');
  // section-icon is authored with EDS icon syntax (":school:"); strip the colons.
  const iconName = (section?.dataset.sectionIcon || getMeta('section-icon') || '')
    .replace(/:/g, '')
    .trim();

  let list = block.querySelector('ul');

  // Load the nav document: a lone link in the block, the `section-nav` metadata
  // path, or the per-section convention /<first-path-segment>/section-nav.
  if (!list) {
    const link = block.querySelector('a[href]');
    const seg = window.location.pathname.split('/').filter(Boolean)[0];
    const navPath = link
      ? new URL(link.href, window.location).pathname
      : (getMeta('section-nav') || (seg ? `/${seg}/section-nav` : ''));
    if (navPath) {
      const frag = await loadFragment(navPath);
      if (frag) list = frag.querySelector('ul');
    }
  }

  block.textContent = '';

  if (titleText) {
    const title = document.createElement('div');
    title.className = 'leftnav-title';
    if (iconName) {
      const icon = document.createElement('span');
      icon.className = 'leftnav-title-icon';
      const img = document.createElement('img');
      img.src = `${window.hlx.codeBasePath}/icons/${iconName}.svg`;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      icon.append(img);
      title.append(icon);
    }
    const text = document.createElement('span');
    text.className = 'leftnav-title-text';
    text.textContent = titleText;
    title.append(text);
    block.append(title);
  }

  if (!list) return;
  block.append(buildAccordion(list));
}

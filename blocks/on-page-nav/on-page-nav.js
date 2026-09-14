// "On this page" nav. Collects the main-content <h2 id="…"> headings (ignoring
// the right column and this block), renders anchor links, and smooth-scrolls to
// the heading on click.
export default function decorate(block) {
  const title = block.textContent.trim() || 'On this page';
  block.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'on-page-nav-title';
  heading.textContent = title;

  const list = document.createElement('ul');
  list.className = 'on-page-nav-list';

  const headings = [...document.querySelectorAll('main h2[id]')].filter((h) => (
    !h.closest('[data-section="column-2"]')
    && !h.closest('.interior-rail')
    && !block.contains(h)
  ));

  headings.forEach((h) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent.trim();
    a.addEventListener('click', (e) => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${h.id}`);
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    });
    li.append(a);
    list.append(li);
  });

  block.append(heading, list);
}

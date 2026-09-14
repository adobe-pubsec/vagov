// Boxed callout. Default is a gray box; the `feature` variant is blue. The
// importer emits a single content cell — flatten it so the content sits
// directly in the box.
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div');
  if (cell) block.replaceChildren(...cell.childNodes);
}

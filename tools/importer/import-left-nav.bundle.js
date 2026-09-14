var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-left-nav.js
  var import_left_nav_exports = {};
  __export(import_left_nav_exports, {
    default: () => import_left_nav_default
  });

  // tools/importer/transformers/vagov-cleanup.js
  var TransformHook = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#modal-crisisline",
        "#MDigitalInvitationWrapper",
        "#kampyleInviteContainer",
        "#logout-modal-root",
        // Global "Veteran portraits" banner — it renders site-wide (verified on
        // /health-care), so it belongs to the footer block, not page content.
        "#vets-banner-1"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.header",
        "footer.footer",
        "#announcement-root",
        "a.show-on-focus",
        "next-route-announcer",
        "va-banner",
        "va-breadcrumbs",
        // "Last updated" footer (holds the <time> date + a feedback button) and
        // any stray <time> — not authorable page content.
        ".last-updated",
        '[data-testid="content-footer"]',
        "time",
        "link",
        "noscript",
        "iframe"
      ]);
    }
  }

  // tools/importer/import-left-nav.js
  var PAGE_TEMPLATE = {
    name: "interior-left-nav",
    description: "VA.gov interior page with a section left-nav rail and a wide content column. Content is default content; the left nav is built by the template.",
    urls: [
      "https://www.va.gov/education/about-gi-bill-benefits/"
    ]
  };
  function runCleanup(hookName, element, payload) {
    try {
      transform.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error(`Cleanup failed at ${hookName}:`, e);
    }
  }
  function extractSection(document) {
    const title = (document.querySelector("#sidebar_header, .left-side-nav-title h4, va-sidenav h4") || {}).textContent?.trim() || "";
    const iconEl = document.querySelector(".left-side-nav-title va-icon[icon], va-icon.hub-icon[icon]");
    const icon = iconEl ? iconEl.getAttribute("icon") : "";
    return { title, icon };
  }
  function createPageMetadata(main, document, section) {
    const cells = {};
    const title = document.querySelector("title");
    if (title) cells.Title = title.textContent.replace(/\s*\|.*$/, "").trim();
    const desc = document.querySelector('meta[name="description"]');
    if (desc && desc.content) cells.Description = desc.content.trim();
    cells.Template = "interior-left-nav";
    if (section.title) cells["Section-Title"] = section.title;
    if (section.icon) cells["Section-Icon"] = `:${section.icon}:`;
    const block = WebImporter.Blocks.createBlock(document, { name: "Metadata", cells });
    main.append(block);
  }
  var import_left_nav_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const section = extractSection(document);
      const main = document.querySelector("#content article") || document.querySelector("main article") || document.querySelector("article") || document.querySelector("main") || document.body;
      runCleanup("beforeTransform", main, payload);
      WebImporter.DOMUtils.remove(main, [
        "va-sidenav",
        "va-on-this-page",
        "va-back-to-top",
        'nav[aria-label="Secondary"]'
      ]);
      runCleanup("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      createPageMetadata(main, document, section);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          sectionTitle: section.title,
          sectionIcon: section.icon
        }
      }];
    }
  };
  return __toCommonJS(import_left_nav_exports);
})();

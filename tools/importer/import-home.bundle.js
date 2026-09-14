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

  // import-home.js
  var import_home_exports = {};
  __export(import_home_exports, {
    default: () => import_home_default
  });

  // parsers/cards-benefits.js
  function parse(element, { document: document2 }) {
    let cards = Array.from(element.querySelectorAll(':scope > div[class*="grid-col"]'));
    if (!cards.length) {
      cards = Array.from(element.querySelectorAll(":scope > div"));
    }
    const cells = [];
    cards.forEach((card) => {
      const icon = card.querySelector('va-icon, img, svg, [class*="icon"]');
      const iconCell = icon || "";
      const contentCell = [];
      const heading = card.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading) contentCell.push(heading);
      const description = card.querySelector("p");
      if (description) contentCell.push(description);
      const ctas = Array.from(card.querySelectorAll(":scope > a, :scope > va-link")).filter((a) => !heading || !heading.contains(a));
      contentCell.push(...ctas);
      if (contentCell.length || icon) {
        cells.push([iconCell, contentCell.length ? contentCell : ""]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-benefits", cells });
    element.replaceWith(block);
  }

  // parsers/columns-promo.js
  function parse2(element, { document: document2 }) {
    const row = element.querySelector(".vads-grid-row") || element;
    let columns = Array.from(row.querySelectorAll(':scope > div[class*="grid-col"]'));
    if (!columns.length) {
      columns = Array.from(row.querySelectorAll(":scope > div"));
    }
    const rowCells = columns.map((col) => {
      const content = [];
      const img = col.querySelector("img, picture, va-icon");
      if (img) content.push(img);
      const textNodes = Array.from(col.querySelectorAll("h1, h2, h3, h4, h5, h6, p"));
      content.push(...textNodes);
      const links = Array.from(col.querySelectorAll("a, va-link")).filter((a) => !content.some((el) => el.contains && el.contains(a)));
      content.push(...links);
      return content.length ? content : "";
    }).filter((cell) => cell !== "");
    if (!rowCells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [rowCells];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-promo", cells });
    element.replaceWith(block);
  }

  // parsers/columns-search.js
  function parse3(element, { document: document2 }) {
    const row = element.querySelector(".vads-grid-row") || element;
    let columns = Array.from(row.querySelectorAll(':scope > div[class*="grid-col"]'));
    if (!columns.length) {
      columns = Array.from(row.querySelectorAll(":scope > div"));
    }
    const rowCells = columns.map((col) => {
      const content = [];
      const nodes = Array.from(
        col.querySelectorAll("h1, h2, h3, h4, h5, h6, ul, ol, va-search-input, p")
      );
      nodes.forEach((node) => {
        if (!nodes.some((other) => other !== node && other.contains(node))) {
          content.push(node);
        }
      });
      return content.length ? content : "";
    }).filter((cell) => cell !== "");
    if (!rowCells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [rowCells];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-search", cells });
    element.replaceWith(block);
  }

  // parsers/form.js
  function parse4(element, { document: document2 }) {
    const container = element.closest("form") || element.closest(".email-signup-form") || element.closest(".homepage-email-update-wrapper") || element.parentElement || element;
    const contentCell = [];
    const textNodes = Array.from(
      container.querySelectorAll("h1, h2, h3, h4, h5, h6, p, label")
    );
    textNodes.forEach((node) => {
      if (!textNodes.some((other) => other !== node && other.contains(node))) {
        contentCell.push(node.cloneNode(true));
      }
    });
    const controls = Array.from(
      container.querySelectorAll("va-text-input, input, va-button, button, va-select, va-checkbox")
    );
    controls.forEach((ctrl) => {
      if (!controls.some((other) => other !== ctrl && other.contains(ctrl))) {
        contentCell.push(ctrl.cloneNode(true));
      }
    });
    if (!contentCell.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [[contentCell]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "form", cells });
    element.replaceWith(block);
  }

  // parsers/hero-welcome.js
  function parse5(element, { document: document2 }) {
    const cells = [];
    const bgImage = element.querySelector("img, picture");
    if (bgImage) {
      cells.push([bgImage]);
    }
    const contentCell = [];
    const nodes = Array.from(
      element.querySelectorAll("h1, h2, h3, h4, h5, h6, p, va-link-action, va-link, va-button, a")
    );
    nodes.forEach((node) => {
      if (!nodes.some((other) => other !== node && other.contains(node))) {
        contentCell.push(node);
      }
    });
    if (!contentCell.length && !bgImage) {
      element.replaceWith(...element.childNodes);
      return;
    }
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero-welcome", cells });
    element.replaceWith(block);
  }

  // transformers/vagov-cleanup.js
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

  // transformers/vagov-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function querySection(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // import-home.js
  var parsers = {
    "cards-benefits": parse,
    "columns-promo": parse2,
    "columns-search": parse3,
    "form": parse4,
    "hero-welcome": parse5
  };
  var PAGE_TEMPLATE = {
    name: "home",
    description: "VA.gov homepage: hero welcome, search + top pages, news app promo, benefits card grid, feedback, and email signup.",
    urls: [
      "https://www.va.gov/"
    ],
    blocks: [
      {
        name: "hero-welcome",
        instances: [".homepage-hero__wrapper"]
      },
      {
        name: "columns-search",
        instances: [".template-module__JEykya__wrapper"]
      },
      {
        name: "columns-promo",
        instances: ["#content > div.vads-u-background-color--primary-dark"]
      },
      {
        name: "cards-benefits",
        instances: [".vads-grid-row.vads-grid-gap-3"]
      },
      {
        name: "form",
        instances: [".homepage-email-input"]
      }
    ],
    sections: [
      {
        id: "rc4c1",
        name: "hero",
        selector: [".homepage-hero__wrapper"],
        style: null,
        blocks: ["hero-welcome"],
        defaultContent: []
      },
      {
        id: "rc4c2",
        name: "search-top-pages",
        selector: [".template-module__JEykya__wrapper"],
        style: null,
        blocks: ["columns-search"],
        defaultContent: []
      },
      {
        id: "rc4c3",
        name: "news-app-promo",
        selector: ["#content > div.vads-u-background-color--primary-dark"],
        style: "primary-dark",
        blocks: ["columns-promo"],
        defaultContent: []
      },
      {
        id: "rc4c4",
        name: "explore-benefits",
        selector: ["#content > section.vads-grid-container.vads-u-padding--2p5"],
        style: null,
        blocks: ["cards-benefits"],
        defaultContent: ["#content > section.vads-grid-container.vads-u-padding--2p5 > div:nth-of-type(1)"]
      },
      {
        id: "rc4c5",
        name: "feedback",
        selector: ["#content > div.vads-grid-container"],
        style: null,
        blocks: [],
        defaultContent: ["#content > div.vads-grid-container"]
      },
      {
        id: "rc4c6",
        name: "email-signup",
        selector: [".homepage-email-update-wrapper"],
        style: "primary-alt-lightest",
        blocks: ["form"],
        defaultContent: ["#vets-banner-1"]
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = {
      ...payload,
      template: PAGE_TEMPLATE
    };
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_home_default = {
    transform: (payload) => {
      const { document: document2, url, html, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_home_exports);
})();

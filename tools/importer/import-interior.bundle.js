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

  // import-interior.js
  var import_interior_exports = {};
  __export(import_interior_exports, {
    default: () => import_interior_default
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

  // parsers/on-page-nav.js
  function parse2(element, { document: document2 }) {
    const block = WebImporter.Blocks.createBlock(document2, { name: "on-page-nav", cells: [""] });
    element.replaceWith(block);
  }

  // parsers/accordion.js
  function parse3(element, { document: document2 }) {
    let items = Array.from(element.querySelectorAll(":scope > va-accordion-item"));
    if (!items.length) {
      items = Array.from(element.querySelectorAll("va-accordion-item"));
    }
    const cells = [];
    items.forEach((item) => {
      let label = (item.getAttribute("header") || "").trim();
      let labelHeading = null;
      if (!label) {
        labelHeading = item.querySelector("h1, h2, h3, h4, h5, h6");
        if (labelHeading) label = (labelHeading.textContent || "").trim();
      }
      const body = document2.createElement("div");
      Array.from(item.childNodes).forEach((node) => {
        body.appendChild(node.cloneNode(true));
      });
      if (labelHeading) {
        const clonedHeadings = Array.from(body.querySelectorAll("h1, h2, h3, h4, h5, h6"));
        const dupe = clonedHeadings.find(
          (h) => (h.textContent || "").trim() === label
        );
        if (dupe) dupe.remove();
      }
      body.querySelectorAll("va-link").forEach((vl) => {
        const href = vl.getAttribute("href") || "#";
        const text = (vl.textContent || "").trim() || vl.getAttribute("text") || vl.getAttribute("label") || href;
        const a = document2.createElement("a");
        a.href = href;
        a.textContent = text;
        vl.replaceWith(a);
      });
      const bodyContent = Array.from(body.childNodes).filter((node) => {
        if (node.nodeType === 3) return (node.textContent || "").trim().length > 0;
        return node.nodeType === 1;
      });
      if (label || bodyContent.length) {
        cells.push([label || "", bodyContent.length ? bodyContent : ""]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "accordion", cells });
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

  // transformers/vagov-interior-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function querySection(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function sectionMetadata(section) {
    if (section.metadata && Object.keys(section.metadata).length) return section.metadata;
    if (section.style) return { style: section.style };
    return null;
  }
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const meta = sectionMetadata(section);
        if (i === 0 && !meta) continue;
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (meta) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const meta = sectionMetadata(section);
        if (!meta) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: meta
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // import-interior.js
  var parsers = {
    "cards-benefits": parse,
    "on-page-nav": parse2,
    accordion: parse3
  };
  var PAGE_TEMPLATE = {
    name: "interior-2-col",
    description: "VA.gov interior/hub page: hero intro with a headline icon, grouped benefit sections in the main column, and a right column with on-page navigation and a contact accordion.",
    urls: [
      "https://www.va.gov/education/"
    ],
    blocks: [
      {
        name: "cards-benefits",
        instances: [
          "#content article > div:nth-of-type(2)",
          "#content article > div:nth-of-type(3)",
          "#content article > div:nth-of-type(4)",
          "#content article > section"
        ]
      },
      { name: "on-page-nav", instances: ["va-on-this-page"] },
      { name: "accordion", instances: ["#hub-rail va-accordion", "va-accordion"] }
    ],
    sections: [
      { id: "s1", name: "hero-intro", selector: ["#content article > div:nth-of-type(1)"], metadata: { "headline-icon": "school" }, blocks: [], defaultContent: ["#content article > div:nth-of-type(1)"] },
      { id: "s2", name: "get-gi-bill-benefits", selector: ["#content article > div:nth-of-type(2)"], blocks: ["cards-benefits"], defaultContent: ["#content article > div:nth-of-type(2) > h2"] },
      { id: "s3", name: "manage-benefits", selector: ["#content article > div:nth-of-type(3)"], blocks: ["cards-benefits"], defaultContent: ["#content article > div:nth-of-type(3) > h2"] },
      { id: "s4", name: "more-information", selector: ["#content article > div:nth-of-type(4)"], blocks: ["cards-benefits"], defaultContent: ["#content article > div:nth-of-type(4) > h2"] },
      { id: "s5", name: "other-va-benefits", selector: ["#content article > section"], blocks: ["cards-benefits"], defaultContent: ["#content article > section > h2"] },
      { id: "s6", name: "right-column", selector: ["#hub-rail"], metadata: { section: "column-2" }, blocks: ["on-page-nav", "accordion"], defaultContent: [] }
    ]
  };
  var transformers = [transform, transform2];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
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
    const seen = /* @__PURE__ */ new Set();
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          if (seen.has(element)) return;
          seen.add(element);
          pageBlocks.push({ name: blockDef.name, selector, element });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  function assembleRightColumn(document2) {
    const onThisPage = document2.querySelector("#content va-on-this-page, va-on-this-page");
    const rail = document2.querySelector("#hub-rail");
    if (onThisPage && rail) rail.prepend(onThisPage);
  }
  function createPageMetadata(main, document2) {
    const cells = {};
    const title = document2.querySelector("title");
    if (title) cells.Title = title.textContent.replace(/\s*\|.*$/, "").trim();
    const desc = document2.querySelector('meta[name="description"]');
    if (desc && desc.content) cells.Description = desc.content.trim();
    cells.Template = "interior-2-col";
    const block = WebImporter.Blocks.createBlock(document2, { name: "Metadata", cells });
    main.append(block);
  }
  var import_interior_default = {
    transform: (payload) => {
      const { document: document2, url, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      document2.querySelectorAll("#content article > div:nth-of-type(1) va-icon").forEach((n) => n.remove());
      assembleRightColumn(document2);
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
      createPageMetadata(main, document2);
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
  return __toCommonJS(import_interior_exports);
})();

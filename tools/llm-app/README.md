# GI Bill School Finder & Comparison — LLM App starter

An Adobe LLM App starter: find schools, compare a shortlist, then
visit the VA site's GI Bill page. No VA API, authentication, eligibility
determination, benefit calculation, application submission, or profile writes.

**All six schools are fictional.** Locations, programs, tuition, and Yellow
Ribbon participation are illustrative, not verified institution data. The
official [GI Bill Comparison Tool](https://www.va.gov/education/gi-bill-comparison-tool/)
is linked for real decisions. Do not present the fixtures as VA-approved schools.

## Try it locally

Requires Node.js 22 or later. No additional dependencies or build step.

```sh
node tools/llm-app/serve.cjs
```

Open <http://127.0.0.1:3011>. This preview calls the block with no LLM bridge,
exactly as a normal EDS page does. Search and comparison use the published
school catalog directly in the browser. No API server, credentials, SDK, or
LLM connection is needed for the site experience.
The loopback preview server also exposes the action handlers for local tests;
it is not an MCP server or Adobe deployment. It does not restart port 3000.

1. Search `cybersecurity`, Virginia, any attendance format.
2. Select Potomac Technical College and Commonwealth Metropolitan University.
3. Select **Compare selected schools**. Add a third school on another run.
4. Explore the tuition and Yellow Ribbon rows using the illustrative school data.
   GI Bill payment and remaining cost are intentionally **not calculated**.
5. Select **Explore GI Bill benefits** to open the existing VA education journey.
6. On the site, explore consent, sign-in, personalization, and Brand
   Concierge separately. The LLM host's identity/conversation does not transfer.

Suggested conversation:

> I'm leaving the military and interested in cybersecurity in Northern Virginia.
> Show me some schools from the catalog.
>
> Compare Potomac Technical College and Commonwealth Metropolitan University.
>
> What should I verify about my GI Bill benefits before choosing a school?

The current dataset covers VA, MD, and DC. Search is deterministic,
case-insensitive substring matching against school name, city, and programs;
the LLM should pass a short keyword, not an entire conversational prompt.
It does not perform distance search or rank institutions.

## Action code and data

- `actions/find-schools/index.js`: optional `query` (up to 100 characters),
  `state` (`VA`, `MD`, `DC`), `format` (`in-person`, `hybrid`, `online`).
  Filters combine with AND; no matches is a valid empty result.
- `actions/compare-schools/index.js`: required `schoolIds`, exactly 2–3 unique
  known IDs from search. Invalid IDs or counts fail the whole request.
- `../../scripts/gi-bill-schools.json`: the single curated fixture source,
  publicly served with the site.
- `../../scripts/gi-bill-catalog.mjs`: shared validation, search, comparison,
  and result formatting used by both the site block and action handlers.
- `action-definitions.json`: **manual setup reference**, not an Adobe runtime
  manifest or a guaranteed UI import format. Use its names, code identifiers,
  descriptions, parameter schemas, and annotations when configuring actions.

Both handlers export `async (args)` using CommonJS, returning `content` and
an object-valued `structuredContent` with `mode`, `arguments`, `records`,
`illustrativeData`, and `disclaimer`. Validation failures return `isError: true`, readable
text, and empty records, not a successful-looking partial comparison.

## Widget content model

The shared [gi-bill-comparison block](../../blocks/gi-bill-comparison/gi-bill-comparison.js)
renders both actions. An empty block cell is sufficient for search and
comparison. Optionally add a link to the desired HTTPS education landing page:

| GI Bill Comparison |
| --- |
| [Explore GI Bill benefits](https://main--vagov--jfoxx.aem.page/education/about-gi-bill-benefits) |

This is a dynamic configuration block; school records are supplied by the
handler, not authored as table rows. The first link is used; extra cells are
ignored. With no link, the optional education CTA is omitted without an error.
An authored unsafe link still produces a configuration notice instead of a CTA.
The standalone test content is `preview.html`.

On a normal EDS page, author the block table above; do not link directly to
the JavaScript file. The block supplies its own program, state, and attendance
controls, fetches the public catalog relative to its module URL, and compares
2–3 selected schools locally. The `tools/llm-app/` directory is not required
on the deployed site. Publish the block JS/CSS, shared module, and catalog JSON
together. Missing or invalid catalogs show a retryable error, not empty results.

When the Adobe LLM Apps embed supplies a connected `bridge`, the same block
reads `bridge.toolResult`, subscribes to later results, and explicitly calls
`compare_schools`. It does not fetch the site catalog or add the site's search
form in host mode. Live empty/error results are never replaced by local records.

The education CTA opens a new tab and replaces any authored query/fragment with
`source=llm-app` (host) or `source=school-comparison` (site) and selected
fictional `schoolIds`. It does not include names,
emails, ECIDs, benefits, authentication tokens, or chat transcripts.
**The destination currently remains the existing GI Bill page:** IDs are URL
context only; it does not restore a comparison or create an authenticated profile.

## Connect to Adobe LLM Apps

Adobe LLM Apps is in Beta; access and a supported host account are required.
Follow the current docs rather than treating this starter as generated infrastructure:

### Adobe-managed setup

For the wizard's **Build actions automatically** flow, first author and preview
the working comparison block on the VA site, publish the page and code, then
provide that public HTTPS page URL to Adobe. The wizard creates the action/widget
infrastructure. No separate repository needs to be created manually for this path.
The local loopback preview URL is not accessible to Adobe's website analyzer.
Review the generated handlers and widget before deploying; website analysis
does not automatically connect generated actions to this site's catalog.

### Action repository prerequisite

This VA site repository is an EDS project, **not** a valid LLM Apps action
repository. The `tools/llm-app/` directory provides handlers and a local preview;
it does not include Adobe's deployable runtime scaffold.

If the setup wizard requires a repository created from
[`adobe-rnd/llm-apps-boilerplate`](https://github.com/adobe-rnd/llm-apps-boilerplate),
create a **separate action repository** using that repository's **Use this
template → Create a new repository** option. For example, name it
`va-education-actions`. Do not select `jfoxx/vagov` in the **Actions source**
step or copy the runtime scaffold into the site repository.

Grant the Adobe LLM Apps GitHub App access to the new action repository,
then select it in **Actions source** and validate it. Keep its generated
`package.json`, lockfile, `app.config.yaml`, `entry.js`, build configuration,
and runtime dependencies. These local handlers reference shared site files;
copying `actions/` and `lib/` alone is not sufficient. Port the shared catalog
module and JSON with them and adjust relative paths to the target repository.

The **Widget source** is a separate EDS repository selection, not the action
repository. Using this VA site for widgets still requires the LLM Apps embed/SDK
integration and a published widget page; the ordinary site's block loader does
not supply the host bridge.

The published setup guide also describes automatic initialization of empty
repositories. If the wizard rejects that route and specifically requires the
template, use the template-based action repository described above.

### Configure and deploy

1. [Create an app](https://experienceleague.adobe.com/en/docs/llm-apps/using/build-first-app/create-app)
   using Adobe-managed infrastructure or separate compatible action and widget
   repositories. For the template-based workflow, use the action repository
   described above. This starter has not initialized or deployed remote repos.
2. Choose manual action creation. Create `find_schools` and `compare_schools`
   using `action-definitions.json`. Configure both as read-only. Allow the
   comparison action app visibility so the widget can invoke it.
3. For manual implementation in the initialized **action repository**, port
   this directory's `actions/` and `lib/` plus the shared catalog module and JSON,
   adjusting the relative imports. Retain Adobe's generated runtime and
   metadata configuration; do not overwrite `entry.js`. Copy/adapt the handler
   tests to that repository's runner as appropriate.
4. In the initialized **widget repository**, copy
   `blocks/gi-bill-comparison/`. Keep Adobe's generated `scripts/aem-embed.js`
   and `scripts/llmapps-sdk.js`; the block does not import or implement the SDK.
5. Author and preview a widget page using the one-cell model above, then publish
   it. Set both actions' Widget URL using the actual page/embed configuration
   in that generated repository. A plain block JS URL is not a Widget URL.
6. [Deploy to Stage](https://experienceleague.adobe.com/en/docs/llm-apps/using/deploy-and-test/deploy-your-app),
   connect the resulting MCP URL in a supported host, and test both actions,
   the comparison call, disclosures, empty/error states, and external links.
   Widget rendering and opening links depend on host support.
7. Replace fixtures with a verified official data source and review applicable benefits rules before
   considering any real-world education decisions.

The `.hlxignore` entry for `tools/llm-app/**` keeps this starter's server code,
tests, metadata reference, and fixtures off the EDS site. Only the reusable
widget block, shared catalog module, and catalog JSON are public site code;
no existing page is changed automatically.

## Validation

From the site repository root:

```sh
node --test tools/llm-app/test/actions.test.cjs
npx eslint blocks/gi-bill-comparison tools/llm-app scripts/gi-bill-catalog.mjs --ext .js,.cjs,.mjs
npx stylelint blocks/gi-bill-comparison/gi-bill-comparison.css
```

Browser acceptance: select 2–3 schools, compare, return to results, try no
matches, retry a failed comparison, inspect the CTA URL, and check 390px, 900px,
and 1280px viewports. On mobile only the comparison table should scroll
horizontally, not the page.

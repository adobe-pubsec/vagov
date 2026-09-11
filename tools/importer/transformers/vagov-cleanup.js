/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: VA.gov site-wide cleanup.
 * Removes non-authorable global chrome (site shell/layout) so the import
 * contains only page-level authorable content.
 *
 * All selectors verified against migration-work/cleaned.html.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / widgets that could interfere with block parsing.
    // Verified in cleaned.html:
    //   #modal-crisisline    -> footer crisis-line overlay modal (line 810)
    //   #MDigitalInvitationWrapper -> Medallia feedback invite widget + iframe (line 853)
    //   #kampyleInviteContainer    -> feedback invite modal container (line 854)
    //   #logout-modal-root         -> empty logout modal mount (line 846)
    WebImporter.DOMUtils.remove(element, [
      '#modal-crisisline',
      '#MDigitalInvitationWrapper',
      '#kampyleInviteContainer',
      '#logout-modal-root',
      // Global "Veteran portraits" banner — it renders site-wide (verified on
      // /health-care), so it belongs to the footer block, not page content.
      '#vets-banner-1',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable global chrome. Verified in cleaned.html:
    //   header.header            -> site header, mega-menu nav, search, crisis bar (lines 16-164)
    //   footer.footer            -> site footer link groups + language + legal (lines 453-845)
    //   #announcement-root       -> global announcement banner mount (line 11)
    //   a.show-on-focus          -> "Skip to Content" a11y skip link (line 15)
    //   next-route-announcer     -> Next.js route announcer (line 851)
    //   link                     -> stylesheet <link> tags (lines 6-8)
    //   va-banner                -> global maintenance/announcement banner web
    //                               component, rendered above <main> outside the
    //                               header (education page: id="91199", line 157).
    //                               System chrome, not page content.
    //   va-breadcrumbs           -> global breadcrumb nav rendered above <main>
    //                               in div.vads-grid-container (education page,
    //                               line 168). Site navigation chrome.
    WebImporter.DOMUtils.remove(element, [
      'header.header',
      'footer.footer',
      '#announcement-root',
      'a.show-on-focus',
      'next-route-announcer',
      'va-banner',
      'va-breadcrumbs',
      'link',
      'noscript',
      'iframe',
    ]);
  }
}

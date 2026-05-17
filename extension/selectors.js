/**
 * Centralized ChatGPT DOM selectors (update here when the site changes).
 */
const PersianRTLSelectors = {
  messages: [
    "[data-message-author-role]",
    '[data-testid^="conversation-turn"]',
  ],
  markdown: [".markdown", ".prose"],
  composer: [
    "#prompt-textarea",
    '[data-testid="message-input"]',
    "textarea",
    'motion.div textarea',
    "motion-textarea textarea",
    'div.ProseMirror[contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    'textarea[placeholder]',
    'div[contenteditable="true"][data-virtualkeyboard="true"]',
  ],
  overlays: [
    '[role="dialog"]',
    '[aria-modal="true"]',
    '[data-state="open"][role="dialog"]',
  ],
  /** Deep Research plan / question cards (not always role=dialog). */
  deepResearch: [
    "section.rounded-2xl.border.p-4",
    "section.bg-token-main-surface-primary.rounded-2xl",
    '[data-testid*="research"]',
    '[data-testid*="deep-research"]',
    '[data-testid*="deep_research"]',
    '[class*="deep-research"]',
    '[class*="DeepResearch"]',
    '[class*="research-plan"]',
  ],
  /** Plan step rows (icon + Persian text). ChatGPT May 2026 DOM. */
  researchPlanSteps: "ul.space-y-4 > li.flex.items-start, ul > li.flex.items-start.gap-3",
  researchPlanText:
    "span.block.break-words, span.block[class*='min-h-'], li.flex.items-start .min-w-0.flex-1 span",
  researchPlanTitle: "section.rounded-2xl h2, section.bg-token-main-surface-primary h2",
  rtlTextBlocks:
    "p, li, h1, h2, h3, h4, h5, h6, span.block, [role='listitem'], [role='heading'], dt, dd, blockquote, figcaption",
  ltrBlocks: "pre, code, kbd, samp, var, .math, .katex",
};

/**
 * Query all elements matching any selector in a list (deduplicated).
 * @param {string[]} selectorList
 * @param {ParentNode} root
 * @returns {Element[]}
 */
function queryAllSelectors(selectorList, root = document) {
  const seen = new Set();
  const results = [];
  for (const selector of selectorList) {
    try {
      root.querySelectorAll(selector).forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          results.push(el);
        }
      });
    } catch {
      // Invalid selector on this page build — skip
    }
  }
  return results;
}

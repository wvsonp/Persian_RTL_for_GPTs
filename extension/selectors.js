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

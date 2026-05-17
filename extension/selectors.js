/**
 * Site-specific DOM selectors. Shared bidi logic lives in bidi.js.
 */
const PersianRTLShared = {
  rtlTextBlocks:
    "p, li, h1, h2, h3, h4, h5, h6, span.block, [role='listitem'], [role='heading'], dt, dd, blockquote, figcaption",
  ltrBlocks: "pre, code, kbd, samp, var, .math, .katex",
  markdown: [".markdown", ".prose"],
};

const PersianRTLSiteConfigs = {
  chatgpt: {
    siteId: "chatgpt",
    messages: [
      "[data-message-author-role]",
      '[data-testid^="conversation-turn"]',
    ],
    composer: [
      "#prompt-textarea",
      '[data-testid="message-input"]',
      "textarea",
      "motion.div textarea",
      "motion-textarea textarea",
      'motion.div.ProseMirror[contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'motion.div[contenteditable="true"][role="textbox"]',
      '[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"][data-virtualkeyboard="true"]',
    ],
    overlays: [
      '[role="dialog"]',
      '[aria-modal="true"]',
      '[data-state="open"][role="dialog"]',
    ],
    deepResearch: [
      "section.rounded-2xl.border.p-4",
      "section.bg-token-main-surface-primary.rounded-2xl",
      '[data-testid*="research"]',
      '[data-testid*="deep-research"]',
      '[data-testid*="deep_research"]',
    ],
    researchPlanSteps:
      "ul.space-y-4 > li.flex.items-start, ul > li.flex.items-start.gap-3",
    researchPlanText:
      "span.block.break-words, span.block[class*='min-h-'], li.flex.items-start .min-w-0.flex-1 span",
    researchPlanTitle:
      "section.rounded-2xl h2, section.bg-token-main-surface-primary h2",
    proseRoots: null,
  },
  perplexity: {
    siteId: "perplexity",
    messages: [
      '[data-testid*="answer"]',
      '[data-testid*="thread"]',
      '[class*="answer"]',
      '[class*="group/query"]',
      '[class*="query"]',
      "main article",
      '[role="article"]',
    ],
    composer: [
      "#ask-input",
      'textarea#ask-input',
      'div#ask-input[contenteditable="true"]',
      'div#ask-input[contenteditable="true"]',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Search"]',
      'textarea[placeholder*="ask"]',
      'motion.div[contenteditable="true"][role="textbox"]',
      '[data-testid="composer"]',
      '[data-testid*="composer"]',
      'motion.div[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea:not([disabled]):not([readonly])',
    ],
    overlays: ['[role="dialog"]', '[aria-modal="true"]', '[data-state="open"]'],
    deepResearch: [
      '[data-testid*="research"]',
      "section.rounded-2xl",
      '[class*="research"]',
    ],
    researchPlanSteps:
      "ul.space-y-4 > li.flex.items-start, ul > li.flex.items-start.gap-3, li.flex.items-start",
    researchPlanText:
      "span.block.break-words, span.block[class*='min-h-'], li.flex.items-start .min-w-0.flex-1 span",
    researchPlanTitle: "section.rounded-2xl h2, h2.break-words",
    /** Catch-all for Perplexity answer/prose blocks. */
    proseRoots: [
      "main .prose",
      ".prose",
      '[class*="prose"]',
      '[class*="markdown"]',
      ".pb-md .prose",
    ],
  },
};

/**
 * @returns {object} Active selector config for the current host.
 */
function getActiveSiteConfig() {
  const host = location.hostname.toLowerCase();
  const siteKey = host.includes("perplexity")
    ? "perplexity"
    : "chatgpt";
  return {
    ...PersianRTLShared,
    ...PersianRTLSiteConfigs[siteKey],
  };
}

/** @deprecated Use getActiveSiteConfig(); kept for tests that mock location. */
const PersianRTLSelectors = getActiveSiteConfig();

/**
 * Query all elements matching any selector in a list (deduplicated).
 * @param {string[]} selectorList
 * @param {ParentNode} root
 * @returns {Element[]}
 */
function queryAllSelectors(selectorList, root = document) {
  const seen = new Set();
  const results = [];
  if (!selectorList) return results;
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

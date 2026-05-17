/**
 * Bidirectional text utilities for Persian/Arabic + English mixed content.
 */
const PersianRTL = (() => {
  const RTL_SCRIPT_RE =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const LATIN_RUN_RE = /[A-Za-z0-9@#%&*+=_\-./:?]+/g;
  const PROCESSED_ATTR = "data-persian-rtl-processed";
  const LTR_ISLAND_CLASS = "persian-rtl-ltr-island";
  const MARKDOWN_CLASS = "persian-rtl-markdown";
  const BLOCK_CLASS = "persian-rtl-block";
  const DEEP_RESEARCH_CLASS = "persian-rtl-deep-research";
  const PLAN_STEP_CLASS = "persian-rtl-plan-step";

  /**
   * @param {string} text
   * @returns {boolean}
   */
  function containsRTL(text) {
    return RTL_SCRIPT_RE.test(text);
  }

  /**
   * @param {Node} node
   * @returns {string}
   */
  function getNodeText(node) {
    return node.textContent || "";
  }

  /**
   * @param {Element} el
   * @returns {boolean}
   */
  function isInsideLtrIsland(el) {
    return Boolean(el.closest("pre, code, kbd, samp, var, .katex, .math"));
  }

  /**
   * @param {Element} root
   * @param {string} ltrSelector
   */
  function applyLtrIslands(root, ltrSelector) {
    root.querySelectorAll(ltrSelector).forEach((block) => {
      block.setAttribute("dir", "ltr");
      block.classList.add(LTR_ISLAND_CLASS);
      block.setAttribute(PROCESSED_ATTR, "1");
    });
  }

  /**
   * @param {Text} textNode
   */
  function wrapLatinRunsInTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || !LATIN_RUN_RE.test(text)) return;

    LATIN_RUN_RE.lastIndex = 0;
    const parent = textNode.parentNode;
    if (!parent || parent.closest("bdi")) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = LATIN_RUN_RE.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, start))
        );
      }
      const bdi = document.createElement("bdi");
      bdi.setAttribute("dir", "ltr");
      bdi.textContent = match[0];
      fragment.appendChild(bdi);
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(fragment, textNode);
  }

  /**
   * @param {Element} root
   */
  function wrapInlineLatinRuns(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("bdi")) return NodeFilter.FILTER_REJECT;
        if (isInsideLtrIsland(parent)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !LATIN_RUN_RE.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    let current;
    while ((current = walker.nextNode())) {
      textNodes.push(/** @type {Text} */ (current));
    }

    textNodes.forEach(wrapLatinRunsInTextNode);
  }

  /**
   * Find the best markdown/content container inside a message or overlay.
   * @param {Element} el
   * @param {string[]} markdownSelectors
   * @returns {Element}
   */
  function resolveContentRoot(el, markdownSelectors) {
    for (const selector of markdownSelectors) {
      const found = el.querySelector(selector);
      if (found) return found;
    }
    return el;
  }

  /**
   * Apply dir=rtl to individual text blocks (fixes Deep Research list rows).
   * @param {Element} root
   * @param {string} blockSelector
   */
  function fixRtlTextBlocks(root, blockSelector) {
    root.querySelectorAll(blockSelector).forEach((block) => {
      if (isInsideLtrIsland(block)) return;
      const text = getNodeText(block);
      if (!containsRTL(text)) return;
      block.setAttribute("dir", "rtl");
      block.classList.add(BLOCK_CLASS);
    });
  }

  /**
   * Find innermost containers that look like a Deep Research plan (RTL list + steps).
   * @returns {Element[]}
   */
  function isResearchPlanSection(el) {
    if (el.tagName !== "SECTION") return false;
    const list = el.querySelector("ul.space-y-4, ul");
    if (!list) return false;
    return (
      el.classList.contains("rounded-2xl") &&
      containsRTL(getNodeText(list))
    );
  }

  function findResearchPlanCards() {
    const candidates = [];

    document
      .querySelectorAll(
        "section.rounded-2xl.border.p-4, section.bg-token-main-surface-primary.rounded-2xl"
      )
      .forEach((section) => {
        if (isResearchPlanSection(section)) {
          candidates.push(section);
        }
      });

    document.querySelectorAll("ul, ol").forEach((list) => {
      if (!containsRTL(getNodeText(list))) return;
      const items = list.querySelectorAll(":scope > li");
      if (items.length < 2) return;

      const section = list.closest("section");
      if (section && isResearchPlanSection(section)) {
        if (!candidates.includes(section)) candidates.push(section);
        return;
      }

      let root = list.parentElement;
      for (let depth = 0; depth < 10 && root && root !== document.body; depth++) {
        const textLen = getNodeText(root).length;
        if (textLen > 0 && textLen < 12000) {
          candidates.push(root);
          break;
        }
        root = root.parentElement;
      }
    });

    return candidates.filter((node) => {
      return !candidates.some(
        (other) => other !== node && node.contains(other)
      );
    });
  }

  /**
   * ChatGPT Deep Research plan card (section > h2 + ul.space-y-4 > li.flex).
   * @param {Element} section
   * @param {object} options
   * @returns {boolean}
   */
  function fixResearchPlanSection(section, options) {
    const {
      researchPlanSteps,
      researchPlanText,
      researchPlanTitle,
      rtlTextBlocksSelector,
    } = options;

    if (!containsRTL(getNodeText(section))) return false;

    section.classList.add(DEEP_RESEARCH_CLASS);
    section.setAttribute("dir", "rtl");
    section.setAttribute(PROCESSED_ATTR, "deep-research");

    if (researchPlanTitle) {
      section.querySelectorAll(researchPlanTitle).forEach((title) => {
        if (!containsRTL(getNodeText(title))) return;
        title.setAttribute("dir", "rtl");
        title.classList.add(BLOCK_CLASS);
      });
    }

    section.querySelectorAll("h2").forEach((title) => {
      if (!containsRTL(getNodeText(title))) return;
      title.setAttribute("dir", "rtl");
      title.classList.add(BLOCK_CLASS);
    });

    const stepSelector =
      researchPlanSteps || "ul.space-y-4 > li.flex.items-start, ul > li.flex.items-start";
    section.querySelectorAll(stepSelector).forEach((li) => {
      if (!containsRTL(getNodeText(li))) return;
      li.setAttribute("dir", "rtl");
      li.classList.add(BLOCK_CLASS, PLAN_STEP_CLASS);

      const textSelector =
        researchPlanText ||
        "span.block.break-words, li.flex.items-start .min-w-0.flex-1 span";
      li.querySelectorAll(textSelector).forEach((span) => {
        if (!containsRTL(getNodeText(span))) return;
        span.setAttribute("dir", "rtl");
        span.classList.add(BLOCK_CLASS);
        wrapInlineLatinRuns(span);
      });
    });

    fixRtlTextBlocks(section, rtlTextBlocksSelector);

    section.querySelectorAll("p.loading-shimmer, .loading-shimmer").forEach((el) => {
      if (containsRTL(getNodeText(el))) return;
      el.setAttribute("dir", "ltr");
      el.classList.add(LTR_ISLAND_CLASS);
    });

    const headerActions = section.querySelector(
      ".flex.items-start.justify-between > div:last-child"
    );
    if (headerActions?.querySelector("button")) {
      headerActions.setAttribute("dir", "ltr");
      headerActions.classList.add(LTR_ISLAND_CLASS);
    }

    const progressRow = section.querySelector(
      ".mt-4.flex.flex-col.gap-2, div.flex.flex-row.items-center.gap-3"
    );
    if (progressRow && !containsRTL(getNodeText(progressRow))) {
      progressRow.setAttribute("dir", "ltr");
      progressRow.classList.add(LTR_ISLAND_CLASS);
    }

    return true;
  }

  /**
   * @param {Element} el
   * @param {object} options
   * @returns {boolean}
   */
  function fixDeepResearchPanel(el, options) {
    if (isResearchPlanSection(el) || el.tagName === "SECTION") {
      if (isResearchPlanSection(el)) {
        return fixResearchPlanSection(el, options);
      }
    }

    const {
      markdownSelectors,
      ltrBlocksSelector,
      rtlTextBlocksSelector,
    } = options;
    const text = getNodeText(el);
    if (!containsRTL(text)) return false;

    const section = el.closest(
      "section.rounded-2xl.border.p-4, section.bg-token-main-surface-primary.rounded-2xl"
    );
    if (section && isResearchPlanSection(section)) {
      return fixResearchPlanSection(section, options);
    }

    el.classList.add(DEEP_RESEARCH_CLASS);
    el.setAttribute("dir", "rtl");
    el.setAttribute(PROCESSED_ATTR, "deep-research");

    const contentRoot = resolveContentRoot(el, markdownSelectors);
    if (contentRoot !== el) {
      fixMessageRoot(el, options);
    } else {
      contentRoot.classList.add(MARKDOWN_CLASS);
      contentRoot.setAttribute("dir", "rtl");
      contentRoot.setAttribute(PROCESSED_ATTR, "1");
      applyLtrIslands(contentRoot, ltrBlocksSelector);
      wrapInlineLatinRuns(contentRoot);
    }

    fixRtlTextBlocks(el, rtlTextBlocksSelector);
    return true;
  }

  /**
   * @param {Element} el
   * @param {object} options
   * @param {string[]} options.markdownSelectors
   * @param {string} options.ltrBlocksSelector
   * @returns {boolean}
   */
  function fixMessageRoot(el, options) {
    const { markdownSelectors, ltrBlocksSelector } = options;
    const text = getNodeText(el);
    if (!containsRTL(text)) return false;

    const contentRoot = resolveContentRoot(el, markdownSelectors);
    const alreadyProcessed = contentRoot.getAttribute(PROCESSED_ATTR) === "1";

    if (!alreadyProcessed) {
      contentRoot.setAttribute("dir", "rtl");
      contentRoot.classList.add(MARKDOWN_CLASS);
      contentRoot.setAttribute(PROCESSED_ATTR, "1");
    }

    applyLtrIslands(contentRoot, ltrBlocksSelector);
    wrapInlineLatinRuns(contentRoot);
    fixRtlTextBlocks(
      contentRoot,
      options.rtlTextBlocksSelector ||
        "p, li, h1, h2, h3, h4, h5, h6, [role='listitem']"
    );

    if (el !== contentRoot && !el.hasAttribute(PROCESSED_ATTR)) {
      el.setAttribute(PROCESSED_ATTR, "1");
    }

    return true;
  }

  /**
   * @param {Element} el
   * @returns {boolean}
   */
  function fixComposer(el) {
    if (el.getAttribute(PROCESSED_ATTR) === "composer") return true;

    el.setAttribute("dir", "auto");
    el.classList.add("persian-rtl-composer");
    el.setAttribute(PROCESSED_ATTR, "composer");
    return true;
  }

  /**
   * @param {Element} el
   * @param {object} options
   * @returns {boolean}
   */
  function fixOverlay(el, options) {
    const text = getNodeText(el);
    if (!containsRTL(text)) return false;
    return fixMessageRoot(el, options);
  }

  /**
   * Remove all fixes applied by this extension.
   */
  function unfixAll() {
    document
      .querySelectorAll(`[${PROCESSED_ATTR}]`)
      .forEach((el) => {
        el.removeAttribute(PROCESSED_ATTR);
        el.removeAttribute("dir");
        el.classList.remove(
          MARKDOWN_CLASS,
          BLOCK_CLASS,
          DEEP_RESEARCH_CLASS,
          PLAN_STEP_CLASS,
          LTR_ISLAND_CLASS,
          "persian-rtl-composer"
        );
      });

    document.querySelectorAll("bdi[dir='ltr']").forEach((bdi) => {
      const parent = bdi.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(bdi.textContent || ""), bdi);
      parent.normalize();
    });
  }

  return {
    containsRTL,
    fixMessageRoot,
    fixComposer,
    fixOverlay,
    fixDeepResearchPanel,
    fixResearchPlanSection,
    findResearchPlanCards,
    isResearchPlanSection,
    unfixAll,
    PROCESSED_ATTR,
  };
})();

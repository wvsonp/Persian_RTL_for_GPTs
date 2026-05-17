/**
 * Bidirectional text utilities for Persian/Arabic + English mixed content.
 */
const PersianRTL = (() => {
  const RTL_CHAR_CLASS =
    "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
  const RTL_SCRIPT_RE = new RegExp(`[${RTL_CHAR_CLASS}]`);
  const RTL_SEGMENT_RE = new RegExp(`[${RTL_CHAR_CLASS}]+`, "g");
  const PROCESSED_ATTR = "data-persian-rtl-processed";
  const LTR_ISLAND_CLASS = "persian-rtl-ltr-island";
  const MARKDOWN_CLASS = "persian-rtl-markdown";
  const BLOCK_CLASS = "persian-rtl-block";
  const MIXED_CLASS = "persian-rtl-mixed";
  const DEEP_RESEARCH_CLASS = "persian-rtl-deep-research";
  const PLAN_STEP_CLASS = "persian-rtl-plan-step";
  const LIST_CLASS = "persian-rtl-list";

  /**
   * @param {string} text
   * @returns {boolean}
   */
  function containsRTL(text) {
    return RTL_SCRIPT_RE.test(text);
  }

  /**
   * @param {string} text
   * @returns {boolean}
   */
  function containsLatinLetter(text) {
    return /[A-Za-z]/.test(text);
  }

  /**
   * @param {string} text
   * @returns {boolean}
   */
  function isMixedRtlLatin(text) {
    return containsRTL(text) && containsLatinLetter(text);
  }

  /**
   * @param {string} chunk
   * @returns {boolean}
   */
  function isListMarkerOnly(chunk) {
    return (
      !/[A-Za-z]{2,}/.test(chunk) &&
      /^[\s\u2022\u2023\u25E6\u29BFoO●◦\-–—.:,،؛0-9]+$/.test(chunk)
    );
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
   * @param {Element} el
   * @returns {boolean}
   */
  function isNativeListItem(el) {
    const parent = el.parentElement;
    return (
      el.tagName === "LI" &&
      parent != null &&
      (parent.tagName === "UL" || parent.tagName === "OL")
    );
  }

  /**
   * Deep Research / plan rows use flex + icons, not native list markers.
   * @param {Element} li
   * @returns {boolean}
   */
  function isPlanStepListItem(li) {
    if (li.tagName !== "LI") return false;
    if (li.classList.contains(PLAN_STEP_CLASS)) return true;
    return Boolean(
      li.closest(`.${DEEP_RESEARCH_CLASS}`) &&
        li.classList.contains("flex") &&
        li.classList.contains("items-start")
    );
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
   * Wrap whole English/Latin phrases in one LTR isolate (keeps word order).
   * @param {Text} textNode
   */
  function wrapLatinPhrasesInTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || !containsLatinLetter(text)) return;

    const parent = textNode.parentNode;
    if (!parent || parent.closest("bdi")) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    RTL_SEGMENT_RE.lastIndex = 0;
    while ((match = RTL_SEGMENT_RE.exec(text)) !== null) {
      const rtlStart = match.index;
      if (rtlStart > lastIndex) {
        appendLtrChunk(fragment, text.slice(lastIndex, rtlStart));
      }
      fragment.appendChild(document.createTextNode(match[0]));
      lastIndex = rtlStart + match[0].length;
    }

    if (lastIndex < text.length) {
      appendLtrChunk(fragment, text.slice(lastIndex));
    }

    if (fragment.childNodes.length === 0) return;
    if (
      fragment.childNodes.length === 1 &&
      fragment.firstChild.nodeType === Node.TEXT_NODE
    ) {
      return;
    }

    parent.replaceChild(fragment, textNode);
  }

  /**
   * @param {DocumentFragment} fragment
   * @param {string} chunk
   */
  function appendLtrChunk(fragment, chunk) {
    if (!chunk) return;
    if (containsLatinLetter(chunk) && !isListMarkerOnly(chunk)) {
      const bdi = document.createElement("bdi");
      bdi.setAttribute("dir", "ltr");
      bdi.textContent = chunk;
      fragment.appendChild(bdi);
      return;
    }
    fragment.appendChild(document.createTextNode(chunk));
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
        if (!node.nodeValue || !containsLatinLetter(node.nodeValue)) {
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

    textNodes.forEach(wrapLatinPhrasesInTextNode);
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
      if (isNativeListItem(block)) return;
      if (
        block.getAttribute("role") === "listitem" &&
        block.closest("ul, ol")
      ) {
        return;
      }
      const text = getNodeText(block);
      if (!containsRTL(text)) return;
      if (isMixedRtlLatin(text)) {
        block.setAttribute("dir", "auto");
        block.classList.add(BLOCK_CLASS, MIXED_CLASS);
      } else {
        block.setAttribute("dir", "rtl");
        block.classList.add(BLOCK_CLASS);
      }
    });
  }

  /**
   * RTL native lists: set direction on ul/ol so markers stay beside text.
   * @param {Element} root
   */
  function fixRtlLists(root) {
    root.querySelectorAll("ul, ol").forEach((list) => {
      if (isInsideLtrIsland(list)) return;
      if (!containsRTL(getNodeText(list))) return;

      list.setAttribute("dir", "rtl");
      list.classList.add(LIST_CLASS);
      list.setAttribute(PROCESSED_ATTR, "list");

      list.querySelectorAll(":scope > li").forEach((li) => {
        if (isPlanStepListItem(li)) return;
        li.classList.remove(BLOCK_CLASS);
        li.removeAttribute("dir");
      });
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
      if (isMixedRtlLatin(text)) {
        contentRoot.setAttribute("dir", "auto");
        contentRoot.classList.add(MARKDOWN_CLASS, MIXED_CLASS);
      } else {
        contentRoot.setAttribute("dir", "rtl");
        contentRoot.classList.add(MARKDOWN_CLASS);
      }
      contentRoot.setAttribute(PROCESSED_ATTR, "1");
    }

    applyLtrIslands(contentRoot, ltrBlocksSelector);
    wrapInlineLatinRuns(contentRoot);
    fixRtlLists(contentRoot);
    fixRtlTextBlocks(
      contentRoot,
      options.rtlTextBlocksSelector ||
        "p, h1, h2, h3, h4, h5, h6, span.block, blockquote"
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
          MIXED_CLASS,
          DEEP_RESEARCH_CLASS,
          PLAN_STEP_CLASS,
          LIST_CLASS,
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

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
    unfixAll,
    PROCESSED_ATTR,
  };
})();

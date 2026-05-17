/**
 * Content script: observe page DOM and apply Persian RTL fixes.
 */
(function initPersianRTLContentScript() {
  const STORAGE_KEY = "persianRtlEnabled";
  const DEBOUNCE_MS = 150;

  const site = getActiveSiteConfig();
  const bidiOptions = {
    markdownSelectors: site.markdown,
    ltrBlocksSelector: site.ltrBlocks,
    rtlTextBlocksSelector: site.rtlTextBlocks,
    researchPlanSteps: site.researchPlanSteps,
    researchPlanText: site.researchPlanText,
    researchPlanTitle: site.researchPlanTitle,
  };

  let enabled = true;
  let debounceTimer = null;
  let observer = null;

  function isEnabled() {
    return enabled;
  }

  function processMessages() {
    const messages = queryAllSelectors(site.messages);
    for (const msg of messages) {
      PersianRTL.fixMessageRoot(msg, bidiOptions);
    }
  }

  function processProseRoots() {
    if (!site.proseRoots?.length) return;
    const seen = new Set();
    for (const selector of site.proseRoots) {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          if (seen.has(el)) return;
          if (el.closest("[data-persian-rtl-processed]")) return;
          if (!PersianRTL.containsRTL(el.textContent || "")) return;
          seen.add(el);
          PersianRTL.fixMessageRoot(el, bidiOptions);
        });
      } catch {
        // skip invalid selector
      }
    }
  }

  function processComposers() {
    const composers = queryAllSelectors(site.composer);
    for (const composer of composers) {
      PersianRTL.fixComposer(composer);
    }
  }

  function processOverlays() {
    const overlays = queryAllSelectors(site.overlays);
    for (const overlay of overlays) {
      PersianRTL.fixOverlay(overlay, bidiOptions);
    }
  }

  function processDeepResearch() {
    const explicit = queryAllSelectors(site.deepResearch);
    for (const panel of explicit) {
      PersianRTL.fixDeepResearchPanel(panel, bidiOptions);
    }

    const planCards = PersianRTL.findResearchPlanCards();
    for (const card of planCards) {
      if (card.closest("[data-persian-rtl-processed='deep-research']")) continue;
      PersianRTL.fixDeepResearchPanel(card, bidiOptions);
    }
  }

  function scanAndFix() {
    if (!isEnabled()) return;
    processMessages();
    processProseRoots();
    processComposers();
    processOverlays();
    processDeepResearch();
  }

  function scheduleScan() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      scanAndFix();
    }, DEBOUNCE_MS);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!isEnabled()) return;
      const hasRelevantChange = mutations.some((m) => {
        if (m.type === "characterData") return true;
        if (
          m.type === "childList" &&
          (m.addedNodes.length || m.removedNodes.length)
        ) {
          return true;
        }
        return false;
      });
      if (hasRelevantChange) scheduleScan();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function applyEnabledState(on) {
    enabled = on;
    if (on) {
      scanAndFix();
      startObserver();
    } else {
      stopObserver();
      PersianRTL.unfixAll();
    }
  }

  function loadSettings() {
    chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
      applyEnabledState(result[STORAGE_KEY] !== false);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" && area !== "local") return;
    if (!(STORAGE_KEY in changes)) return;
    applyEnabledState(changes[STORAGE_KEY].newValue !== false);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "getStatus") {
      sendResponse({ enabled: isEnabled(), siteId: site.siteId });
      return true;
    }
    if (message?.type === "rescan") {
      if (isEnabled()) scanAndFix();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadSettings();
    });
  } else {
    loadSettings();
  }
})();

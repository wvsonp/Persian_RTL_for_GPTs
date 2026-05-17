import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));

const chatgptPlanSection = `
<section class="border-token-border-light bg-token-main-surface-primary flex flex-1 flex-col rounded-2xl border p-4">
  <motion.div class="flex items-start justify-between gap-4">
    <motion.div class="min-w-0 flex-1">
      <h2 class="text-token-text-primary text-[17px] font-medium break-words">یک کیلو پنبه یا آهن</h2>
    </motion.div>
    <motion.div class="hidden items-center gap-3 sm:flex">
      <button type="button"><motion.div>Aktualisieren</motion.div></button>
    </motion.div>
  </motion.div>
  <motion.div class="mt-4 flex-1">
    <ul class="space-y-4 text-sm">
      <li class="flex items-start gap-3">
        <motion.div class="mt-[1px] flex h-5 w-5 shrink-0"></motion.div>
        <motion.div class="min-w-0 flex-1">
          <span class="block min-h-[28px] text-[16px] break-words">جمع‌آوری منابع پایه‌ای فیزیک و تعاریف جرم و وزن.</span>
        </motion.div>
      </li>
      <li class="flex items-start gap-3">
        <motion.div class="mt-[1px] flex h-5 w-5 shrink-0"></motion.div>
        <motion.div class="min-w-0 flex-1">
          <span class="block min-h-[28px] text-[16px] break-words">جستجوی مقالات آموزشی و منابع دانشگاهی.</span>
        </motion.div>
      </li>
    </ul>
  </motion.div>
  <motion.div class="mt-4 flex flex-col gap-2">
    <p class="loading-shimmer text-sm">Weighing sources for cotton density...</p>
    <motion.div class="flex flex-row items-center gap-3"><button type="button">Stop</button></motion.div>
  </motion.div>
</section>
`;

const selectorsSrc = readFileSync(join(dir, "selectors.js"), "utf8");
const bidiSrc = readFileSync(join(dir, "bidi.js"), "utf8");
const loadScripts = new Function(
  "document",
  "NodeFilter",
  "location",
  `${selectorsSrc}\n${bidiSrc}\nreturn { PersianRTL, getActiveSiteConfig };`
);

function runSiteTests(siteUrl, bodyExtra, assertions) {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>${bodyExtra}</body></html>`,
    { url: siteUrl }
  );
  globalThis.document = dom.window.document;
  globalThis.NodeFilter = dom.window.NodeFilter;
  globalThis.location = dom.window.location;

  const { PersianRTL, getActiveSiteConfig } = loadScripts(
    document,
    NodeFilter,
    location
  );
  const site = getActiveSiteConfig();
  const bidiOptions = {
    markdownSelectors: site.markdown,
    ltrBlocksSelector: site.ltrBlocks,
    rtlTextBlocksSelector: site.rtlTextBlocks,
    researchPlanSteps: site.researchPlanSteps,
    researchPlanText: site.researchPlanText,
    researchPlanTitle: site.researchPlanTitle,
  };
  assertions({ PersianRTL, site, bidiOptions });
}

runSiteTests(
  "https://chatgpt.com/",
  `<textarea id="prompt-textarea"></textarea>
    <div data-message-author-role="assistant"><div class="markdown"><p>فارسی English</p></motion.div></div>
    ${chatgptPlanSection}`,
  ({ PersianRTL, bidiOptions }) => {

    const section = document.querySelector("section.rounded-2xl");
    if (!PersianRTL.isResearchPlanSection(section)) {
      throw new Error("Should detect ChatGPT research plan section");
    }
    PersianRTL.fixResearchPlanSection(section, bidiOptions);
    if (section.querySelector("h2").getAttribute("dir") !== "rtl") {
      throw new Error("h2 dir");
    }
    PersianRTL.unfixAll();
  }
);

runSiteTests(
  "https://gemini.google.com/app",
  `<div class="conversation-container">
     <motion.div class="user-query-container"><p class="query-text">سلام English</p></motion.div>
     <div class="markdown-main-panel model-response-text"><p>پاسخ فارسی with English</p></div>
   </div>
   <div class="textarea new-input-ui"><p>ورودی</p></div>`,
  ({ PersianRTL, site, bidiOptions }) => {
    if (site.siteId !== "gemini") throw new Error("expected gemini site");
    const composer = document.querySelector(".textarea.new-input-ui > p");
    PersianRTL.fixComposer(composer);
    if (composer.getAttribute("dir") !== "auto") {
      throw new Error("Gemini composer dir=auto");
    }
    const panel = document.querySelector(".markdown-main-panel");
    PersianRTL.fixMessageRoot(panel, bidiOptions);
    if (panel.getAttribute("dir") !== "rtl") {
      throw new Error("Gemini response dir=rtl");
    }
    PersianRTL.unfixAll();
  }
);

runSiteTests(
  "https://www.perplexity.ai/",
  `<textarea id="ask-input"></textarea>
   <main><div class="prose"><p>این پاسخ فارسی با English است.</p></div></main>`,
  ({ PersianRTL, site, bidiOptions }) => {
    if (site.siteId !== "perplexity") throw new Error("expected perplexity site");
    const composer = document.getElementById("ask-input");
    PersianRTL.fixComposer(composer);
    if (composer.getAttribute("dir") !== "auto") {
      throw new Error("Perplexity composer dir=auto");
    }
    const prose = document.querySelector(".prose");
    PersianRTL.fixMessageRoot(prose, bidiOptions);
    if (prose.getAttribute("dir") !== "rtl") {
      throw new Error("Perplexity prose dir=rtl");
    }
    PersianRTL.unfixAll();
  }
);

console.log("All bidi fixture tests passed.");

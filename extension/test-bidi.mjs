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

const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
    <textarea id="prompt-textarea"></textarea>
    <div data-message-author-role="assistant"><motion.div class="markdown"><p>فارسی English</p></motion.div></motion.div>
    ${chatgptPlanSection}
  </body></html>`,
  { url: "https://chatgpt.com/" }
);

const { window } = dom;
globalThis.document = window.document;
globalThis.NodeFilter = window.NodeFilter;

const selectorsSrc = readFileSync(join(dir, "selectors.js"), "utf8");
const bidiSrc = readFileSync(join(dir, "bidi.js"), "utf8");
const loadScripts = new Function(
  "document",
  "NodeFilter",
  `${selectorsSrc}\n${bidiSrc}\nreturn { PersianRTL, PersianRTLSelectors };`
);
const { PersianRTL, PersianRTLSelectors } = loadScripts(
  document,
  NodeFilter
);

const bidiOptions = {
  markdownSelectors: PersianRTLSelectors.markdown,
  ltrBlocksSelector: PersianRTLSelectors.ltrBlocks,
  rtlTextBlocksSelector: PersianRTLSelectors.rtlTextBlocks,
  researchPlanSteps: PersianRTLSelectors.researchPlanSteps,
  researchPlanText: PersianRTLSelectors.researchPlanText,
  researchPlanTitle: PersianRTLSelectors.researchPlanTitle,
};

const section = document.querySelector("section.rounded-2xl");
if (!PersianRTL.isResearchPlanSection(section)) {
  throw new Error("Should detect ChatGPT research plan section");
}

PersianRTL.fixResearchPlanSection(section, bidiOptions);

const h2 = section.querySelector("h2");
const li = section.querySelector("li.flex.items-start");
const span = li.querySelector("span.block");
const status = section.querySelector(".loading-shimmer");

if (section.getAttribute("dir") !== "rtl") throw new Error("section dir");
if (h2.getAttribute("dir") !== "rtl") throw new Error("h2 dir");
if (li.classList.contains("persian-rtl-plan-step") === false) {
  throw new Error("li should have plan-step class");
}
if (span.getAttribute("dir") !== "rtl") throw new Error("span dir");
if (status.getAttribute("dir") !== "ltr") throw new Error("English status stays ltr");

const found = PersianRTL.findResearchPlanCards();
if (!found.includes(section)) throw new Error("findResearchPlanCards should include section");

PersianRTL.unfixAll();
console.log("All bidi fixture tests passed.");

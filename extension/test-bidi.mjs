import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
    <motion.div>
      <textarea id="prompt-textarea"></textarea>
    </motion.div>
    <motion.div>
      <div data-message-author-role="assistant">
        <motion.div class="markdown">
          <p>این یک جمله فارسی با کلمه English در وسط است.</p>
          <pre><code>const x = 1;</code></pre>
        </motion.div>
      </div>
    </motion.div>
    <motion.div role="dialog">
      <motion.div class="prose"><p>تحقیق Deep Research و API test</p></motion.div>
    </motion.div>
    <motion.div class="deep-research-plan">
      <h3>یک کیلو پنبه یا آهن</h3>
      <ul>
        <li><motion.div class="flex flex-row"><span class="icon">○</span><span>جمع‌آوری منابع پایه‌ای فیزیک و تعاریف جرم و وزن.</span></motion.div></li>
        <li><motion.div class="flex flex-row"><span class="icon">○</span><span>مقایسه چگالی و حجم یک کیلوگرم از مواد مختلف.</span></motion.div></li>
      </ul>
      <motion.div class="actions"><button>Bearbeiten</button><button>Starten</button></motion.div>
    </motion.div>
  </body></html>`,
  { url: "https://chatgpt.com/" }
);

const { window } = dom;
globalThis.document = window.document;
globalThis.NodeFilter = window.NodeFilter;
globalThis.chrome = { storage: { sync: { get: () => {} } } };

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

const assistant = document.querySelector(
  '[data-message-author-role="assistant"]'
);
PersianRTL.fixMessageRoot(assistant, {
  markdownSelectors: PersianRTLSelectors.markdown,
  ltrBlocksSelector: PersianRTLSelectors.ltrBlocks,
});

const markdown = assistant.querySelector(".markdown");
const mdDir = markdown.getAttribute("dir");
const bdiCount = markdown.querySelectorAll("bdi[dir='ltr']").length;
const codeDir = markdown.querySelector("code").getAttribute("dir");

if (mdDir !== "rtl") throw new Error(`Expected markdown dir=rtl, got ${mdDir}`);
if (bdiCount < 1) throw new Error(`Expected bdi wraps, got ${bdiCount}`);
if (codeDir !== "ltr") throw new Error(`Expected code dir=ltr, got ${codeDir}`);

const composer = document.getElementById("prompt-textarea");
PersianRTL.fixComposer(composer);
if (composer.getAttribute("dir") !== "auto") {
  throw new Error("Composer should have dir=auto");
}

const dialog = document.querySelector('[role="dialog"]');
PersianRTL.fixOverlay(dialog, {
  markdownSelectors: PersianRTLSelectors.markdown,
  ltrBlocksSelector: PersianRTLSelectors.ltrBlocks,
});
if (dialog.querySelector(".prose").getAttribute("dir") !== "rtl") {
  throw new Error("Overlay prose should be rtl");
}

const planCard = document.querySelector(".deep-research-plan");
PersianRTL.fixDeepResearchPanel(planCard, {
  markdownSelectors: PersianRTLSelectors.markdown,
  ltrBlocksSelector: PersianRTLSelectors.ltrBlocks,
  rtlTextBlocksSelector: PersianRTLSelectors.rtlTextBlocks,
});
const planTitle = planCard.querySelector("h3");
const planLi = planCard.querySelector("li");
if (planCard.getAttribute("dir") !== "rtl") {
  throw new Error("Deep research card should be rtl");
}
if (planTitle.getAttribute("dir") !== "rtl") {
  throw new Error("Deep research title should be rtl");
}
if (planLi.getAttribute("dir") !== "rtl") {
  throw new Error("Deep research list item should be rtl");
}

PersianRTL.unfixAll();
if (document.querySelectorAll("[data-persian-rtl-processed]").length) {
  throw new Error("unfixAll should clear processed markers");
}

console.log("All bidi fixture tests passed.");

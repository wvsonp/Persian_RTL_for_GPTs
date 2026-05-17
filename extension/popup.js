const STORAGE_KEY = "persianRtlEnabled";
const SUPPORTED_HOSTS = ["chatgpt.com", "perplexity.ai"];

const checkbox = document.getElementById("enabled");
const statusEl = document.getElementById("status");

function updateStatus(enabled) {
  statusEl.textContent = enabled
    ? "Enabled on ChatGPT & Perplexity"
    : "Disabled";
  statusEl.classList.toggle("off", !enabled);
}

function isSupportedUrl(url) {
  if (!url) return false;
  return SUPPORTED_HOSTS.some((host) => url.includes(host));
}

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
  const enabled = result[STORAGE_KEY] !== false;
  checkbox.checked = enabled;
  updateStatus(enabled);
});

checkbox.addEventListener("change", () => {
  const enabled = checkbox.checked;
  chrome.storage.sync.set({ [STORAGE_KEY]: enabled }, () => {
    updateStatus(enabled);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id && isSupportedUrl(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { type: "rescan" }).catch(() => {});
      }
    });
  });
});

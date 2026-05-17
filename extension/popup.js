const STORAGE_KEY = "persianRtlEnabled";

const checkbox = document.getElementById("enabled");
const statusEl = document.getElementById("status");

function updateStatus(enabled) {
  statusEl.textContent = enabled
    ? "Enabled on chatgpt.com"
    : "Disabled";
  statusEl.classList.toggle("off", !enabled);
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
      if (tab?.id && tab.url?.startsWith("https://chatgpt.com")) {
        chrome.tabs.sendMessage(tab.id, { type: "rescan" }).catch(() => {});
      }
    });
  });
});

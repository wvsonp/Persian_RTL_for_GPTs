# Persian RTL for GPTs

Chrome extension that fixes mixed **Persian (RTL)** and **English (LTR)** text rendering on [ChatGPT](https://chatgpt.com).

## What it fixes

- **Assistant answers** — correct reading order when Persian and English appear in the same paragraph; lists and quotes align for RTL
- **Prompt / input box** — `dir="auto"` so typing direction follows the text you enter
- **Deep Research** — modals and overlay panels (source picker, report viewer) get the same bidirectional treatment
- **Code blocks** — stay left-to-right inside Persian answers

## Install (development)

1. Clone this repository.
2. Open Chrome → **Extensions** → enable **Developer mode**.
3. Click **Load unpacked** and select the [`extension/`](extension/) folder.
4. Open [https://chatgpt.com](https://chatgpt.com) and start a chat with mixed Persian and English.

## Usage

- The extension runs automatically when it detects Persian/Arabic script.
- Click the toolbar icon to **enable or disable** fixing (preference is saved).

## How it works

- Content script on `https://chatgpt.com/*` only (no other sites in v1).
- Sets `dir="rtl"` on message markdown when RTL script is present.
- Wraps Latin runs (English words, numbers, URLs) in `<bdi dir="ltr">` for inline isolation.
- Forces `pre` / `code` blocks to LTR islands.
- Uses a debounced `MutationObserver` for streaming replies and dynamically opened panels.

## Privacy

- No data collection.
- No network requests.
- Only `storage` permission (on/off toggle).

## Development tests

Automated fixture tests (requires [jsdom](https://github.com/jsdom/jsdom)):

```bash
cd extension
npm install jsdom
node test-bidi.mjs
```

## Roadmap

- Perplexity, Claude, Gemini (shared `bidi.js`, site-specific selectors)
- Firefox build

## License

MIT — see [LICENSE](LICENSE).

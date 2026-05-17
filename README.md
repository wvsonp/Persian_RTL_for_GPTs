# Persian RTL for GPTs

Chrome extension that fixes mixed **Persian (RTL)** and **English (LTR)** text rendering on:

- [ChatGPT](https://chatgpt.com)
- [Perplexity](https://www.perplexity.ai)
- [Google Gemini](https://gemini.google.com)

## What it fixes

- **Answers** — correct reading order when Persian and English appear in the same paragraph
- **Prompt / input box** — `dir="auto"` so typing direction follows your text
- **Research panels** (ChatGPT Deep Research plan cards, Perplexity research UI)
- **Code blocks** — stay left-to-right inside Persian answers

## Install (development)

1. Clone this repository.
2. Open Chrome → **Extensions** → enable **Developer mode**.
3. Click **Load unpacked** and select the [`extension/`](extension/) folder.
4. Open ChatGPT, Perplexity, or Gemini and chat in mixed Persian and English.

## Usage

- Runs automatically when Persian/Arabic script is detected.
- Click the toolbar icon to **enable or disable** (saved across sessions).

## Supported sites

| Site | URL |
|------|-----|
| ChatGPT | `https://chatgpt.com/*` |
| Perplexity | `https://www.perplexity.ai/*`, `https://perplexity.ai/*` |
| Google Gemini | `https://gemini.google.com/*` |

## How it works

- Shared `bidi.js` for RTL detection, `<bdi>` wrapping, and LTR code islands.
- Per-site selectors in `selectors.js` (`getActiveSiteConfig()`).
- Debounced `MutationObserver` for streaming answers and dynamic UI.

## Privacy

- No data collection or network requests.
- Only `storage` permission (on/off toggle).

## Development tests

```bash
cd extension
npm install
npm test
```

## Roadmap

- Claude
- Firefox build

## License

MIT — see [LICENSE](LICENSE).

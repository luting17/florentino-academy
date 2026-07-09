# AI Guest — Cloudflare Worker setup (~15 min, free tier)

The AI Guest module lets staff type their own selling lines and get a live,
scored reaction from a virtual guest (Claude). GitHub Pages is static, so the
Anthropic API key must live in a tiny proxy — this Worker. The key is never
exposed to browsers.

## 1. Create the Worker

1. Sign in / sign up at https://dash.cloudflare.com (free plan is fine).
2. **Workers & Pages → Create → Worker** — name it e.g. `florentino-ai-guest`, deploy the hello-world.
3. Open the Worker → **Edit code** → replace everything with the contents of `worker.js` → **Deploy**.

## 2. Add the API key (secret)

1. Get an Anthropic API key at https://console.anthropic.com (Settings → API keys).
2. Worker → **Settings → Variables and Secrets → Add**:
   - Name: `ANTHROPIC_API_KEY` — Type: **Secret** — Value: your key.
3. (Optional) Add a plaintext variable `ALLOWED_ORIGIN` if the site ever moves.
   Default allowed origin is `https://luting17.github.io`.

## 3. Plug it into the Academy

1. Copy the Worker URL, e.g. `https://florentino-ai-guest.<account>.workers.dev`.
2. In `florentino_training_platform.html`, set:
   `const ROLEPLAY_URL = 'https://florentino-ai-guest.<account>.workers.dev';`
3. Commit & push — the AI Guest card switches from "Soon" to "Play" automatically.

## Cost & safety notes

- Model: `claude-sonnet-4-5`, capped at 500 output tokens per turn; each
  session is 3 turns. A full staff run costs a few cents.
- The Worker only accepts short messages (≤600 chars) from the Academy's
  origin, so the key can't be farmed by third parties.
- To rotate the key: replace the secret in Cloudflare — no site change needed.
- To disable the module: set `ROLEPLAY_URL = ''` — the card shows "Soon" again.

/**
 * Florentino Academy — AI Guest proxy (Cloudflare Worker)
 *
 * Keeps the Anthropic API key secret while letting the static GitHub Pages
 * site call Claude for the roleplay module.
 *
 * Setup: see SETUP.md in this folder.
 * Secret required: ANTHROPIC_API_KEY (wrangler secret / dashboard variable, type "Secret").
 * Optional var: ALLOWED_ORIGIN (default: the Academy's GitHub Pages origin).
 */

const DEFAULT_ORIGIN = 'https://luting17.github.io';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 500;
const MAX_MESSAGES = 12;          // 3 exchanges + margin
const MAX_CHARS_PER_MSG = 600;    // waiters type short lines; blocks abuse

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST')
      return json({ error: 'POST only' }, 405, cors);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400, cors); }

    const { system, messages } = body || {};
    if (typeof system !== 'string' || !Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES)
      return json({ error: 'Bad payload' }, 400, cors);
    for (const m of messages) {
      if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || m.content.length > MAX_CHARS_PER_MSG)
        return json({ error: 'Bad message' }, 400, cors);
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages }),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

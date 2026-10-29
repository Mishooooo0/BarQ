// AI providers for the analyst. Claude-Dev (Claude through the endpoint The Ring's "claude-dev" profile uses) is
// tried first. If it is slow, failing or keeps giving unusable answers, the Ring API (The Ring's own
// OpenAI-compatible endpoint) answers instead. Keys come from the environment and are never stored in the repo.
// Answers are requested as structured output: the Ring API enforces the JSON schema (response_format json_schema);
// Claude-Dev is sent the same schema (output_config) but has ignored it so far, so every answer is also parsed and
// validated here, and rejected if it is not in the language the user chose (English or Arabic). The assistant is
// presented to users as "Barq".
import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

export class AiError extends Error { constructor(status, message) { super(message); this.status = status; } }

const claudeConfig = () => ({
  apiKey: process.env.CLAUDE_DEV_KEY,
  baseURL: process.env.CLAUDE_DEV_BASE_URL || 'https://claudeapikey.dev',
  model: process.env.CLAUDE_DEV_MODEL || 'claude-haiku-4-5',
  // Claude-Dev has had multi-minute delays; past this, the Ring API takes over.
  timeoutMs: Number(process.env.CLAUDE_DEV_TIMEOUT_MS) || 25_000,
});
const ringConfig = () => ({
  apiKey: process.env.RING_CLOUD_KEY,
  baseURL: (process.env.RING_API_BASE_URL || 'https://ring.arc-homlab.com/v1').replace(/\/+$/, ''),
  model: process.env.RING_API_MODEL || 'ring-fast',
  timeoutMs: Number(process.env.RING_API_TIMEOUT_MS) || 60_000,
});
// Long answers (an occasion plan, especially in Arabic) take Claude-Dev about a minute; the Ring API often fails on them
// (HTTP 503 after a minute), so those requests wait longer for Claude-Dev before falling back. All their calls together
// stay within PATIENT_BUDGET_MS, under the app's 3-minute wait (AI_TIMEOUT_MS in src/lib/api.ts), so the server always
// answers first; a call is skipped when less than MIN_CALL_MS is left.
const PATIENT_TIMEOUT_MS = 105_000;
const PATIENT_BUDGET_MS = 165_000;
const MIN_CALL_MS = 10_000;
export const aiStatus = () => {
  const claude = claudeConfig(); const ring = ringConfig();
  return { configured: !!(claude.apiKey || ring.apiKey), model: claude.model, baseURL: claude.baseURL, claude: !!claude.apiKey, fallback: { configured: !!ring.apiKey, model: ring.model, baseURL: ring.baseURL } };
};

let claudeClient = null;
function claude() {
  const { apiKey, baseURL, timeoutMs } = claudeConfig();
  if (!claudeClient || claudeClient.key !== `${apiKey}|${baseURL}|${timeoutMs}`) claudeClient = { key: `${apiKey}|${baseURL}|${timeoutMs}`, sdk: new Anthropic({ apiKey, baseURL, timeout: timeoutMs, maxRetries: 0 }) };
  return claudeClient.sdk;
}

// Claude-Dev's account allows one request at a time, so calls queue here.
let queue = Promise.resolve();
const serialize = task => { const run = queue.then(task, task); queue = run.catch(() => {}); return run; };

export const LANGUAGES = ['English', 'Arabic'];
/** How to write each language. Arabic is warm, everyday Saudi Arabic; the dialect itself is never named to users. */
const VOICE = {
  English: 'Always write every text value in English, even if the data contains Arabic names. Never use Chinese or any other language.',
  Arabic: 'Always write every text value in Arabic, in a warm, everyday Saudi voice as people speak in Riyadh and Najd (words like وش، زين، يمديك، الحين، عشان). Never name or mention the dialect or accent. Keep place names exactly as they appear in the data. Write numbers inside text with Arabic-Indic digits (١٢٣), except the "time" field, which stays HH:MM with Western digits. Never use English sentences, Chinese or any other language.',
};
const system = language => [
  'You are Barq, the AI analyst inside the barq banking app in Saudi Arabia: a friendly personal finance assistant. Amounts are in Saudi riyals (SAR).',
  VOICE[language],
  'You are a JSON API. You have no tools: never search the web or call any tool. Use only the data in the user message.',
  'Reply with exactly one JSON object that matches the schema in the message, and nothing else: no prose, no markdown fences.',
].join(' ');

/** Scripts that are never right: Cyrillic, Thai, Japanese, Chinese and Korean. */
const FOREIGN = /[\u0400-\u04ff\u0e00-\u0e7f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/;
const textValues = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(textValues) : [];
/** Arabic is allowed in English replies because place names from the database use it. */
export const isEnglish = value => !FOREIGN.test(JSON.stringify(value));
/** An Arabic reply is mostly Arabic letters (place and brand names may add some Latin ones). */
export function isArabicReply(value) {
  const text = textValues(value).join(' ');
  if (FOREIGN.test(text)) return false;
  const arabic = (text.match(/[\u0600-\u06ff]/g) ?? []).length; const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > 0 && arabic >= latin;
}
const inLanguage = (value, language) => language === 'Arabic' ? isArabicReply(value) : isEnglish(value);
const schemaName = task => task.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'answer';

/** Extracts the first top-level JSON object from a model reply. */
export function parseJsonObject(text) {
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { const value = JSON.parse(text.slice(start, end + 1)); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
  catch { return null; }
}

/** One Claude-Dev request; returns the reply text. Transport failures throw AiError. */
async function askClaude(prompt, schema, task, language, limitMs) {
  const { model } = claudeConfig();
  let response;
  try { response = await claude().messages.create({ model, max_tokens: 2000, system: system(language), messages: [{ role: 'user', content: prompt }], output_config: { format: { type: 'json_schema', schema } } }, { timeout: limitMs }); }
  catch (error) {
    if (error instanceof Anthropic.APIConnectionTimeoutError) throw new AiError(504, 'Claude-Dev took too long to answer.');
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new AiError(502, 'Claude-Dev rejected the API key.');
    if (error instanceof Anthropic.RateLimitError) throw new AiError(503, 'Claude-Dev is busy.');
    if (error instanceof Anthropic.APIConnectionError) throw new AiError(503, "Can't reach Claude-Dev.");
    if (error instanceof Anthropic.APIError) throw new AiError(502, `Claude-Dev returned an error (${error.status ?? 'unknown'}).`);
    throw new AiError(502, 'Claude-Dev could not answer.');
  }
  if (response.stop_reason === 'refusal') throw new AiError(502, 'Claude-Dev declined this request.');
  return { text: response.content.filter(block => block.type === 'text').map(block => block.text).join('\n'), toolUse: response.stop_reason === 'tool_use' };
}

/** One Ring API request (OpenAI chat completions, as The Ring's provider uses it) with an enforced JSON schema. */
async function askRing(prompt, schema, task, language, limitMs) {
  const { apiKey, baseURL, model } = ringConfig();
  let response;
  try {
    response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(limitMs),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, stream: false, response_format: { type: 'json_schema', json_schema: { name: schemaName(task), strict: true, schema } }, messages: [{ role: 'system', content: system(language) }, { role: 'user', content: prompt }] }),
    });
  } catch (error) {
    throw new AiError(error?.name === 'TimeoutError' ? 504 : 503, error?.name === 'TimeoutError' ? 'The Ring API took too long to answer.' : "Can't reach the Ring API.");
  }
  if (response.status === 401 || response.status === 403) throw new AiError(502, 'The Ring API rejected the API key.');
  if (!response.ok) throw new AiError(502, `The Ring API returned an error (${response.status}).`);
  let body;
  try { body = await response.json(); } catch { throw new AiError(502, 'The Ring API sent an unreadable answer.'); }
  const content = body?.choices?.[0]?.message?.content;
  return { text: typeof content === 'string' ? content : '', toolUse: false };
}

/**
 * Asks one provider, retrying once if the reply is not usable JSON in the chosen language. `limit()` gives each call its
 * time limit, or null when there is no time left for it. Returns the validated value or throws.
 */
async function attempt(ask, name, prompt, schema, task, validate, language, limit) {
  let problem = 'no JSON object in the reply';
  for (let i = 0; i < 2; i++) {
    const limitMs = limit();
    if (limitMs == null) {
      if (i === 0) throw new AiError(504, `${name} took too long to answer (no time was left to ask it).`);
      break;
    }
    if (i === 1) console.warn(`[barq ai] ${task}: asking ${name} again, the answer was unusable (${problem}).`);
    const { text, toolUse } = await ask(i === 0 ? prompt : `${prompt}\n\nYour previous reply was unusable (${problem}). Reply with only the JSON object, in ${language}.`, schema, task, language, limitMs);
    const value = parseJsonObject(text);
    if (!value) { problem = toolUse ? 'it tried to call a tool' : 'no JSON object in the reply'; }
    else if (!inLanguage(value, language)) problem = `it was not in ${language}`;
    else {
      try { return validate(value); }
      catch (error) { problem = error.message; }
    }
  }
  throw new AiError(502, `unusable answer (${problem})`);
}

/** The user-facing part of a provider problem, without engine names (users only know the assistant as Barq). */
function userReason(problem) {
  if (/took too long/.test(problem)) return 'it took too long';
  if (/busy/.test(problem)) return 'it is busy';
  if (/reach/.test(problem)) return 'it could not be reached';
  const unusable = problem.match(/unusable answer \((.*)\)/);
  return unusable ? `its answer was unusable: ${unusable[1]}` : 'it returned an error';
}

/**
 * Asks for a JSON object. `task` names the job, `instructions` and `data` describe it, `schema` is shown to the model,
 * `language` ("English" or "Arabic") is the language of every text value, `patient` gives a long answer more time on
 * Claude-Dev (within a total time budget) before the Ring API is tried, and `validate(object)` must return the cleaned
 * result or throw. Returns `{ value, provider }` where provider is
 * "claude" or "ring", and `fallbackReason` when the Ring API answered because Claude-Dev did not.
 */
export function askJson({ task, instructions, data, schema, validate, language = 'English', patient = false }) {
  if (!LANGUAGES.includes(language)) language = 'English';
  // The budget starts now, so time spent waiting in the queue counts too.
  const deadline = patient ? Date.now() + PATIENT_BUDGET_MS : Infinity;
  const within = ms => { const left = deadline - Date.now(); return left === Infinity ? ms : left < MIN_CALL_MS ? null : Math.min(ms, left); };
  const claudeLimit = () => within(patient ? Math.max(claudeConfig().timeoutMs, PATIENT_TIMEOUT_MS) : claudeConfig().timeoutMs);
  const ringLimit = () => within(ringConfig().timeoutMs);
  return serialize(async () => {
    const hasClaude = !!claudeConfig().apiKey; const hasRing = !!ringConfig().apiKey;
    if (!hasClaude && !hasRing) {
      console.warn('[barq ai] Not connected: set CLAUDE_DEV_KEY (and optionally RING_CLOUD_KEY for the Ring API fallback), then restart the server.');
      throw new AiError(503, 'Barq AI is not connected yet. Ask the app owner to add the AI keys (CLAUDE_DEV_KEY).');
    }
    // Claude-Dev returns its earlier reply for an identical prompt, including a broken one (it sometimes cuts the start
    // off long Arabic replies). A request id makes every request, and every retry, a fresh answer.
    const prompt = `TASK: ${task}\nREQUEST: ${randomUUID()}\n${instructions}\nWrite every text value in ${language}.\n\nJSON schema of your reply:\n${JSON.stringify(schema)}\n\nDATA:\n${JSON.stringify({ language, ...data })}`;
    let claudeProblem = 'Claude-Dev is not configured.';
    if (hasClaude) {
      try { return { value: await attempt(askClaude, 'Claude-Dev', prompt, schema, task, validate, language, claudeLimit), provider: 'claude' }; }
      catch (error) {
        if (!(error instanceof AiError)) throw error;
        claudeProblem = error.message.startsWith('unusable') ? `Claude-Dev gave an ${error.message}.` : error.message;
        if (!hasRing) { console.warn(`[barq ai] ${claudeProblem}`); throw new AiError(error.status, `Barq AI could not answer right now (${userReason(claudeProblem)}). Please try again.`); }
        console.warn(`[barq ai] ${claudeProblem} Using the Ring API instead.`);
      }
    }
    try { return { value: await attempt(askRing, 'The Ring API', prompt, schema, task, validate, language, ringLimit), provider: 'ring', fallbackReason: claudeProblem }; }
    catch (error) {
      if (!(error instanceof AiError)) throw error;
      const ringProblem = error.message.startsWith('unusable') ? `The Ring API gave an ${error.message}.` : error.message;
      console.warn(`[barq ai] ${hasClaude ? `${claudeProblem} ` : ''}${ringProblem}`);
      throw new AiError(error.status, `Barq AI could not answer right now (${userReason(ringProblem)}). Please try again.`);
    }
  });
}

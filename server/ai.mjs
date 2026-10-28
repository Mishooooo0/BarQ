// AI providers for the analyst. Claude-Dev (Claude through the endpoint The Ring's "claude-dev" profile uses) is
// tried first. If it is slow, failing or keeps giving unusable answers, the Ring API (The Ring's own
// OpenAI-compatible endpoint) answers instead. Keys come from the environment and are never stored in the repo.
// Answers are requested as structured output: the Ring API enforces the JSON schema (response_format json_schema);
// Claude-Dev is sent the same schema (output_config) but has ignored it so far, so every answer is also parsed and
// validated here, and rejected if it is not in English. The assistant is presented to users as "Barq".
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

const SYSTEM = [
  'You are Barq, the AI analyst inside the barq banking app in Saudi Arabia: a friendly personal finance assistant. Amounts are in Saudi riyals (SAR).',
  'Always write every text value in English, even if the data contains Arabic names. Never use Chinese or any other language.',
  'You are a JSON API. You have no tools: never search the web or call any tool. Use only the data in the user message.',
  'Reply with exactly one JSON object that matches the schema in the message, and nothing else: no prose, no markdown fences.',
].join(' ');

/** Scripts that mean the reply is not in English. Arabic is allowed because place names from the database use it. */
const NOT_ENGLISH = /[\u0400-\u04ff\u0e00-\u0e7f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/;
export const isEnglish = value => !NOT_ENGLISH.test(JSON.stringify(value));
const schemaName = task => task.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'answer';

/** Extracts the first top-level JSON object from a model reply. */
export function parseJsonObject(text) {
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { const value = JSON.parse(text.slice(start, end + 1)); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
  catch { return null; }
}

/** One Claude-Dev request; returns the reply text. Transport failures throw AiError. */
async function askClaude(prompt, schema) {
  const { model } = claudeConfig();
  let response;
  try { response = await claude().messages.create({ model, max_tokens: 2000, system: SYSTEM, messages: [{ role: 'user', content: prompt }], output_config: { format: { type: 'json_schema', schema } } }); }
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
async function askRing(prompt, schema, task) {
  const { apiKey, baseURL, model, timeoutMs } = ringConfig();
  let response;
  try {
    response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, stream: false, response_format: { type: 'json_schema', json_schema: { name: schemaName(task), strict: true, schema } }, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }] }),
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

/** Asks one provider, retrying once if the reply is not usable English JSON. Returns the validated value or throws. */
async function attempt(ask, prompt, schema, task, validate) {
  let problem = 'no JSON object in the reply';
  for (let i = 0; i < 2; i++) {
    const { text, toolUse } = await ask(i === 0 ? prompt : `${prompt}\n\nYour previous reply was unusable (${problem}). Reply with only the JSON object, in English.`, schema, task);
    const value = parseJsonObject(text);
    if (!value) { problem = toolUse ? 'it tried to call a tool' : 'no JSON object in the reply'; continue; }
    if (!isEnglish(value)) { problem = 'it was not in English'; continue; }
    try { return validate(value); }
    catch (error) { problem = error.message; }
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
 * and `validate(object)` must return the cleaned result or throw. Returns `{ value, provider }` where provider is
 * "claude" or "ring", and `fallbackReason` when the Ring API answered because Claude-Dev did not.
 */
export function askJson({ task, instructions, data, schema, validate }) {
  return serialize(async () => {
    const hasClaude = !!claudeConfig().apiKey; const hasRing = !!ringConfig().apiKey;
    if (!hasClaude && !hasRing) {
      console.warn('[barq ai] Not connected: set CLAUDE_DEV_KEY (and optionally RING_CLOUD_KEY for the Ring API fallback), then restart the server.');
      throw new AiError(503, 'Barq AI is not connected yet. Ask the app owner to add the AI keys (CLAUDE_DEV_KEY).');
    }
    const prompt = `TASK: ${task}\n${instructions}\nWrite every text value in English.\n\nJSON schema of your reply:\n${JSON.stringify(schema)}\n\nDATA:\n${JSON.stringify({ language: 'English', ...data })}`;
    let claudeProblem = 'Claude-Dev is not configured.';
    if (hasClaude) {
      try { return { value: await attempt(askClaude, prompt, schema, task, validate), provider: 'claude' }; }
      catch (error) {
        if (!(error instanceof AiError)) throw error;
        claudeProblem = error.message.startsWith('unusable') ? `Claude-Dev gave an ${error.message}.` : error.message;
        if (!hasRing) { console.warn(`[barq ai] ${claudeProblem}`); throw new AiError(error.status, `Barq AI could not answer right now (${userReason(claudeProblem)}). Please try again.`); }
        console.warn(`[barq ai] ${claudeProblem} Using the Ring API instead.`);
      }
    }
    try { return { value: await attempt(askRing, prompt, schema, task, validate), provider: 'ring', fallbackReason: claudeProblem }; }
    catch (error) {
      if (!(error instanceof AiError)) throw error;
      const ringProblem = error.message.startsWith('unusable') ? `The Ring API gave an ${error.message}.` : error.message;
      console.warn(`[barq ai] ${hasClaude ? `${claudeProblem} ` : ''}${ringProblem}`);
      throw new AiError(error.status, `Barq AI could not answer right now (${userReason(ringProblem)}). Please try again.`);
    }
  });
}

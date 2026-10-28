// Claude-Dev endpoint (the same one The Ring's "claude-dev" profile uses). The key is read from the CLAUDE_DEV_KEY
// environment variable and never stored in the repo. This proxy ignores `output_config` and replaces client tools
// with its own, so structured output is requested in the prompt and every answer is parsed and validated here.
import Anthropic from '@anthropic-ai/sdk';

export class AiError extends Error { constructor(status, message) { super(message); this.status = status; } }

const config = () => ({
  apiKey: process.env.CLAUDE_DEV_KEY,
  baseURL: process.env.CLAUDE_DEV_BASE_URL || 'https://claudeapikey.dev',
  model: process.env.CLAUDE_DEV_MODEL || 'claude-haiku-4-5',
});
let cached = null;
function client() {
  const { apiKey, baseURL } = config();
  if (!apiKey) throw new AiError(503, 'The AI Analyst is not connected: set the CLAUDE_DEV_KEY environment variable and restart the server.');
  if (!cached || cached.apiKey !== apiKey || cached.baseURL !== baseURL) cached = { apiKey, baseURL, sdk: new Anthropic({ apiKey, baseURL, timeout: 120_000, maxRetries: 1 }) };
  return cached.sdk;
}
export const aiStatus = () => ({ configured: !!config().apiKey, model: config().model, baseURL: config().baseURL });

// The account behind the endpoint allows one request at a time, so calls queue here.
let queue = Promise.resolve();
const serialize = task => { const run = queue.then(task, task); queue = run.catch(() => {}); return run; };

const SYSTEM = [
  'You are the BarQ AI Analyst, a friendly personal finance assistant inside a Saudi banking app. Amounts are in Saudi riyals (SAR).',
  'You are a JSON API. You have no tools: never search the web or call any tool. Use only the data in the user message.',
  'Reply with exactly one JSON object that matches the schema in the message, and nothing else: no prose, no markdown fences.',
].join(' ');

/** Extracts the first top-level JSON object from a model reply. */
export function parseJsonObject(text) {
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { const value = JSON.parse(text.slice(start, end + 1)); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
  catch { return null; }
}

function explain(error) {
  if (error instanceof AiError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return new AiError(502, 'The Claude-Dev endpoint rejected the API key.');
  if (error instanceof Anthropic.RateLimitError) return new AiError(503, 'The AI Analyst is busy right now. Try again in a moment.');
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new AiError(504, 'The AI Analyst took too long to answer. Please try again.');
  if (error instanceof Anthropic.APIConnectionError) return new AiError(503, "Can't reach the Claude-Dev endpoint. Check the internet connection and try again.");
  if (error instanceof Anthropic.APIError) return new AiError(502, `The Claude-Dev endpoint returned an error (${error.status ?? 'unknown'}).`);
  return new AiError(502, 'The AI Analyst could not answer. Please try again.');
}

/**
 * Asks Claude for a JSON object. `task` names the job, `instructions` and `data` describe it, `schema` is shown to
 * the model, and `validate(object)` must return the cleaned result or throw. One retry on an unusable reply.
 */
export function askJson({ task, instructions, data, schema, validate, maxTokens = 2000 }) {
  return serialize(async () => {
    const sdk = client(); const { model } = config();
    const prompt = `TASK: ${task}\n${instructions}\n\nJSON schema of your reply:\n${JSON.stringify(schema)}\n\nDATA:\n${JSON.stringify(data)}`;
    let lastProblem = 'no JSON object in the reply';
    for (let attempt = 0; attempt < 2; attempt++) {
      let response;
      try {
        response = await sdk.messages.create({
          model, max_tokens: maxTokens, system: SYSTEM,
          messages: [{ role: 'user', content: attempt === 0 ? prompt : `${prompt}\n\nYour previous reply was unusable (${lastProblem}). Reply with only the JSON object.` }],
        });
      } catch (error) { throw explain(error); }
      if (response.stop_reason === 'refusal') throw new AiError(502, 'The AI Analyst declined this request.');
      const text = response.content.filter(block => block.type === 'text').map(block => block.text).join('\n');
      const value = parseJsonObject(text);
      if (!value) { lastProblem = response.stop_reason === 'tool_use' ? 'it tried to call a tool' : 'no JSON object in the reply'; continue; }
      try { return validate(value); }
      catch (error) { lastProblem = error.message; }
    }
    throw new AiError(502, `The AI Analyst gave an unusable answer (${lastProblem}). Please try again.`);
  });
}

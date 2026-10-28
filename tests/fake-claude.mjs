// A stand-in for the Claude-Dev endpoint used by the tests, so they never spend credits or wait on the network.
// It answers POST /v1/messages like the Messages API, choosing from the options in the prompt's DATA block.
// Budget 77 answers with junk first (to test the retry); budget 88 always names an unknown place.
import http from 'node:http';

function answer(prompt) {
  const task = prompt.match(/^TASK: (\S+)/)?.[1];
  const data = JSON.parse(prompt.slice(prompt.indexOf('DATA:\n') + 6).split('\n\nYour previous reply')[0]);
  const retry = prompt.includes('Your previous reply was unusable');
  if (task === 'advice') return { headline: `Fake advice for ${data.name}`, tips: ['Cut one cafe visit a week.', 'Netflix renews soon.'], pose: 'thumbs' };
  const budget = data.budget ?? data.perPersonBudget;
  if (budget === 77 && !retry) return 'Sure! Here is your plan: coffee then lunch.';
  if (budget === 88) return { message: 'Plan', pose: 'idea', items: [{ time: '10:00', label: 'Coffee', category: 'cafe', placeId: 'no-such-place' }] };
  const order = task === 'daily-plan' ? [['cafe', '09:00', 'Morning coffee'], ['food', '13:30', 'Lunch']] : [['food', '19:30', 'Dinner'], ['cafe', '21:30', 'Coffee after']];
  const items = []; let left = budget;
  if (task === 'daily-plan' && budget >= 60) { items.push({ time: '08:30', label: 'Rides', category: 'transportation', placeId: null }); left -= 25; }
  for (const [category, time, label] of order) {
    const option = (data.options[category] ?? []).find(o => o.cost <= left);
    if (option) { items.push({ time, label, category, placeId: option.placeId }); left -= option.cost; }
  }
  return { message: items.length ? `Fake plan for SAR ${budget}.` : 'Nothing fits, try a no-spend day.', pose: items.length ? 'idea' : 'piggy', items };
}

export function startFakeClaude(port = 0) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
      if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"type":"error","error":{"type":"not_found_error","message":"not found"}}'); }
      const request = JSON.parse(body);
      const prompt = request.messages.at(-1).content;
      const value = answer(typeof prompt === 'string' ? prompt : prompt.map(p => p.text).join(''));
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: `msg_fake_${Date.now()}`, type: 'message', role: 'assistant', model: request.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }));
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/tests/fake-claude.mjs')) {
  const server = await startFakeClaude(Number(process.env.FAKE_CLAUDE_PORT || 5175));
  console.log(`Fake Claude listening on http://127.0.0.1:${server.address().port}`);
}

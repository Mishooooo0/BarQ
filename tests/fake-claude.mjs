// A stand-in for the AI endpoints used by the tests, so they never spend credits or wait on the network.
// POST /v1/messages answers like Claude-Dev (Messages API); POST /ring/v1/chat/completions answers like the Ring API
// (OpenAI chat completions). Both choose from the options in the prompt's DATA block.
// Budget 77 answers with junk first (to test the retry); budget 88 always names an unknown place;
// budget 99 makes a day or hangout plan take 3 seconds on Claude-Dev (to test the Ring API fallback); budget 66 replies in Chinese first;
// budget 55 replies in English first when Arabic was asked for. Requests must name their language (English or Arabic) and carry
// a JSON schema (output_config for Claude-Dev, response_format for the Ring API). Arabic requests get Arabic answers.
import http from 'node:http';

function answer(prompt) {
  const task = prompt.match(/^TASK: (\S+)/)?.[1];
  const data = JSON.parse(prompt.slice(prompt.indexOf('DATA:\n') + 6).split('\n\nYour previous reply')[0]);
  const retry = prompt.includes('Your previous reply was unusable');
  const arabic = data.language === 'Arabic';
  // Occasion plans deliberately add up to 110% of what is available, to test that the server scales them down.
  if (task === 'occasion-plan') return arabic
    ? { message: `خطة تجريبية لـ${data.occasionInArabic}.`, pose: 'thumbs', lines: [['ملابس', 0.5], ['أكل', 0.3], ['هدايا', 0.3]].map(([label, share]) => ({ label, amount: Math.round(data.available * share), note: null })), tips: ['اشتر الملابس بدري.'], saving: { perDay: data.savingPlan.perDay + 1, perMonth: data.savingPlan.perMonth + 1, tip: 'حطها في الحصّالة أول ما ينزل الراتب.' } }
    : { message: `Fake plan for ${data.occasion}.`, pose: 'thumbs', lines: [['Clothes', 0.5], ['Food', 0.3], ['Gifts', 0.3]].map(([label, share]) => ({ label, amount: Math.round(data.available * share), note: null })), tips: ['Buy the clothes early.'], saving: { perDay: data.savingPlan.perDay + 1, perMonth: data.savingPlan.perMonth + 1, tip: 'Move it to the Saving box on payday.' } };
  if (task === 'advice') return arabic
    ? { headline: `نصيحة تجريبية لـ${data.name}`, tips: ['خفّف زيارة كوفي وحدة بالأسبوع.', 'اشتراك نتفلكس يتجدد قريب.'], pose: 'thumbs' }
    : { headline: `Fake advice for ${data.name}`, tips: ['Cut one cafe visit a week.', 'Netflix renews soon.'], pose: 'thumbs' };
  const budget = data.budget ?? data.perPersonBudget;
  if (budget === 55 && arabic && !retry) return { message: 'Here is your plan in English.', pose: 'idea', items: [] };
  if (budget === 77 && !retry) return 'Sure! Here is your plan: coffee then lunch.';
  if (budget === 66 && !retry) return { message: '这是你的计划', pose: 'idea', items: [] };
  if (budget === 88) return { message: 'Plan', pose: 'idea', items: [{ time: '10:00', label: 'Coffee', category: 'cafe', placeId: 'no-such-place' }] };
  const order = task === 'daily-plan' ? [['cafe', '09:00', arabic ? 'قهوة الصبح' : 'Morning coffee'], ['food', '13:30', arabic ? 'الغدا' : 'Lunch']] : [['food', '19:30', arabic ? 'العشا' : 'Dinner'], ['cafe', '21:30', arabic ? 'قهوة بعدها' : 'Coffee after']];
  const items = []; let left = budget;
  if (task === 'daily-plan' && budget >= 60) { items.push({ time: '08:30', label: arabic ? 'مشاوير' : 'Rides', category: 'transportation', placeId: null }); left -= 25; }
  for (const [category, time, label] of order) {
    const option = (data.options[category] ?? []).find(o => o.cost <= left);
    if (option) { items.push({ time, label, category, placeId: option.placeId }); left -= option.cost; }
  }
  if (arabic) return { message: items.length ? `خطة تجريبية بميزانية ${budget} ريال.` : 'ما فيه شي يناسب، خلها يوم بدون صرف.', pose: items.length ? 'idea' : 'thumbs', items };
  return { message: items.length ? `Fake plan for SAR ${budget}.` : 'Nothing fits, try a no-spend day.', pose: items.length ? 'idea' : 'thumbs', items };
}

export function startFakeClaude(port = 0) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
      const ring = req.url === '/ring/v1/chat/completions';
      if (req.method !== 'POST' || !(ring || req.url.endsWith('/v1/messages'))) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"type":"error","error":{"type":"not_found_error","message":"not found"}}'); }
      const request = JSON.parse(body);
      const prompt = request.messages.at(-1).content;
      const promptText = typeof prompt === 'string' ? prompt : prompt.map(p => p.text).join('');
      const structured = ring ? request.response_format?.type === 'json_schema' && request.response_format.json_schema?.schema : request.output_config?.format?.type === 'json_schema' && request.output_config.format.schema;
      if (!structured || !/"language":"(English|Arabic)"/.test(promptText)) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":"missing structured output or language"}'); }
      const value = answer(promptText);
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      const reply = () => {
        if (res.destroyed) return;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(ring
          ? { id: `chatcmpl_fake_${Date.now()}`, object: 'chat.completion', model: request.model, choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }] }
          : { id: `msg_fake_${Date.now()}`, type: 'message', role: 'assistant', model: request.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }));
      };
      if (!ring && !promptText.startsWith('TASK: occasion-plan') && /"(budget|perPersonBudget)":99[,}]/.test(promptText)) setTimeout(reply, 3000); else reply();
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/tests/fake-claude.mjs')) {
  const server = await startFakeClaude(Number(process.env.FAKE_CLAUDE_PORT || 5175));
  console.log(`Fake Claude listening on http://127.0.0.1:${server.address().port}`);
}

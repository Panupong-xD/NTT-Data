import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DYNAMODB_TABLE = 'test';
process.env.AI_ENABLED = 'true';
process.env.BEDROCK_MODEL = 'amazon.nova-micro-v1:0';
const { handler } = await import('../dist/handler.js');
const { docClient } = await import('../dist/db.js');
const { bedrock } = await import('../dist/chatHandler.js');
const { thaiDay, updateDay, readFoodSummary } = await import('../dist/memoryHandler.js');
const { contextPacket } = await import('../dist/agent.js');
let store, calls, modelCalls;
const key = k => `${k.PK}|${k.SK}`;
const patient = { entityId: 'P-1', role: 'patient', patientIds: ['P-1'], name: 'Patient', email: 'patient@example.test' };
const doctor = { ...patient, entityId: 'D-1', role: 'doctor' };
const caregiver = { ...patient, entityId: 'C-1', role: 'caregiver' };
function put(PK, SK, value) { store.set(key({ PK, SK }), { PK, SK, ...value }); }
function reset() {
  store = new Map(); calls = []; modelCalls = [];
  put('USER#p', 'PROFILE', patient); put('USER#d', 'PROFILE', doctor); put('USER#c', 'PROFILE', caregiver);
  put('PATIENT#P-1', 'PROFILE', { id: 'P-1', name: 'DO_NOT_SEND_NAME', diagnosis: ['example'], medications: ['current medicine'], allergies: ['example allergy'], doctorId: 'D-1', version: 1 });
  docClient.send = async command => {
    calls.push(command);
    const x = command.input;
    if (command.constructor.name === 'GetCommand') return { Item: structuredClone(store.get(key(x.Key))) };
    if (command.constructor.name === 'QueryCommand') {
      const v = x.ExpressionAttributeValues;
      let rows = [...store.values()].filter(r => r.PK === v[':pk'] && (!v[':prefix'] || r.SK.startsWith(v[':prefix'])) && (!v[':start'] || r.SK >= v[':start'] && r.SK <= v[':end']));
      rows.sort((a,b) => x.ScanIndexForward === false ? b.SK.localeCompare(a.SK) : a.SK.localeCompare(b.SK));
      if (x.ExclusiveStartKey) rows = rows.slice(rows.findIndex(r => key(r) === key(x.ExclusiveStartKey)) + 1);
      const more = rows.length > x.Limit; rows = rows.slice(0, x.Limit);
      return { Items: structuredClone(rows), LastEvaluatedKey: more ? { PK: rows.at(-1).PK, SK: rows.at(-1).SK } : undefined };
    }
    if (command.constructor.name === 'TransactWriteCommand') {
      for (const entry of x.TransactItems) {
        const op = entry.Put || entry.Delete || entry.Update || entry.ConditionCheck;
        const current = store.get(key(op.Item || op.Key));
        const values = op.ExpressionAttributeValues || {};
        const condition = op.ConditionExpression || '';
        const invalid = condition === 'attribute_not_exists(PK)' && current || condition === '#v = :v' && current?.version !== values[':v'] || condition === '#s = :s' && current?.status !== values[':s'] || condition.includes('activeCases < :max') && (current?.activeCases || 0) >= values[':max'];
        if (invalid) throw Object.assign(new Error('conflict'), { name: 'TransactionCanceledException' });
      }
      for (const entry of x.TransactItems) {
        if (entry.Put) store.set(key(entry.Put.Item), structuredClone(entry.Put.Item));
        else if (entry.Delete) store.delete(key(entry.Delete.Key));
        else if (entry.Update) {
          const op = entry.Update;
          const old = structuredClone(store.get(key(op.Key)) || { ...op.Key });
          if (op.Key.PK.startsWith('MEMORY#')) {
            old.revision = (old.revision || 0) + 1;
            if (op.UpdateExpression.includes('ADD activeIds')) { old.activeCases = (old.activeCases || 0) + 1; old.activeIds ||= new Set(); for (const id of op.ExpressionAttributeValues[':ids']) old.activeIds.add(id); }
            if (op.UpdateExpression.includes('DELETE activeIds')) { old.activeCases--; for (const id of op.ExpressionAttributeValues[':ids']) old.activeIds.delete(id); }
          }
          store.set(key(op.Key), old);
        }
      }
      return {};
    }
    if (command.constructor.name === 'PutCommand') { store.set(key(x.Item), structuredClone(x.Item)); return {}; }
    throw new Error(`Unmocked ${command.constructor.name}`);
  };
  bedrock.send = async command => { modelCalls.push(command); return { output: { message: { role: 'assistant', content: [{ text: 'คำตอบจากข้อมูลที่บันทึก' }] } }, usage: { inputTokens: 120, outputTokens: 30 }, stopReason: 'end_turn' }; };
}
const event = (path, method = 'GET', body, sub = 'p', queryStringParameters) => ({ rawPath: path, requestContext: { requestId: 'memory-test', http: { method }, authorizer: { jwt: { claims: { sub, token_use: 'access' } } } }, body: body === undefined ? undefined : JSON.stringify(body), queryStringParameters });
async function request(path, method, body, sub, query) { const result = await handler(event(path, method, body, sub, query)); return { status: result.statusCode, data: JSON.parse(result.body) }; }
const nutrition = { calories: 500, protein: 20, carbs: 60, fat: 15, sugar: null, sodium: null };
const meal = (id = 'm1') => ({ id, patientId: 'P-1', eatenAt: new Date().toISOString(), mealType: 'lunch', name: 'ข้าวและผัก', portion: 'ตามภาพ', source: 'image-estimate', nutrition: { ...nutrition } });
const create = m => request('/api/meals', 'POST', { action: 'save', meal: m, expectedVersion: 0 });
const getContext = (sub = 'p') => request('/api/patient-context', 'GET', undefined, sub, { patientId: 'P-1' });

test('meal confirmation is idempotent and commits the meal, summary and revision together', async () => {
  reset(); const m = meal();
  assert.equal((await create(m)).status, 200);
  const first = (await getContext()).data;
  assert.equal(first.food.week.recordedMeals, 1);
  assert.equal(first.food.week.recordedDays, 1);
  assert.equal(first.food.week.estimatedTotals.sodium, null);
  assert.equal(first.food.week.mealsWithEstimate.sodium, 0);
  assert.deepEqual(first.food.week.topFoods, [{ name: m.name, count: 1 }]);
  assert.equal((await create(m)).data.duplicate, true);
  const again = (await getContext()).data;
  assert.equal(again.food.week.recordedMeals, 1); assert.equal(again.revision, first.revision);
  const write = calls.find(c => c.input.TransactItems?.some(t => t.Put?.Item.PK === 'MEALS#P-1'));
  assert.equal(write.input.TransactItems.length, 3);
  assert.equal((await create({ ...m, name: 'different' })).status, 409);
});

test('editing/deleting updates only the original contribution and invalidates context', async () => {
  reset(); const m = meal(); const second = meal('m2');
  const saved = (await create(m)).data.meal; await create(second);
  const before = (await getContext()).data;
  const changed = { ...m, nutrition: { ...nutrition, calories: 200 } };
  assert.equal((await request('/api/meals', 'POST', { action: 'save', meal: changed, expectedVersion: saved.version })).status, 200);
  const after = (await getContext()).data;
  assert.equal(after.food.week.estimatedTotals.calories, 700); assert.notEqual(before.revision, after.revision);
  assert.equal((await request('/api/meals', 'POST', { action: 'save', meal: changed, expectedVersion: 1 })).status, 409);
  assert.equal((await request('/api/meals', 'POST', { action: 'delete', patientId: 'P-1', day: saved.day, id: saved.id, expectedVersion: 2 })).status, 200);
  const removed = (await getContext()).data;
  assert.equal(removed.food.week.recordedMeals, 1); assert.equal(removed.food.week.estimatedTotals.calories, 500);
});

test('a concurrent daily update does not commit half a meal transaction', async () => {
  reset(); const send = docClient.send;
  docClient.send = async c => {
    if (c.constructor.name === 'TransactWriteCommand' && c.input.TransactItems.some(t => t.Put?.Item.PK === 'MEALS#P-1')) throw Object.assign(new Error(), { name: 'TransactionCanceledException' });
    return send(c);
  };
  assert.equal((await create(meal())).status, 409);
  assert.equal([...store.keys()].some(k => k.startsWith('MEALS#')), false);
});

test('meal, preference and context endpoints enforce ownership and clinical consent', async () => {
  reset();
  assert.equal((await create({ ...meal(), patientId: 'P-2' })).status, 403);
  assert.equal((await request('/api/meals', 'POST', { action: 'save', meal: meal(), expectedVersion: 0 }, 'c')).status, 403);
  for (const endpoint of ['/api/meals', '/api/patient-context', '/api/follow-ups']) assert.equal((await request(endpoint, 'GET', undefined, 'd', { patientId: 'P-1' })).status, 403);
  assert.equal((await request('/api/preferences', 'POST', { patientId: 'P-1', notes: 'preference', expectedVersion: 0 }, 'c')).status, 403);
  put('PATIENT#P-1', 'CONSENT#D-1', { status: 'approved' });
  assert.equal((await getContext('d')).status, 200);
});

test('raw images, future meals, malformed nutrition and oversized timestamps cannot enter memory', async () => {
  reset();
  for (const m of [{ ...meal(), image: 'data:image/jpeg;base64,x' }, { ...meal(), nutrition: { ...nutrition, sodium: 'unknown' } }, { ...meal(), eatenAt: new Date(Date.now() + 86400000).toISOString() }, { ...meal(), eatenAt: '2026-01-01T00:00:00.' + '1'.repeat(1000) + 'Z' }]) assert.equal((await create(m)).status, 400);
  assert.equal([...store.keys()].some(k => k.startsWith('MEALS#')), false);
});

test('meal pagination stays patient scoped and does not put meals into the state snapshot', async () => {
  reset();
  for (let i = 0; i < 45; i++) {
    const date = new Date(Date.now() - Math.floor(i / 10) * 86400000);
    put('MEALS#P-1', `${thaiDay(date)}#m${String(i).padStart(3, '0')}`, { ...meal(`m${i}`), eatenAt: date.toISOString(), day: thaiDay(date), version: 1, ttl: Math.floor(Date.now()/1000) + 1000 });
  }
  const first = (await request('/api/meals', 'GET', undefined, 'p', { days: '90' })).data;
  assert.equal(first.meals.length, 30); assert.ok(first.nextCursor);
  const next = (await request('/api/meals', 'GET', undefined, 'p', { days: '90', cursor: first.nextCursor })).data;
  assert.equal(next.meals.length, 15); assert.equal(next.nextCursor, null);
  const foreign = Buffer.from(JSON.stringify({ PK: 'MEALS#P-2', SK: `${thaiDay()}#x` })).toString('base64url');
  assert.equal((await request('/api/meals', 'GET', undefined, 'p', { cursor: foreign })).status, 400);
  await request('/api/state');
  const stateQuery = calls.filter(c => c.constructor.name === 'QueryCommand' && c.input.ExpressionAttributeValues[':pk'] === 'PATIENT#P-1');
  assert.ok(stateQuery.length);
});

test('preferences are explicit, versioned, deletable and never modify medical facts', async () => {
  reset(); const before = (await getContext()).data;
  assert.equal((await request('/api/preferences', 'POST', { patientId: 'P-1', notes: 'ชอบอาหารเตรียมง่าย', expectedVersion: 0 })).status, 200);
  const after = (await getContext()).data;
  assert.notEqual(before.revision, after.revision); assert.equal(after.preferences.notes, 'ชอบอาหารเตรียมง่าย');
  assert.deepEqual(after.profile.medications, ['current medicine']);
  assert.equal((await request('/api/preferences', 'POST', { patientId: 'P-1', notes: 'stale', expectedVersion: 0 })).status, 409);
  await request('/api/preferences', 'POST', { patientId: 'P-1', notes: '', expectedVersion: 1 });
  assert.equal((await getContext()).data.preferences.notes, '');
});

test('one follow-up moves through patient, caregiver and doctor with guarded transitions', async () => {
  reset(); const body = { action: 'create', patientId: 'P-1', id: 'case1', title: 'ช่วยเรื่องอาหาร', note: 'ไม่มีเวลาเตรียมอาหาร' };
  assert.equal((await request('/api/follow-ups', 'POST', body)).status, 200);
  assert.equal((await request('/api/follow-ups', 'POST', body)).status, 200);
  const change = (sub, version, status, note = 'ผลติดตาม') => request('/api/follow-ups', 'POST', { action: 'update', patientId: 'P-1', id: 'case1', expectedVersion: version, status, note }, sub);
  assert.equal((await change('p', 1, 'doctor')).status, 403);
  assert.equal((await change('c', 1, 'doctor')).status, 409);
  put('PATIENT#P-1', 'CONSENT#D-1', { status: 'approved' });
  assert.equal((await change('c', 1, 'doctor')).status, 200);
  assert.equal((await change('p', 2, 'resolved')).status, 403);
  put('PATIENT#P-1', 'CONSENT#D-1', { status: 'rejected' });
  assert.equal((await change('d', 2, 'following')).status, 403);
  put('PATIENT#P-1', 'CONSENT#D-1', { status: 'approved' });
  assert.equal((await change('d', 2, 'following')).status, 200);
  const review = calls.filter(c => c.input.TransactItems?.some(t => t.ConditionCheck?.Key.SK === 'CONSENT#D-1'));
  assert.ok(review.length);
  assert.equal((await change('p', 3, 'resolved', 'ทำตามแผนได้แล้ว')).status, 200);
  assert.equal(store.get('MEMORY#P-1|HEAD').activeCases, 0);
  assert.equal((await change('c', 4, 'caregiver')).status, 409);
});

test('open follow-ups are bounded and cannot disappear behind the closed-case page', async () => {
  reset();
  for (let i = 0; i < 20; i++) assert.equal((await request('/api/follow-ups', 'POST', { action: 'create', patientId: 'P-1', id: `a${i}`, title: 'ติดตาม', note: 'ข้อมูล' })).status, 200);
  assert.equal((await request('/api/follow-ups', 'POST', { action: 'create', patientId: 'P-1', id: 'extra', title: 'ติดตาม', note: 'ข้อมูล' })).status, 409);
  for (let i = 0; i < 70; i++) put('FOLLOWUP#P-1', `z${i}`, { id: `z${i}`, title: 'Closed', status: 'resolved', updatedAt: new Date().toISOString(), notes: [], ttl: Math.floor(Date.now()/1000) + 1000 });
  const response = (await request('/api/follow-ups')).data;
  assert.equal(response.cases.filter(c => c.status !== 'resolved').length, 20);
  assert.equal(response.truncated, true);
});

test('context chooses the newest reviewed plan, keeps pending readings labeled and excludes drafts/identity', async () => {
  reset(); const plan = { id: 'plan1', status: 'published', version: 1, updatedAt: new Date(Date.now() - 1000).toISOString(), summary: 'Reviewed plan', diet: ['Reviewed diet'], exercise: [], medication: [], measurement: [], tasks: [] };
  put('PATIENT#P-1', 'PLAN#1', plan);
  put('PATIENT#P-1', 'PLAN#2', { ...plan, id: 'draft', status: 'draft', updatedAt: new Date().toISOString(), summary: 'DO_NOT_SEND_DRAFT' });
  put('PATIENT#P-1', 'RECORD#r1', { id: 'r1', date: new Date().toISOString(), version: 1, systolic: 130, confirmationStatus: 'pending' });
  const context = (await getContext()).data;
  assert.equal(context.plan.id, 'plan1'); assert.equal(context.recentRecords[0].confirmationStatus, 'pending');
  const food = contextPacket(context, 'มื้อนี้กินอะไร'); const tasks = contextPacket(context, 'วันนี้ต้องทำอะไร');
  assert.equal(food.food, true); assert.equal(tasks.food, false);
  assert.ok(!food.text.includes('DO_NOT_SEND_NAME')); assert.ok(!food.text.includes('DO_NOT_SEND_DRAFT'));
  assert.equal(JSON.parse(tasks.text).food, undefined);
});

test('bounded agent reads meals and prepares a draft without creating a case until human confirmation', async () => {
  reset(); await create(meal());
  let round = 0;
  bedrock.send = async command => {
    modelCalls.push(command); round++;
    if (round === 1) return { output: { message: { role: 'assistant', content: [
      { toolUse: { toolUseId: 'read', name: 'read_recent_meals', input: { days: 7 } } },
      { toolUse: { toolUseId: 'draft', name: 'prepare_follow_up', input: { title: 'ติดตามอาหาร', note: 'ขอช่วยเตรียมอาหาร' } } }
    ] } }, usage: { inputTokens: 100, outputTokens: 40 }, stopReason: 'tool_use' };
    return { output: { message: { role: 'assistant', content: [{ text: 'เตรียมร่างไว้ให้ตรวจและยืนยัน' }] } }, usage: { inputTokens: 180, outputTokens: 30 }, stopReason: 'end_turn' };
  };
  const result = await request('/api/ai/chat', 'POST', { content: 'ช่วยผู้ดูแลดูเรื่องมื้ออาหาร' });
  assert.equal(result.status, 200); assert.equal(modelCalls.length, 2);
  assert.equal(result.data.actionDraft.type, 'follow-up'); assert.equal(result.data.contextSource.recordedMeals, 1);
  assert.equal([...store.keys()].some(k => k.startsWith('FOLLOWUP#')), false);
  assert.ok(modelCalls[1].input.toolConfig.tools.length);
  assert.ok(modelCalls[1].input.system.at(-1).text.includes('ห้ามเรียกเครื่องมือเพิ่ม'));
  const rateReservations = calls.flatMap(c => c.input.TransactItems || []).filter(t => t.Update?.Key.PK.startsWith('RATE#'));
  assert.equal(rateReservations.length, 1);
});

test('agent cannot inject another patient into a tool, loop indefinitely or reuse history after a meal edit', async () => {
  reset(); const m = meal(); const saved = (await create(m)).data.meal;
  const context = (await getContext()).data;
  put('CHAT#p#P-1#main', 'TURN#one', { user: 'old', assistant: 'STALE_FOOD_CLAIM', contextVersion: context.revision, ttl: Math.floor(Date.now()/1000) + 1000 });
  await request('/api/meals', 'POST', { action: 'delete', patientId: 'P-1', id: saved.id, day: saved.day, expectedVersion: 1 });
  await request('/api/ai/chat', 'POST', { content: 'วันนี้กินอะไรดี' });
  assert.ok(!JSON.stringify(modelCalls[0].input).includes('STALE_FOOD_CLAIM'));
  let round = 0;
  bedrock.send = async command => {
    modelCalls.push(command); round++;
    return { output: { message: { role: 'assistant', content: [{ toolUse: { toolUseId: 'bad', name: 'read_recent_meals', input: { days: 7, patientId: 'P-2' } } }] } }, stopReason: 'tool_use' };
  };
  const result = await request('/api/ai/chat', 'POST', { content: 'ดูอาหาร' });
  assert.equal(result.status, 502); assert.equal(round, 2);
  assert.ok(!calls.some(c => c.input.ExpressionAttributeValues?.[':pk'] === 'MEALS#P-2'));
});

test('Bangkok day boundaries and aggregation of missing values are explicit', () => {
  assert.equal(thaiDay(new Date('2026-10-22T16:59:59Z')), '2026-10-22');
  assert.equal(thaiDay(new Date('2026-10-22T17:00:00Z')), '2026-10-23');
  const summary = updateDay(undefined, '2026-10-22', undefined, { nutrition, ...meal() });
  assert.equal(summary.known.sugar, 0); assert.equal(summary.totals.sugar, 0);
  assert.equal(summary.known.calories, 1);
});

test('day lookup, expired meals and daily limits do not fabricate a full history', async () => {
  reset(); const yesterday = new Date(Date.now() - 86400000);
  const m = { ...meal('yesterday'), eatenAt: yesterday.toISOString() };
  await create(m); await create(meal('today'));
  const result = (await request('/api/meals', 'GET', undefined, 'p', { day: thaiDay(yesterday) })).data;
  assert.deepEqual(result.meals.map(m => m.id), ['yesterday']);
  assert.equal((await request('/api/meals', 'GET', undefined, 'p', { day: '2026-02-31' })).status, 400);
  put('MEALS#P-1', `${thaiDay()}#expired`, { ...meal('expired'), ttl: 1 });
  assert.ok(!(await request('/api/meals')).data.meals.some(m => m.id === 'expired'));
  let summary;
  for (let i = 0; i < 20; i++) summary = updateDay(summary, thaiDay(), undefined, meal(`x${i}`));
  assert.throws(() => updateDay(summary, thaiDay(), undefined, meal('extra')), e => e.status === 409);
});

test('doctor tools cannot change patient preferences and oversized context stops before inference', async () => {
  reset(); put('PATIENT#P-1', 'CONSENT#D-1', { status: 'approved' });
  let count = 0;
  bedrock.send = async command => {
    modelCalls.push(command);
    if (count++ === 0) return { output: { message: { role: 'assistant', content: [{ toolUse: { toolUseId: 'bad', name: 'prepare_preference', input: { notes: 'change' } } }] } }, stopReason: 'tool_use' };
    return { output: { message: { role: 'assistant', content: [{ text: 'ขอให้ผู้ป่วยตรวจและแก้เอง' }] } }, stopReason: 'end_turn' };
  };
  const result = await request('/api/ai/chat', 'POST', { content: 'ช่วยดูแผน', patientId: 'P-1' }, 'd');
  assert.equal(result.status, 200); assert.equal(result.data.actionDraft, undefined);
  assert.equal(result.data.trace[0].status, 'error');
  assert.ok(!store.has('MEMORY#P-1|PREFERENCES'));
  store.get('PATIENT#P-1|PROFILE').allergies = ['x'.repeat(13000)];
  const before = modelCalls.length;
  assert.equal((await request('/api/ai/chat', 'POST', { content: 'อาหารวันนี้' })).status, 413);
  assert.equal(modelCalls.length, before);
});

test('structured food analysis uses one call without tools or storing a chat turn', async () => {
  reset();
  const response = await request('/api/ai/chat', 'POST', { content: 'วิเคราะห์เมนูอาหารเป็น JSON', purpose: 'analysis' });
  assert.equal(response.status, 200); assert.equal(modelCalls.length, 1);
  assert.equal(modelCalls[0].input.toolConfig, undefined);
  assert.ok(![...store.keys()].some(k => k.startsWith('CHAT#')));
});

test('long-range food questions paginate aggregates and return a bounded summary', async () => {
  reset();
  for (let i = 0; i < 365; i++) {
    const day = thaiDay(new Date(Date.now() - i * 86400000));
    put('MEMORY#P-1', `DAY#${day}`, updateDay(undefined, day, undefined, meal(`m${i}`)));
  }
  const summary = await readFoodSummary({ ...patient, sub: 'p' }, 'P-1', 365);
  assert.equal(summary.recordedMeals, 365); assert.equal(summary.recordedDays, 365);
  assert.deepEqual(summary.topFoods, [{ name: 'ข้าวและผัก', count: 365 }]);
  assert.equal(calls.filter(c => c.constructor.name === 'QueryCommand').length, 4);
  assert.ok(JSON.stringify(summary).length < 1500);
});

test('agent evidence identifies actual sources and logs bounded execution without private tool arguments', async () => {
  reset(); await create(meal());
  let count = 0;
  bedrock.send = async command => {
    modelCalls.push(command);
    if (count++ === 0) return { output: { message: { role: 'assistant', content: [
      { toolUse: { toolUseId: 'summary', name: 'read_food_summary', input: { days: 365 } } },
      { toolUse: { toolUseId: 'preference', name: 'prepare_preference', input: { notes: 'PRIVATE_PREFERENCE_DO_NOT_LOG' } } }
    ] } }, stopReason: 'tool_use' };
    return { output: { message: { role: 'assistant', content: [{ text: 'สรุปตามช่วงที่มีบันทึก' }] } }, stopReason: 'end_turn' };
  };
  const logged = [], original = console.log;
  let result;
  console.log = text => logged.push(text);
  try { result = await request('/api/ai/chat', 'POST', { content: 'สรุปอาหารย้อนหลังหนึ่งปี' }); }
  finally { console.log = original; }
  assert.equal(result.status, 200); assert.equal(result.data.execution.modelCalls, 2);
  assert.equal(result.data.execution.toolCalls, 2); assert.ok(result.data.execution.durationMs >= 0);
  assert.ok(result.data.contextSource.sources.some(source => source.label.includes('365 วัน')));
  assert.ok(!JSON.stringify(result.data.contextSource).includes('DO_NOT_SEND_NAME'));
  assert.ok(logged.some(text => JSON.parse(text).event === 'agent_plan'));
  assert.ok(!logged.join('').includes('PRIVATE_PREFERENCE_DO_NOT_LOG'));
  assert.ok(!logged.join('').includes('สรุปอาหารย้อนหลังหนึ่งปี'));
});

test('cross-region and unapproved model IDs stop before inference; emergency text with an image skips the model', async () => {
  reset(); const original = process.env.BEDROCK_MODEL;
  try {
    for (const model of ['us.amazon.nova-lite-v1:0', 'arn:aws:sagemaker:us-east-1:123456789012:endpoint/marketplace', 'unapproved']) {
      process.env.BEDROCK_MODEL = model;
      assert.equal((await request('/api/ai/chat', 'POST', { content: 'ช่วยดูอาหาร' })).status, 503);
    }
    assert.equal(modelCalls.length, 0);
    const response = await request('/api/ai/chat', 'POST', { content: 'เจ็บหน้าอก', files: [{ type: 'image/png', name: 'test', data: 'ZmFrZQ==' }] });
    assert.equal(response.status, 200); assert.equal(response.data.modelUsed, 'safety-message');
    assert.equal(modelCalls.length, 0);
  } finally { process.env.BEDROCK_MODEL = original; }
});

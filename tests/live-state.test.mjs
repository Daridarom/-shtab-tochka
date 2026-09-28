import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/live.js',import.meta.url),'utf8');
const {toState}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const raw={generated_at:'2026-09-28T05:35:00Z',cards:[
 {id:'system',level:'ok',detail:'Канал управления: работает · процессы: работает · свободно 209 ГБ'},
 {id:'visual',level:'error',detail:'2 сервисов в состоянии ошибки'},
 {id:'publications',level:'ok',detail:'Неясная доставка: 0 · ошибки доставки: 0'}
],workflows:[],rostok:{published_today:0,daily_limit:4,queue:2,next_slot:'2026-09-28T09:00:00+03:00',total_published:53,unresolved:0}};
const s=toState(raw,Date.parse('2026-09-28T05:36:00Z'));
assert.equal(s.focus.length,1);
assert.equal(s.focus[0].level,'err');
assert.match(s.focus[0].text,/2 задачи.*с ошибкой/);
assert.doesNotMatch(s.focus[0].action,/reset-failed|Сброс/);
assert.equal(s.rostok.statusLabel,'есть готовые посты');
const blocked=structuredClone(raw);
blocked.cards[2].level='error';
blocked.cards[2].detail='Проверки: publication_lock_hold';
assert.equal(toState(blocked).rostok.statusLabel,'требует проверки');
const empty=structuredClone(raw);empty.rostok.queue=0;
assert.equal(toState(empty).rostok.statusLabel,'нет готовых постов');
const unknown=structuredClone(raw);unknown.cards.pop();
assert.equal(toState(unknown).rostok.statusLabel,'требует проверки');
console.log('PASS: rejected visuals remain visible; publication labels respect blockers, empty queue and unknown state');

const sectionSource=await readFile(new URL('../public/section-state.js',import.meta.url),'utf8');
const {documentView,normalizeMaxState,channelViews}=await import('data:text/javascript;base64,'+Buffer.from(sectionSource).toString('base64'));
const original={mode:'live',asOf:'2026-09-28T17:33:57Z',cards:[{id:'drive',level:'wait',detail:'Контекст проверен · Облачная копия индекса задач ожидает обновления'},{id:'max',level:'ok',detail:'Получатель: работает · записей: 518'}],focus:[{key:'drive',level:'wait',text:'Свежесть документов пока не подтверждена',since:123},{key:'visual',level:'err',text:'Ошибка'}]};
const docs=documentView(original);
assert.equal(docs.level,'wait');assert.match(docs.title,/индекс задач/);assert.match(docs.context,/подтверждает/);assert.match(docs.originals,/не проверяется/);
const mapped=normalizeMaxState(original);
assert.equal(mapped.focus[0].text,original.cards[0].detail);assert.equal(mapped.focus[0].level,'wait');assert.equal(mapped.focus[0].since,123);assert.deepEqual(mapped.focus[1],original.focus[1]);assert.equal(original.focus[0].text,'Свежесть документов пока не подтверждена');
const green=documentView({...original,cards:[{id:'drive',level:'ok',detail:'Контекст проверен'}]});
assert.equal(green.level,'ok');assert.match(green.originals,/не проверяется/);
const offline=documentView({...original,mode:'offline'});assert.equal(offline.available,false);assert.equal(offline.level,'wait');assert.doesNotMatch(offline.detail,/Контекст проверен/);
assert.equal(documentView({mode:'loading'}).available,false);assert.equal(documentView({...original,mode:'stale'}).stale,true);
assert.equal(documentView({...original,cards:[{id:'drive',level:'unexpected'}]}).level,'wait');
const channels=channelViews(original);assert.equal(channels[0].level,'wait');assert.equal(channels[1].detail,'Получатель: работает · записей: 518');assert.equal(channelViews({...original,mode:'offline'})[1].level,'wait');
console.log('PASS: document warning remains yellow; exact source reason preserved; originals not inferred; offline is unknown; received records are not tasks');

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=async f=>import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../public/'+f,import.meta.url),'utf8')).toString('base64'));
const M=await load('model.js');

// Источник: «не подключён» не выдаётся за пустой день; «свободно» только при LIVE.
const none=M.emptyPrivate();
assert.equal(none.source.state,'not_connected');
assert.equal(none.events.length+none.tasks.length+none.inbox.length,0);
assert.doesNotMatch(M.emptyDayText(none.source),/свободн/i);
assert.match(M.emptyDayText(none.source),/не подтверждено/);
const now=Date.parse('2026-09-28T20:00:00Z');
assert.equal(M.sourceFromSnapshot('2026-09-28T19:59:00Z',120,now).state,'live');
const stale=M.sourceFromSnapshot('2026-09-28T19:42:00Z',120,now);
assert.equal(stale.state,'stale');
assert.equal(M.sourceNote('Календарь',stale),'Календарь не обновлялся 18 минут. Показан последний подтверждённый снимок');
assert.equal(M.emptyDayText(stale),'Нет подтверждённых данных на этот день');
assert.equal(M.fromPrivateSnapshot({schema:'x'}).source.state,'error');
const partial=M.fromPrivateSnapshot({
 schema:'private-1',generated_at:'2026-09-28T19:59:00Z',ttl_seconds:120,
 capabilities:{calendar:true,tasks:false,inbox:false},
 events:[{id:'cal1',title:'Встреча',start:'2026-09-29T11:00:00+03:00',kind:'meeting'}],
 tasks:[{id:'hidden',title:'Не должна показаться'}],inbox:[{id:'hidden'}]
},now);
assert.equal(partial.sources.calendar.state,'live');
assert.equal(partial.sources.tasks.state,'not_connected');
assert.equal(partial.sources.inbox.state,'not_connected');
assert.equal(partial.events.length,1);assert.equal(partial.tasks.length,0);assert.equal(partial.inbox.length,0);

// EVENT: окончание не выдумывается; оплата — не встреча.
const ev=M.normalizeEvent({id:'e1',start:'2026-09-29T11:00:00+03:00',end:'2026-09-29T12:00:00+03:00',kind:'meeting',format:'online',joinUrl:'javascript:alert(1)'});
assert.equal(ev.endConfirmed,false);assert.equal(M.eventWhen(ev).endNote,'Окончание не указано');assert.equal(M.eventWhen(ev).end,null);assert.equal(ev.joinUrl,null);
const ev2=M.normalizeEvent({id:'e2',start:'2026-09-29T14:00:00+03:00',end:'2026-09-29T15:30:00+03:00',endConfirmed:true,kind:'meeting'});
assert.equal(M.eventWhen(ev2).end,'15:30');
const pay=M.normalizeEvent({id:'p',start:'2026-09-29T10:00:00+03:00',kind:'payment'});
assert.equal(M.EVENT_KINDS[pay.kind].presence,false);assert.equal(M.eventWhen(pay).endNote,null);
assert.equal(M.eventsOfDay([ev2,ev,pay],'2026-09-29').map(e=>e.id).join(),'p,e1,e2');
const w=M.weekOf(Date.parse('2026-09-28T20:00:00Z'));assert.equal(w[0].key,'2026-09-28');assert.equal(w[6].key,'2026-10-04');assert.equal(w[0].wd,'Пн');

// TASK: статус и приоритет независимы; одна задача — одна запись во всех представлениях.
const tasks=[{id:'A',title:'a',status:'IN_PROGRESS',priority:'schedule'},{id:'B',title:'b',status:'PROPOSED'},{id:'C',title:'c',status:'DONE',priority:'do'},{id:'D',title:'d',status:'Странный'}].map(M.normalizeTask);
const board=M.boardColumns(tasks);assert.deepEqual(board.map(c=>c.tasks.length),[2,1,0,1]);
assert.equal(M.columnOf('RECOVERY HOLD'),'wait');assert.equal(M.statusTitle('Странный'),'Странный');
let changes=M.setTaskChange({},'A',{priority:'do'},1);
let applied=M.applyChanges(tasks,changes);
assert.equal(applied[0].status,'IN_PROGRESS');assert.equal(applied[0].priority,'do');assert.equal(applied[0].pending.status,false);assert.equal(applied[0].pending.priority,true);
changes=M.setTaskChange(changes,'A',{status:'WAITING'},2);applied=M.applyChanges(tasks,changes);
assert.equal(applied[0].priority,'do');assert.equal(M.columnOf(applied[0].status),'wait');
const mx=M.matrix(applied);assert.equal(mx.quads[0].tasks.length,1);assert.equal(mx.unsorted.map(t=>t.id).join(),'B,D');
const ids=[...M.boardColumns(applied).flatMap(c=>c.tasks),].map(t=>t.id).sort().join();assert.equal(ids,'A,B,C,D');
assert.equal(M.topActions(applied)[0].id,'B');assert.ok(!M.topActions(applied).some(t=>t.id==='C'||t.id==='A'),'готовые и ожидающие не попадают в главные действия');
assert.equal(M.topActions(M.applyChanges(tasks,{}))[0].id,'A');
changes=M.setTaskChange(changes,'A',{priority:'later'},3);assert.equal(M.applyChanges(tasks,changes)[0].status,'WAITING');

// INBOX: прочитано ботом ≠ разобрано.
const inbox=[{id:'1',channel:'MAX',read:true},{id:'2',triage:'done'}].map(M.normalizeInbox);
assert.equal(M.unprocessed(inbox).length,1);

// Схема: реальные состояния, серое при отсутствии данных, импульс только на свежем работающем участке.
const state={mode:'live',asOf:'2026-09-28T20:00:00Z',cards:[{id:'system',level:'ok'},{id:'max',level:'ok'},{id:'rostok',level:'ok'},{id:'visual',level:'err',detail:'1'},{id:'publications',level:'ok'}],workflows:[['x','ok','']],focus:[{key:'visual',text:'Ошибка генерации',action:'Проверить'}]};
const g=M.schemeGraph(state,none);
const node=id=>g.nodes.find(n=>n.id===id),edge=(a,b)=>g.edges.find(e=>e.from===a&&e.to===b);
assert.equal(node('calendar').level,'none');assert.equal(node('telegram').level,'none');assert.equal(node('visual').level,'err');
assert.equal(node('visual').issue.action,'Проверить');
assert.equal(edge('max','system').kind,'flow');assert.equal(edge('rostok','visual').kind,'stop err');assert.equal(edge('visual','publications').kind,'idle');
assert.equal(edge('system','calendar').kind,'unknown');
const gs=M.schemeGraph({...state,mode:'stale'},none);assert.ok(!gs.edges.some(e=>e.kind==='flow'));
const go=M.schemeGraph({...state,mode:'offline'},none);assert.ok(go.nodes.every(n=>n.level==='none'));
const O=await load('orbit.js');
const svg=O.schemeSVG(g,{selected:'visual'});assert.equal((svg.match(/class="pulse"/g)||[]).length,g.edges.filter(e=>e.kind==='flow').length);assert.match(svg,/data-node="visual"/);
assert.ok(O.orbitSVG([{id:'a',title:'A',level:'ok'}]).startsWith('<svg class="orbit"'));
console.log('PASS: sources honest, events keep unconfirmed end, status/priority independent, one task per view, scheme shows real states');

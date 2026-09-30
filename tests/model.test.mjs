import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=async f=>import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../public/'+f,import.meta.url),'utf8')).toString('base64'));
const M=await load('model.js');

// Источник: «не подключён» не выдаётся за пустой день; «свободно» только при LIVE.
const none=M.emptyPrivate();
assert.equal(none.source.state,'not_connected');assert.equal(none.calendarSource.state,'not_connected');assert.equal(none.taskSource.state,'not_connected');assert.equal(none.inboxSource.state,'not_connected');
assert.equal(none.events.length+none.tasks.length+none.inbox.length,0);
assert.doesNotMatch(M.emptyDayText(none.source),/свободн/i);
assert.match(M.emptyDayText(none.source),/не подтверждено/);
const now=Date.parse('2026-09-28T20:00:00Z');
assert.equal(M.sourceFromSnapshot('2026-09-28T19:59:00Z',120,now).state,'live');
const stale=M.sourceFromSnapshot('2026-09-28T19:42:00Z',120,now);
assert.equal(stale.state,'stale');
assert.equal(M.sourceNote('Календарь',stale),'Календарь не обновлялся 18 минут. Показан последний подтверждённый снимок');
assert.equal(M.emptyDayText(stale),'Нет подтверждённых данных на этот день');
const brokenPrivate=M.fromPrivateSnapshot({schema:'x'});
assert.equal(brokenPrivate.source.state,'error');assert.equal(brokenPrivate.calendarSource.state,'error');assert.equal(brokenPrivate.taskSource.state,'error');assert.equal(brokenPrivate.inboxSource.state,'error');
const publicCal=M.fromPublicCalendar({schema:'calendar-1',generated_at:'2026-09-28T19:59:00Z',ttl_seconds:21600,events:[{id:'g1',title:'Google событие',kind:'meeting',start:'2026-09-29T11:00:00+03:00',end:'2026-09-29T12:00:00+03:00',endConfirmed:true}]},now);
assert.equal(publicCal.source.state,'live');assert.equal(publicCal.events.length,1);assert.equal(publicCal.events[0].title,'Google событие');
assert.equal(M.fromPublicCalendar({schema:'unexpected'}).source.state,'error');
const pubTasks=M.fromPublicTasks({schema:'tasks-public-1',generated_at:'2026-09-28T19:59:00Z',ttl_seconds:7200,partial:true,scope:['rko'],items:[{id:'t1',title:'Проверить библиотеку',status:'OPEN',project:'rko',fresh:true}],proposal_count:2,today_complete:false,stale_rows:0,missing_sources:[]},now);
assert.equal(pubTasks.source.state,'live');assert.equal(pubTasks.source.partial,true);assert.equal(pubTasks.tasks.length,1);assert.equal(pubTasks.tasks[0].project,'rko');
const stalePub=M.fromPublicTasks({schema:'tasks-public-1',generated_at:'2026-09-28T19:59:00Z',ttl_seconds:7200,partial:true,items:[],stale_rows:1,missing_sources:['rko']},now);
assert.equal(stalePub.source.state,'stale');assert.match(stalePub.source.reason,/источник/);
const inboxAgg=M.fromInboxSummary({schema:'inbox-summary-1',generated_at:'2026-09-28T19:59:00Z',ttl_seconds:120,channels:{max:{read_ok:true,total:12,last_24h:3,last_message_at:'2026-09-28T19:58:00Z',source_states:{received:12}}},detail_available:false},now);
assert.equal(inboxAgg.source.state,'live');assert.equal(inboxAgg.channels.max.last24h,3);assert.equal(inboxAgg.detailAvailable,false);

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
assert.equal(edge('max','system').kind,'flow');assert.equal(edge('rostok','visual').kind,'stop err');assert.equal(edge('visual','evidence').kind,'unknown');assert.equal(edge('evidence','publications').kind,'unknown');
assert.equal(edge('system','calendar').kind,'unknown');
const withCalendar={...none,calendarSource:publicCal.source,events:publicCal.events};
const gc=M.schemeGraph(state,withCalendar);
assert.equal(gc.nodes.find(n=>n.id==='calendar').level,'ok');assert.equal(gc.nodes.find(n=>n.id==='projects').level,'none');assert.equal(gc.edges.find(e=>e.from==='system'&&e.to==='calendar').kind,'flow');
const gs=M.schemeGraph({...state,mode:'stale'},none);assert.ok(!gs.edges.some(e=>e.kind==='flow'));
const go=M.schemeGraph({...state,mode:'offline'},none);assert.ok(go.nodes.every(n=>n.level==='none'));
const O=await load('orbit.js');
const svg=O.schemeSVG(g,{selected:'visual'});assert.equal((svg.match(/class="pulse"/g)||[]).length,g.edges.filter(e=>e.kind==='flow').length);assert.match(svg,/data-node="visual"/);
assert.ok(O.orbitSVG([{id:'a',title:'A',level:'ok'}]).startsWith('<svg class="orbit"'));
console.log('PASS: sources honest, events keep unconfirmed end, status/priority independent, one task per view, scheme shows real states');

// Защита отображения: суммы, адреса, телефоны и ссылки не показываются, даже если коллектор их прислал.
assert.equal(M.redactPrivate('ОПЛАТА — Аренда Козлова, 1 — 60 000 ₽'),'ОПЛАТА — Аренда');
assert.equal(M.redactPrivate('ОПЛАТА — Интернет Дубинина 19-26 — 650 ₽'),'ОПЛАТА — Интернет');
assert.equal(M.redactPrivate('Созвон https://meet.example/x +7 978 123-45-67'),'Созвон');
assert.equal(M.redactPrivate('ЦУП · Доверенности — срок 11.10.2026'),'ЦУП · Доверенности — срок 11.10.2026');
assert.deepEqual(M.privateHints('Совещание в 14:30'),[]);
const leaky=M.normalizeEvent({id:'l',start:'2026-10-05T09:00:00+03:00',kind:'payment',title:'ОПЛАТА — Аренда Театральная, 37 — 63 000 ₽'});
assert.equal(leaky.title,'ОПЛАТА — Аренда');assert.equal(leaky.redacted,true);
assert.equal(M.normalizeEvent({id:'c',start:'2026-10-05T09:00:00+03:00',title:'Встреча'}).redacted,false);

// Состояние слоя: SYNCING при загрузке, OFFLINE с кэшем без связи, STALE если источник не ответил, ERROR если проекции нет у живого источника.
assert.equal(M.layerSource({mode:'loading'},null).state,'syncing');
assert.equal(M.layerSource({mode:'offline'},null).state,'offline');
assert.equal(M.layerSource({mode:'live'},null).state,'error');
assert.equal(M.layerSource({mode:'live'},null,{missingReason:'нет'}).state,'not_connected');
assert.equal(M.layerSource({mode:'live'},publicCal,{origin:'main-calendar'}).state,'live');
assert.equal(M.layerSource({mode:'offline'},publicCal,{origin:'cache'}).state,'offline');
assert.equal(M.layerSource({mode:'live'},publicCal,{origin:'cache'}).state,'stale');
assert.equal(M.layerSource({mode:'loading'},publicCal,{origin:'cache'}).state,'syncing');

// Узел «Проверка»: серый без агрегата, красный при блокировке; связи узла — только реальные задачи и события.
const ge=M.schemeGraph({...state,artifactRuntime:{lastResult:'blocked'}},none);
assert.equal(ge.nodes.find(n=>n.id==='evidence').level,'err');assert.equal(ge.edges.find(e=>e.from==='visual'&&e.to==='evidence').kind,'idle');
assert.equal(g.nodes.find(n=>n.id==='evidence').level,'none');
const gv=M.schemeGraph({...state,cards:[...state.cards.filter(c=>c.id!=='visual'),{id:'visual',level:'ok'}],artifactRuntime:{lastResult:'verified'}},none);
assert.equal(gv.edges.find(e=>e.from==='evidence'&&e.to==='publications').kind,'flow');
const links=M.nodeLinks(ge.nodes.find(n=>n.id==='rostok'),{tasks:[{id:'r1',title:'x',status:'OPEN',project:'rostok'},{id:'o1',title:'y',status:'OPEN',project:'rko'},{id:'d1',title:'z',status:'DONE',project:'rostok'}],events:[],state});
assert.deepEqual(links.tasks.map(t=>t.id),['r1']);
const calLinks=M.nodeLinks(ge.nodes.find(n=>n.id==='calendar'),{tasks:[],events:publicCal.events,state,now});
assert.equal(calLinks.events.length,1);
console.log('PASS: display redaction, layer states and evidence node are honest');

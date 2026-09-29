// Штаб.Точка · единая модель рабочего слоя ЦУП.
// PROJECT · TASK · EVENT · DOCUMENT · INBOX_ITEM · SYSTEM_NODE — разные экраны показывают одни и те же сущности.
// Здесь нет данных: только нормализация, правила отображения и состояние источников.
// Приватные события, задачи и входящие НЕ идут через публичный live/status.json.

// ---------- состояние источника ----------
// LIVE / STALE / OFFLINE / SYNCING / ERROR + NOT_CONNECTED (источник к экрану ещё не подключён).
export const SOURCE={LIVE:'live',STALE:'stale',OFFLINE:'offline',SYNCING:'syncing',ERROR:'error',NOT_CONNECTED:'not_connected'};
const SOURCE_LABEL={live:'Актуально',stale:'Устарело',offline:'Нет связи',syncing:'Обновляется',error:'Ошибка',not_connected:'Не подключён'};
export function sourceLabel(state){return SOURCE_LABEL[state]||'Неизвестно';}
export function sourceLevel(state){return state==='live'?'ok':state==='error'||state==='offline'?'err':state==='stale'||state==='syncing'?'wait':'none';}
function minutes(sec){const m=Math.max(1,Math.round(sec/60));const d=m%10,h=m%100;return m+' '+((h>=11&&h<=19)?'минут':d===1?'минуту':d>=2&&d<=4?'минуты':'минут');}
function ageText(sec){if(sec==null)return 'время неизвестно';if(sec<60)return 'меньше минуты';if(sec<3600)return minutes(sec);const hr=Math.round(sec/3600);return hr<48?hr+' ч':Math.round(sec/86400)+' дн';}
// Короткая честная фраза о состоянии источника.
export function sourceNote(name,src){
 if(!src||src.state===SOURCE.NOT_CONNECTED)return name+' к этому экрану не подключён'+(src?.reason?'. '+src.reason:'');
 if(src.state===SOURCE.SYNCING)return name+': идёт обновление';
 if(src.state===SOURCE.ERROR)return name+': ошибка источника'+(src.reason?' · '+src.reason:'');
 if(src.state===SOURCE.OFFLINE)return name+': нет связи'+(src.ageSeconds!=null?' · последний снимок '+ageText(src.ageSeconds)+' назад':'');
 if(src.state===SOURCE.STALE)return name+' не обновлялся '+ageText(src.ageSeconds)+'. Показан последний подтверждённый снимок';
 return name+': обновлено '+(src.ageSeconds!=null&&src.ageSeconds>=60?ageText(src.ageSeconds)+' назад':'только что');
}
// Можно ли верить отсутствию записей: только при свежем источнике.
export function confirmsAbsence(src){return !!src&&src.state===SOURCE.LIVE;}
export function sourceFromSnapshot(generatedAt,ttlSeconds,now=Date.now()){
 const ts=Date.parse(generatedAt);if(!Number.isFinite(ts))return {state:SOURCE.ERROR,reason:'нет времени снимка',ageSeconds:null,asOf:null};
 const age=Math.max(0,Math.round((now-ts)/1000));
 return {state:age<=Math.max(120,ttlSeconds||0)+300?SOURCE.LIVE:SOURCE.STALE,ageSeconds:age,asOf:generatedAt};
}
// Состояние публичной телеметрии из экранного состояния live.js.
export function telemetrySource(s){
 if(!s||s.mode==='loading')return {state:SOURCE.SYNCING,ageSeconds:s?.ageSeconds??null,asOf:s?.asOf??null};
 const map={live:SOURCE.LIVE,stale:SOURCE.STALE,offline:SOURCE.OFFLINE};
 return {state:map[s.mode]||SOURCE.ERROR,ageSeconds:s.ageSeconds??null,asOf:s.asOf??null};
}

// ---------- защищённый слой ----------
// Сейчас приватного канала к ЦУП нет: возвращаем честное «не подключён», ничего не симулируем.
// Когда канал появится, он должен вернуть снимок {schema:'private-1',generated_at,ttl_seconds,events[],tasks[],inbox[]}.
export const PRIVATE_REASON='Защищённый канал для событий, задач и входящих ещё не настроен. В публичную телеметрию эти данные не передаются';
export function privateUnavailable(reason=PRIVATE_REASON,state=SOURCE.NOT_CONNECTED){
 const src={state,reason,ageSeconds:null,asOf:null};
 return {source:src,sources:{calendar:src,tasks:src,inbox:src},events:[],tasks:[],inbox:[]};
}
export function emptyPrivate(){return privateUnavailable();}
function sectionSource(common,capabilities,key){
 if(!capabilities||!(key in capabilities))return common; // обратная совместимость private-1
 if(capabilities[key]===true)return common;
 return {state:SOURCE.NOT_CONNECTED,reason:'Этот раздел ещё не подключён к защищённому каналу',ageSeconds:null,asOf:null};
}
export function fromPrivateSnapshot(raw,now=Date.now()){
 if(!raw||raw.schema!=='private-1')return privateUnavailable('неизвестный формат защищённого снимка',SOURCE.ERROR);
 const common=sourceFromSnapshot(raw.generated_at,raw.ttl_seconds,now);
 const caps=raw.capabilities&&typeof raw.capabilities==='object'?raw.capabilities:null;
 const sources={
  calendar:sectionSource(common,caps,'calendar'),
  tasks:sectionSource(common,caps,'tasks'),
  inbox:sectionSource(common,caps,'inbox')
 };
 return {source:common,sources,
  events:sources.calendar.state===SOURCE.NOT_CONNECTED?[]:(raw.events||[]).map(normalizeEvent).filter(Boolean),
  tasks:sources.tasks.state===SOURCE.NOT_CONNECTED?[]:(raw.tasks||[]).map(normalizeTask).filter(Boolean),
  inbox:sources.inbox.state===SOURCE.NOT_CONNECTED?[]:(raw.inbox||[]).map(normalizeInbox).filter(Boolean)};
}

// ---------- TASK ----------
// Статусы — коды реестра задач Штаба (HQ TASK INDEX / проектные TASKS). Колонки доски — только группировка,
// сам статус не переименовывается и не подменяется. Неизвестный код попадает в «К делу» и показывается как есть.
export const STATUS_COLUMNS=[
 {id:'todo',title:'К делу',codes:['OPEN','PROPOSED','NEEDS_REVIEW','TODO','NEXT']},
 {id:'doing',title:'В работе',codes:['IN_PROGRESS','ACTIVE','CURRENT']},
 {id:'wait',title:'Ожидаю',codes:['WAITING','BLOCKED','HOLD','ON_HOLD','DEFERRED','RECOVERY_HOLD']},
 {id:'done',title:'Готово',codes:['DONE','CLOSED','RELEASED']}
];
const STATUS_TITLE={OPEN:'Открыта',PROPOSED:'Предложена',NEEDS_REVIEW:'Нужна сверка',IN_PROGRESS:'В работе',WAITING:'Ожидает',BLOCKED:'Заблокирована',HOLD:'Удержана',ON_HOLD:'Удержана',DEFERRED:'Отложена',RECOVERY_HOLD:'Удержана до проверки',DONE:'Готово',CLOSED:'Закрыта'};
export function statusCode(raw){return String(raw||'').trim().toUpperCase().replace(/[\s/-]+/g,'_');}
export function columnOf(status){const c=statusCode(status);return (STATUS_COLUMNS.find(col=>col.codes.includes(c))||STATUS_COLUMNS[0]).id;}
export function statusTitle(status){const c=statusCode(status);return STATUS_TITLE[c]||String(status||'Без статуса');}
// Код для перевода в колонку: первый канонический код колонки.
export function codeForColumn(col){return (STATUS_COLUMNS.find(x=>x.id===col)||STATUS_COLUMNS[0]).codes[0];}

// Приоритет — отдельное измерение, не статус. Отсутствие приоритета — отдельное состояние «не разобрано».
export const PRIORITIES=[
 {id:'do',title:'Сделать',hint:'важно и срочно'},
 {id:'schedule',title:'Запланировать',hint:'важно, не срочно'},
 {id:'delegate',title:'Делегировать',hint:'срочно, менее важно · поручение не отправляется само'},
 {id:'later',title:'Отложить',hint:'не срочно · задача не удаляется'}
];
export function priorityTitle(p){return PRIORITIES.find(x=>x.id===p)?.title||'Не разобрано';}

export function normalizeTask(t){
 if(!t||!t.id||!t.title)return null;
 return {id:String(t.id),title:String(t.title),status:t.status||'OPEN',priority:PRIORITIES.some(p=>p.id===t.priority)?t.priority:null,
  deadline:t.deadline||null,project:t.project||null,owner:t.owner||null,source:t.source||null,links:Array.isArray(t.links)?t.links:[]};
}
// Локальные правки поверх реестра: одна запись на задачу, по её id. Реестр при этом не переписывается.
// changes: {[taskId]:{status?,priority?,at}}
export function applyChanges(tasks,changes={}){
 return tasks.map(t=>{const c=changes[t.id];if(!c)return {...t,pending:null};
  return {...t,status:c.status??t.status,priority:c.priority!==undefined?c.priority:t.priority,pending:{status:c.status!=null&&c.status!==t.status,priority:c.priority!==undefined&&c.priority!==t.priority,at:c.at||null}};});
}
export function setTaskChange(changes,id,patch,now=Date.now()){
 const next={...changes};next[id]={...(next[id]||{}),...patch,at:now};return next;
}
export function boardColumns(tasks){return STATUS_COLUMNS.map(col=>({...col,tasks:tasks.filter(t=>columnOf(t.status)===col.id)}));}
export function matrix(tasks){
 const open=tasks.filter(t=>columnOf(t.status)!=='done');
 return {quads:PRIORITIES.map(p=>({...p,tasks:open.filter(t=>t.priority===p.id)})),unsorted:open.filter(t=>!t.priority)};
}
// До трёх главных действий: «Сделать» → «В работе» → ближайший срок. Готовые и ожидающие не показываем.
export function topActions(tasks,n=3){
 const open=tasks.filter(t=>!['done','wait'].includes(columnOf(t.status)));
 const rank=t=>(t.priority==='do'?0:4)+(columnOf(t.status)==='doing'?0:2)+(t.deadline?0:1);
 return [...open].sort((a,b)=>rank(a)-rank(b)||String(a.deadline||'9').localeCompare(String(b.deadline||'9'))).slice(0,n);
}

// ---------- EVENT ----------
export const EVENT_KINDS={
 meeting:{title:'Встреча',presence:true},trip:{title:'Выезд',presence:true},vks:{title:'ВКС',presence:true},
 payment:{title:'Оплата',presence:false},checkpoint:{title:'Контрольная точка',presence:false},auto:{title:'Автоматически',presence:false},
 other:{title:'Событие',presence:true}
};
export function normalizeEvent(e){
 if(!e||!e.id||!e.start)return null;
 const start=Date.parse(e.start);if(!Number.isFinite(start))return null;
 const end=e.end?Date.parse(e.end):NaN;
 const kind=EVENT_KINDS[e.kind]?e.kind:'other';
 return {id:String(e.id),title:String(e.title||EVENT_KINDS[kind].title),kind,start:e.start,end:Number.isFinite(end)?e.end:null,
  endConfirmed:!!e.endConfirmed&&Number.isFinite(end),format:e.format==='online'||e.format==='offline'?e.format:null,
  location:e.location||null,joinUrl:/^https:\/\//.test(e.joinUrl||'')?e.joinUrl:null,project:e.project||null,source:e.source||null};
}
const TZ='Europe/Moscow';
export function timeLabel(iso){const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleTimeString('ru-RU',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}):'—';}
export function dayKey(ts){return new Date(ts).toLocaleDateString('sv-SE',{timeZone:TZ});}
// Время события без выдумки: окончание показываем, только если оно подтверждено.
export function eventWhen(e){
 const kind=EVENT_KINDS[e.kind]||EVENT_KINDS.other;
 if(!kind.presence)return {start:timeLabel(e.start),end:null,endNote:null};
 return {start:timeLabel(e.start),end:e.endConfirmed?timeLabel(e.end):null,endNote:e.endConfirmed?null:'Окончание не указано'};
}
export function eventFormat(e){return e.format==='online'?'Онлайн':e.format==='offline'?'Очно':null;}
export function eventsOfDay(events,key){return events.filter(e=>dayKey(e.start)===key).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));}
// Неделя от понедельника, в которую входит дата.
export function weekOf(ts=Date.now()){
 const key=dayKey(ts);const base=Date.parse(key+'T12:00:00+03:00');
 const wd=(new Date(base).getUTCDay()+6)%7;const days=[];
 for(let i=0;i<7;i++){const t=base+(i-wd)*86400000;days.push({key:dayKey(t),ts:t,wd:['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i],num:new Date(t).toLocaleDateString('ru-RU',{timeZone:TZ,day:'numeric'})});}
 return days;
}
export function dayTitle(key){return new Date(key+'T12:00:00+03:00').toLocaleDateString('ru-RU',{timeZone:TZ,weekday:'long',day:'numeric',month:'long'});}
// Пустой день: «свободно» только при подтверждённом источнике.
export function emptyDayText(src){
 if(confirmsAbsence(src))return 'По данным календаря событий нет';
 if(!src||src.state===SOURCE.NOT_CONNECTED)return 'Календарь не подключён — отсутствие событий не подтверждено';
 return 'Нет подтверждённых данных на этот день';
}
export function nextEvent(events,now=Date.now()){
 return [...events].filter(e=>{const end=e.endConfirmed?Date.parse(e.end):Date.parse(e.start);return end>=now;}).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))[0]||null;
}

// ---------- INBOX_ITEM ----------
export const TRIAGE={NEW:'new',LINKED:'linked',DONE:'done'};
export function normalizeInbox(x){
 if(!x||!x.id)return null;
 return {id:String(x.id),channel:x.channel||'—',receivedAt:x.receivedAt||null,type:x.type||'сообщение',project:x.project||null,
  triage:[TRIAGE.NEW,TRIAGE.LINKED,TRIAGE.DONE].includes(x.triage)?x.triage:TRIAGE.NEW,summary:x.summary||''};
}
// Прочитано ботом ≠ разобрано: разобранным считается только явный статус done.
export function unprocessed(items){return items.filter(x=>x.triage!==TRIAGE.DONE);}

// ---------- SYSTEM_NODE: живая схема ----------
// Узлы и связи: MAX/Telegram → ШТАБ → рабочие контуры → Росток → генерация → публикации.
// Уровень узла берётся только из источника. Нет данных — серый «не подтверждено».
const NODE_DEFS=[
 {id:'max',title:'MAX',card:'max',x:112,y:40,nav:'inbox',group:'Входящие каналы'},
 {id:'telegram',title:'Telegram',card:'telegram',x:248,y:40,nav:'inbox',group:'Входящие каналы'},
 {id:'system',title:'Штаб',card:'system',x:180,y:150,hub:true,group:'Компьютер штаба'},
 {id:'calendar',title:'Календарь',card:null,x:46,y:118,nav:'calendar',group:'Рабочий слой'},
 {id:'projects',title:'Проекты',card:null,x:46,y:218,nav:'projects',group:'Рабочий слой'},
 {id:'drive',title:'Документы',card:'drive',x:314,y:118,nav:'documents',group:'Рабочий слой'},
 {id:'queue',title:'ИИ-исполнители',card:'queue',x:314,y:218,group:'Исполнение'},
 {id:'workflows',title:'Автоматика',card:'workflows',x:180,y:262,nav:'workflows',group:'Исполнение'},
 {id:'rostok',title:'Росток',card:'rostok',x:62,y:352,nav:'rostok',group:'Публикации'},
 {id:'visual',title:'Генерация',card:'visual',x:180,y:352,nav:'rostok',group:'Публикации'},
 {id:'publications',title:'Публикации',card:'publications',x:298,y:352,nav:'rostok',group:'Результат'}
];
const EDGES=[['max','system'],['telegram','system'],['system','calendar'],['system','projects'],['system','drive'],['system','queue'],['system','workflows'],['system','rostok'],['rostok','visual'],['visual','publications']];
const RELATED={max:['Штаб'],telegram:['Штаб'],system:['Все проекты'],calendar:['Все проекты'],projects:['Все проекты'],drive:['Все проекты'],queue:['Штаб'],workflows:['Штаб','Росток · Привет, планета'],rostok:['Росток · Привет, планета'],visual:['Росток · Привет, планета'],publications:['Росток · Привет, планета']};

// state — экранное состояние live.js; priv — результат защищённого слоя.
export function schemeGraph(state={},priv=emptyPrivate()){
 const known=['live','stale'].includes(state.mode);
 const cards=Object.fromEntries((state.cards||[]).map(c=>[c.id,c]));
 const wf=state.workflows||[];
 const nodes=NODE_DEFS.map(d=>{
  let level='none',detail='Состояние не подтверждено источником';
  if(d.card==='workflows'){if(known&&wf.length){const bad=wf.filter(w=>w[1]!=='ok');level=bad.some(w=>w[1]==='err')?'err':bad.length?'wait':'ok';detail=(wf.length-bad.length)+' из '+wf.length+' процессов работают штатно';}}
  else if(d.card){const c=cards[d.card];if(known&&c){level=['ok','wait','err'].includes(c.level)?c.level:'none';detail=c.detail||'Нет подробностей';}}
  else{const src=d.id==='calendar'?(priv.sources?.calendar||priv.source):(priv.sources?.tasks||priv.source);level=src.state===SOURCE.LIVE?'ok':src.state===SOURCE.STALE?'wait':src.state===SOURCE.ERROR||src.state===SOURCE.OFFLINE?'err':'none';detail=sourceNote(d.id==='calendar'?'Календарь':'Реестр задач',src);}
  const issue=(state.focus||[]).find(f=>f.key===d.card||(d.card==='workflows'&&String(f.key).startsWith('wf:')));
  return {...d,level,detail,stale:state.mode==='stale',issue:issue?{text:issue.text,action:issue.action||null}:null,related:RELATED[d.id]||[]};
 });
 const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
 const edges=EDGES.map(([a,b])=>{const A=byId[a],B=byId[b];
  // Импульс идёт только по подтверждённо работающему участку свежего снимка.
  const flow=state.mode==='live'&&A.level==='ok'&&B.level==='ok';
  const stop=known&&A.level==='ok'&&(B.level==='err'||B.level==='wait');
  return {from:a,to:b,x1:A.x,y1:A.y,x2:B.x,y2:B.y,kind:flow?'flow':stop?(B.level==='err'?'stop err':'stop wait'):A.level==='none'||B.level==='none'?'unknown':'idle'};});
 const counts={ok:0,wait:0,err:0,none:0};nodes.forEach(n=>counts[n.level]++);
 return {nodes,edges,counts,known,asOf:state.asOf||null};
}
export function levelLabel(l){return l==='ok'?'Работает штатно':l==='wait'?'Требует внимания':l==='err'?'Ошибка или блокировка':'Состояние не подтверждено';}

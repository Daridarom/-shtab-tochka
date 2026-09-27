// Штаб.Точка · чтение состояния штаба без серверной части.
// Панель и MAX-приложение берут безопасную проекцию live/status.json прямо из GitHub
// (ветки telemetry и main), выбирают самую свежую и собирают экранное состояние в браузере.
// Здесь нет секретов: проекцию публикует локальный коллектор штаба, она уже очищена.

export const CDN_CACHE_SECONDS=300;
export const LIVE_URLS=[
 'https://raw.githubusercontent.com/Daridarom/shtab-tochka/telemetry/live/status.json',
 'https://raw.githubusercontent.com/Daridarom/shtab-tochka/main/live/status.json'
];
const CACHE_KEY='shtab.lastState.v1';

// ---------- вспомогательное ----------
export function level(x){return x==='error'?'err':x==='warn'||x==='unknown'?'wait':'ok';}
export function humanName(id,title){return ({system:'Компьютер штаба',visual:'Визуалы',drive:'Документы',queue:'Канал управления',rostok:'Росток',publications:'Публикации',telegram:'Telegram',max:'MAX'})[id]||title||id;}
export function moscowTime(iso,withDate){
 const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '—';
 const o={timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'};
 if(withDate){o.day='2-digit';o.month='2-digit';}
 return d.toLocaleString('ru-RU',o);
}
function moscowDate(iso){const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'}):null;}
export function slotLabel(iso,now=Date.now()){
 if(!iso)return null;
 const same=moscowDate(iso)===moscowDate(now);
 return (same?'сегодня ':'')+moscowTime(iso,!same);
}
export function ageLabel(sec){
 if(sec==null||!Number.isFinite(sec))return 'время неизвестно';
 if(sec<45)return 'только что';
 if(sec<90)return 'минуту назад';
 if(sec<3600)return Math.round(sec/60)+' мин назад';
 if(sec<86400)return Math.round(sec/3600)+' ч назад';
 return Math.round(sec/86400)+' дн назад';
}
function plural(n,one,few,many){const m=n%10,h=n%100;return n+' '+((h>=11&&h<=19)?many:m===1?one:(m>=2&&m<=4)?few:many);}
// Коллектор иногда шлёт «1 сервисов»: чиним склонение в тексте, не трогая смысл.
function short(text,n=150){text=String(text||'');return text.length>n?text.slice(0,n-1).trimEnd()+'…':text;}
function fixPlural(text){
 return String(text||'').replace(/(\d+)\s+сервисов в состоянии ошибки/g,(m,n)=>plural(+n,'сервис','сервиса','сервисов')+' в состоянии ошибки');
}

// ---------- нейтральные состояния ----------
export function offlineState(){
 return {mode:'offline',source:null,asOf:null,ageSeconds:null,ttlSeconds:120,cached:false,
  metrics:{active:null,attention:null,done:null},rostok:null,workflows:[],projects:[],
  focus:[['wait','Нет связи с источником состояния','Проверьте сеть и повторите']],
  systems:[['Обновление данных','wait','Нет связи с источником состояния']],
  events:[['Сейчас','Состояние штаба недоступно: нет связи с источником','wait']],
  inbox:[]};
}

// ---------- загрузка ----------
export async function fetchLive(urls=LIVE_URLS){
 const hits=await Promise.all(urls.map(async url=>{
  try{
   const r=await fetch(url+'?t='+Date.now(),{cache:'no-store'});
   if(!r.ok)return null;
   const raw=await r.json();
   if(!raw||!raw.generated_at)return null;
   const ts=Date.parse(raw.generated_at);
   return {raw,ts:Number.isFinite(ts)?ts:0,source:url.includes('/telemetry/')?'telemetry-branch':'main-branch'};
  }catch(e){return null;}
 }));
 return hits.filter(Boolean).sort((a,b)=>b.ts-a.ts)[0]||null;
}

function workflowRow(w){
 const ok=w.active&&w.runtime_running&&w.execution_recent&&w.last_status==='success';
 if(ok)return [w.name||w.id,'ok','Работает · последний запуск успешный'];
 if(!w.active)return [w.name||w.id,'wait','Выключен'];
 if(!w.runtime_running)return [w.name||w.id,'err','Не запущен'];
 if(w.last_status&&w.last_status!=='success')return [w.name||w.id,'err','Последний запуск завершился ошибкой'];
 if(!w.execution_recent)return [w.name||w.id,'wait','Давно не запускался'];
 return [w.name||w.id,'wait','Состояние неизвестно'];
}

export function toState(raw){
 const cards=Array.isArray(raw.cards)?raw.cards:[];
 const wfs=Array.isArray(raw.workflows)?raw.workflows:[];
 const active=wfs.filter(w=>w.active&&w.runtime_running&&w.execution_recent&&w.last_status==='success').length;
 const attention=cards.filter(c=>c.level==='warn'||c.level==='error'||c.level==='unknown').length;
 const systems=cards.map(c=>[humanName(c.id,c.title),level(c.level),fixPlural(c.detail)||'Нет подробностей']);
 const workflows=wfs.map(workflowRow);
 if(wfs.length)systems.push(['Автоматические процессы',active===wfs.length?'ok':'wait',active+' из '+wfs.length+' работают штатно']);
 const issues=cards.filter(c=>c.level!=='ok').sort((a,b)=>(a.level==='error'?0:1)-(b.level==='error'?0:1));
 // focus: [уровень, заголовок, короткое пояснение]; полный текст остаётся в systems.
 const focus=issues.map(c=>[level(c.level),humanName(c.id,c.title),short(fixPlural(c.detail)||'требует проверки')]);
 workflows.filter(w=>w[1]!=='ok').forEach(w=>focus.push([w[1],'Процесс «'+w[0]+'»',w[2]]));
 if(!focus.length)focus.push(['ok','Критичных проблем нет',plural(active,'процесс работает','процесса работают','процессов работают')+' штатно']);
 const events=[
  [moscowTime(raw.generated_at),'Состояние штаба обновлено автоматически','ok'],
  ...issues.slice(0,4).map(c=>['Сейчас',humanName(c.id,c.title)+': '+(fixPlural(c.detail)||'требует проверки'),level(c.level)])
 ];
 const inbox=issues.filter(c=>c.level==='error'||c.level==='warn').slice(0,6).map(c=>['Внимание',humanName(c.id,c.title)+': '+(fixPlural(c.detail)||'требует проверки'),level(c.level)]);
 const r=raw.rostok&&typeof raw.rostok==='object'?raw.rostok:null;
 const done=r&&Number.isFinite(r.published_today)?r.published_today:null;
 const rostok=r?{publishedToday:done,dailyLimit:r.daily_limit??null,queue:r.queue??null,nextSlot:r.next_slot??null,nextSlotLabel:slotLabel(r.next_slot),totalPublished:r.total_published??null,unresolved:r.unresolved??null}:null;
 return {mode:'live',source:null,asOf:raw.generated_at,ageSeconds:null,ttlSeconds:raw.ttl_seconds||120,cached:false,
  metrics:{active,attention,done},rostok,workflows,projects:[],focus,systems,events,inbox};
}

// ---------- кэш последнего состояния (localStorage, только безопасная проекция) ----------
function readCache(){try{const j=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return j&&j.raw&&j.raw.generated_at?j:null;}catch(e){return null;}}
function writeCache(raw,source){try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),raw,source}));}catch(e){}}

function finish(raw,source,now,offline){
 const state=toState(raw);
 state.source=source;
 const age=(now-Date.parse(raw.generated_at))/1000;
 const ageSeconds=Number.isFinite(age)?Math.max(0,Math.round(age)):null;
 state.ageSeconds=ageSeconds;
 const fresh=ageSeconds!=null&&ageSeconds<=Math.max(120,state.ttlSeconds||120)+CDN_CACHE_SECONDS;
 if(offline){
  state.mode='offline';state.cached=true;
  state.systems.unshift(['Обновление данных','err','Нет связи · показаны данные от '+moscowTime(raw.generated_at,true)]);
  state.focus.unshift(['err','Нет связи с источником','Показаны данные '+ageLabel(ageSeconds)]);
 }else if(fresh){
  state.mode='live';
  state.systems.unshift(['Обновление данных','ok','Работает автоматически · '+ageLabel(ageSeconds)]);
 }else{
  state.mode='stale';
  state.systems.unshift(['Обновление данных','wait','Данные устарели · '+ageLabel(ageSeconds)]);
  state.focus.unshift(['wait','Данные устарели','Обновлены '+ageLabel(ageSeconds)]);
 }
 return state;
}

// Главная функция: возвращает экранное состояние в одном из режимов live / stale / offline.
export async function loadState(now=Date.now()){
 const hit=await fetchLive();
 if(hit){writeCache(hit.raw,hit.source);return finish(hit.raw,hit.source,now,false);}
 const c=readCache();
 if(c)return finish(c.raw,c.source,now,true);
 return offlineState();
}
// Мгновенное состояние из кэша для первой отрисовки, пока идёт запрос.
export function cachedState(now=Date.now()){const c=readCache();return c?finish(c.raw,c.source,now,true):null;}

// Авто-обновление: сразу, по таймеру, при возврате на экран и при появлении сети.
export function startLive(onState,{interval=30000}={}){
 let timer=null,busy=false,stopped=false;
 const cached=cachedState();if(cached){cached.mode='loading';onState(cached);}
 async function refresh(){if(busy||stopped)return;busy=true;try{onState(await loadState());}catch(e){}finally{busy=false;}}
 const onVis=()=>{if(typeof document!=='undefined'&&document.visibilityState==='visible')refresh();};
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVis);
 if(typeof window!=='undefined')window.addEventListener('online',refresh);
 refresh();timer=setInterval(refresh,interval);
 return {refresh,stop(){stopped=true;clearInterval(timer);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVis);if(typeof window!=='undefined')window.removeEventListener('online',refresh);}};
}
export function describeMode(s){return s.mode==='live'?'Данные свежие':s.mode==='stale'?'Данные устарели':s.mode==='offline'?'Нет связи с источником':'Обновляем…';}

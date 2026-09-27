// Штаб.Точка · чтение состояния штаба без серверной части.
// Панель и MAX-приложение берут безопасную проекцию live/status.json прямо из GitHub
// (сначала ветка telemetry, затем main) и собирают из неё экранное состояние в браузере.
// Здесь нет секретов: проекцию публикует локальный коллектор штаба, она уже очищена.

export const CDN_CACHE_SECONDS=300;
export const LIVE_URLS=[
 'https://raw.githubusercontent.com/Daridarom/shtab-tochka/telemetry/live/status.json',
 'https://raw.githubusercontent.com/Daridarom/shtab-tochka/main/live/status.json'
];

// Нейтральное состояние, когда источник недоступен: без старых ошибок, похожих на текущие.
export function offlineState(){
 return {mode:'offline',source:null,asOf:null,ageSeconds:null,ttlSeconds:120,
  metrics:{active:null,attention:null,done:null},rostok:null,projects:[],
  systems:[['Обновление данных','wait','Нет связи с источником состояния']],
  events:[['Сейчас','Состояние штаба недоступно: нет связи с источником','wait']],
  inbox:[]};
}

// Опрашиваем все источники сразу и берём самую свежую проекцию:
// пока коллектор переходит с main на telemetry, свежей может быть любая из веток.
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

export function level(x){return x==='error'?'err':x==='warn'||x==='unknown'?'wait':'ok';}
export function humanName(id,title){return ({system:'Компьютер штаба',visual:'Визуалы',drive:'Документы',queue:'Канал управления',rostok:'Росток',publications:'Публикации',telegram:'Telegram',max:'MAX'})[id]||title||id;}
export function moscowTime(iso,withDate){
 const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '—';
 const o={timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'};
 if(withDate){o.day='2-digit';o.month='2-digit';}
 return d.toLocaleString('ru-RU',o);
}

export function toState(raw){
 const cards=Array.isArray(raw.cards)?raw.cards:[];
 const workflows=Array.isArray(raw.workflows)?raw.workflows:[];
 const active=workflows.filter(w=>w.active&&w.runtime_running&&w.execution_recent&&w.last_status==='success').length;
 const attention=cards.filter(c=>c.level==='warn'||c.level==='error'||c.level==='unknown').length;
 const systems=cards.map(c=>[humanName(c.id,c.title),level(c.level),c.detail||'Нет подробностей']);
 if(workflows.length)systems.push(['Автоматические процессы',active===workflows.length?'ok':'wait',active+' из '+workflows.length+' работают штатно']);
 const issues=cards.filter(c=>c.level!=='ok');
 const events=[
  [moscowTime(raw.generated_at),'Состояние штаба обновлено автоматически','ok'],
  ...issues.slice(0,4).map(c=>['Сейчас',humanName(c.id,c.title)+': '+(c.detail||'требует проверки'),level(c.level)])
 ];
 const inbox=issues.filter(c=>c.level==='error'||c.level==='warn').slice(0,6).map(c=>['Внимание',humanName(c.id,c.title)+': '+(c.detail||'требует проверки'),level(c.level)]);
 const rostok=raw.rostok&&typeof raw.rostok==='object'?raw.rostok:{};
 const done=Number.isFinite(rostok.published_today)?rostok.published_today:null;
 return {mode:'live',source:null,asOf:raw.generated_at,ageSeconds:null,ttlSeconds:raw.ttl_seconds||120,
  metrics:{active,attention,done},
  rostok:{publishedToday:done,dailyLimit:rostok.daily_limit??null,queue:rostok.queue??null,nextSlot:rostok.next_slot??null,totalPublished:rostok.total_published??null},
  projects:[],systems,events,inbox};
}

// Главная функция: возвращает экранное состояние в одном из режимов live / stale / offline.
export async function loadState(now=Date.now()){
 const hit=await fetchLive();
 if(!hit)return offlineState();
 const state=toState(hit.raw);
 state.source=hit.source;
 const age=(now-Date.parse(hit.raw.generated_at))/1000;
 const ageSeconds=Number.isFinite(age)?Math.max(0,Math.round(age)):null;
 state.ageSeconds=ageSeconds;
 // raw.githubusercontent.com кэширует файл до 5 минут (cache-control: max-age=300), и разные
 // клиенты видят копии разной давности; ?t= это не обходит. Поэтому «устарело» считаем
 // только когда возраст превышает TTL коллектора плюс окно кэша CDN.
 const fresh=ageSeconds!=null&&ageSeconds<=Math.max(120,state.ttlSeconds||120)+CDN_CACHE_SECONDS;
 if(fresh){
  state.mode='live';
  state.systems.unshift(['Обновление данных','ok','Работает автоматически · '+ageSeconds+' с назад']);
 }else{
  state.mode='stale';
  state.systems.unshift(['Обновление данных','wait',ageSeconds!=null?'Данные устарели · '+ageSeconds+' с назад':'Время последнего обновления неизвестно']);
 }
 return state;
}

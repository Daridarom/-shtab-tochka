// Neutral offline placeholder: shown only when the live projection cannot be fetched at all.
// It must never carry stale error rows that look like current problems.
const offline={
 mode:'offline',asOf:null,ttlSeconds:120,
 metrics:{active:null,attention:null,done:null},
 projects:[],
 systems:[['Обновление данных','wait','Нет связи с источником состояния']],
 events:[['Сейчас','Состояние штаба недоступно: нет связи с источником','wait']],
 inbox:[]
};

const LIVE_URL='https://raw.githubusercontent.com/Daridarom/-shtab-tochka/main/live/status.json';
function level(x){return x==='error'?'err':x==='warn'||x==='unknown'?'wait':'ok';}
function humanName(id,title){return ({system:'Компьютер штаба',visual:'Визуалы',drive:'Документы',queue:'Канал управления',rostok:'Росток',publications:'Публикации',telegram:'Telegram',max:'MAX'})[id]||title||id;}
function toState(raw){
 const cards=Array.isArray(raw.cards)?raw.cards:[];
 const workflows=Array.isArray(raw.workflows)?raw.workflows:[];
 const active=workflows.filter(w=>w.active&&w.runtime_running&&w.execution_recent&&w.last_status==='success').length;
 const attention=cards.filter(c=>c.level==='warn'||c.level==='error'||c.level==='unknown').length;
 const systems=cards.map(c=>[humanName(c.id,c.title),level(c.level),c.detail||'Нет подробностей']);
 if(workflows.length)systems.push(['Автоматические процессы',active===workflows.length?'ok':'wait',active+' из '+workflows.length+' работают штатно']);
 const issues=cards.filter(c=>c.level!=='ok');
 const events=[
   [new Date(raw.generated_at).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}),'Состояние штаба обновлено автоматически','ok'],
   ...issues.slice(0,4).map(c=>['Сейчас',humanName(c.id,c.title)+': '+(c.detail||'требует проверки'),level(c.level)])
 ];
 const inbox=issues.filter(c=>c.level==='error'||c.level==='warn').slice(0,6).map(c=>['Внимание',humanName(c.id,c.title)+': '+(c.detail||'требует проверки'),level(c.level)]);
 return {mode:'live',asOf:raw.generated_at,ttlSeconds:raw.ttl_seconds||120,metrics:{active,attention,done:null},systems,events,inbox};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 try{
   const r=await fetch(LIVE_URL+'?t='+Date.now(),{headers:{'User-Agent':'shtab-tochka'}});
   if(r.ok){
     const raw=await r.json();
     const age=(Date.now()-Date.parse(raw.generated_at))/1000;
     const live=toState(raw);
     if(Number.isFinite(age)&&age<=Math.max(120,raw.ttl_seconds||120))return res.status(200).json(live);
     // Stale projection: keep the last real data, but label it and flag the update channel.
     const staleSeconds=Number.isFinite(age)?Math.round(age):null;
     live.systems.unshift(['Обновление данных','wait',staleSeconds!=null?'Данные устарели · '+staleSeconds+' с назад':'Время последнего обновления неизвестно']);
     return res.status(200).json({...live,mode:'stale',staleSeconds});
   }
 }catch(e){}
 return res.status(200).json(offline);
}

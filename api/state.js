const snapshot={
 mode:'snapshot',asOf:'2026-09-27T14:17:37+03:00',ttlSeconds:120,
 metrics:{active:3,attention:4,done:null},
 projects:[
  ['AI-Штаб','Локальный ЦУП, collector и n8n работают','warn'],
  ['Привет, планета','6 визуалов готовы · 1 на согласовании · 41 заблокирован','warn'],
  ['Telegram','Получатель работает · 10 записей','ok'],
  ['MAX','Получатель работает · 504 записи','ok'],
  ['Google Drive','Свежесть контекста требует проверки','warn'],
  ['Публикации','Неясная доставка 1 · ошибок доставки 0','err']
 ],
 systems:[
  ['Система','warn','Канал управления работает · процессы работают'],
  ['Ошибки визуала','err','3 сервиса в состоянии ошибки'],
  ['Telegram','ok','Получатель работает · 10 записей'],
  ['MAX','ok','Получатель работает · 504 записи'],
  ['Google Drive','warn','Свежесть контекста требует проверки'],
  ['GitHub queue','ok','Очередь 0 · связь свежая'],
  ['Росток','warn','6 готово · 1 согласование · 41 заблокировано'],
  ['Публикации','err','Неясная доставка 1 · ошибок доставки 0'],
  ['n8n','ok','3 из 3 процессов: свежий успешный запуск'],
  ['CUP collector','ok','Локальный снимок обновляется каждые 30 секунд']
 ],
 events:[
  ['14:17','Состояние штаба обновлено','ok'],
  ['14:17','Telegram и MAX работают','ok'],
  ['14:17','Визуалы: 3 процесса требуют исправления','err'],
  ['14:17','Публикации: 1 результат нужно проверить','err'],
  ['14:17','Росток: 41 материал заблокирован · документы проверены','wait']
 ],
 inbox:[
  ['Внимание','Проверить ошибки публикаций','err'],
  ['Внимание','Разобрать failed visual-сервисы','err'],
  ['Контроль','Проверить свежесть Google Drive','wait'],
  ['Контроль','Проверить состояние Ростка','wait']
 ]
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
     if(Number.isFinite(age)&&age<=Math.max(120,raw.ttl_seconds||120))return res.status(200).json(toState(raw));
     return res.status(200).json({...snapshot,mode:'stale',asOf:raw.generated_at,staleSeconds:Math.round(age)});
   }
 }catch(e){}
 return res.status(200).json(snapshot);
}
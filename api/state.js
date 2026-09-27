const snapshot={
 mode:'snapshot',asOf:'2026-09-27T10:39:10+03:00',ttlSeconds:120,
 metrics:{active:4,attention:5,done:null},
 projects:[
  ['AI-Штаб','Локальный ЦУП, collector и n8n работают','warn'],
  ['Привет, планета','Росток требует внимания по состоянию collector','warn'],
  ['Telegram','Получатель и локальная база подтверждены','ok'],
  ['MAX','Gateway и локальная база подтверждены','ok'],
  ['Google Drive','Свежесть контекста требует проверки','warn'],
  ['Публикации','Collector зафиксировал ошибку','err']
 ],
 systems:[
  ['Система','warn','Канал управления работает · процессы работают'],
  ['Ошибки визуала','err','Есть failed visual-сервисы'],
  ['Telegram','ok','Получатель работает · данные читаются'],
  ['MAX','ok','Gateway работает · данные читаются'],
  ['Google Drive','warn','Свежесть контекста требует проверки'],
  ['GitHub queue','ok','Maintenance-связь работает'],
  ['Росток','warn','Есть состояние, требующее внимания'],
  ['Публикации','err','Есть ошибка/риск доставки по collector'],
  ['n8n','ok','shtab-n8n.service active'],
  ['CUP collector','ok','Обновляется каждые 30 секунд локально']
 ],
 events:[
  ['10:39','Collector сформировал фактический снимок состояния','ok'],
  ['10:39','Telegram и MAX подтверждены collector-ом','ok'],
  ['10:39','Visual: обнаружены failed-сервисы','err'],
  ['10:39','Публикации: collector зафиксировал проблему','err'],
  ['10:39','Drive и Росток требуют проверки','wait']
 ],
 inbox:[
  ['Внимание','Проверить ошибки публикаций','err'],
  ['Внимание','Разобрать failed visual-сервисы','err'],
  ['Контроль','Проверить свежесть Google Drive','wait'],
  ['Контроль','Проверить состояние Ростка','wait']
 ]
};
function redisConfig(){return {url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL||process.env.STORAGE_REST_API_URL,token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN||process.env.STORAGE_REST_API_TOKEN};}
async function redis(cmd){const {url,token}=redisConfig();if(!url||!token)throw new Error('storage_not_configured');const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(cmd)});if(!r.ok)throw new Error('storage_error_'+r.status);const j=await r.json();return j.result;}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');try{const raw=await redis(['GET','shtab:state']);if(raw){const live=JSON.parse(raw);return res.status(200).json({...live,mode:'live'});}}catch(e){}return res.status(200).json(snapshot);}
const snapshot={
 mode:'snapshot',asOf:'2026-09-27T10:41:45+03:00',ttlSeconds:120,
 metrics:{active:3,attention:5,done:null},
 projects:[
  ['AI-Штаб','Локальный ЦУП, collector и n8n работают','warn'],
  ['Привет, планета','6 визуалов готовы · 1 на согласовании · 41 заблокирован','warn'],
  ['Telegram','Получатель работает · 10 записей','ok'],
  ['MAX','Получатель работает · 504 записи','ok'],
  ['Google Drive','Свежесть контекста требует проверки','warn'],
  ['Публикации','Ошибок доставки 0 · контрольный статус требует внимания','err']
 ],
 systems:[
  ['Система','warn','Канал управления работает · процессы работают'],
  ['Ошибки визуала','err','3 сервиса в состоянии ошибки'],
  ['Telegram','ok','Получатель работает · 10 записей'],
  ['MAX','ok','Получатель работает · 504 записи'],
  ['Google Drive','warn','Свежесть контекста требует проверки'],
  ['GitHub queue','ok','Очередь 0 · связь свежая'],
  ['Росток','warn','6 готово · 1 согласование · 41 заблокировано'],
  ['Публикации','err','Ошибок доставки 0 · контрольный статус требует внимания'],
  ['n8n','ok','3 из 3 процессов: свежий успешный запуск'],
  ['CUP collector','ok','Локальный снимок обновляется каждые 30 секунд']
 ],
 events:[
  ['10:41','Collector сформировал фактический снимок состояния','ok'],
  ['10:41','Telegram 10 · MAX 504 записей','ok'],
  ['10:41','Visual: 3 failed-сервиса','err'],
  ['10:41','Публикации: ошибок доставки 0, контроль требует внимания','err'],
  ['10:41','Росток: 41 заблокировано · Drive: предупреждение','wait']
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
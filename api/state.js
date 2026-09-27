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
function redisConfig(){return {url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL||process.env.STORAGE_REST_API_URL,token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN||process.env.STORAGE_REST_API_TOKEN};}
async function redis(cmd){const {url,token}=redisConfig();if(!url||!token)throw new Error('storage_not_configured');const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(cmd)});if(!r.ok)throw new Error('storage_error_'+r.status);const j=await r.json();return j.result;}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');try{const raw=await redis(['GET','shtab:state']);if(raw){const live=JSON.parse(raw);return res.status(200).json({...live,mode:'live'});}}catch(e){}return res.status(200).json(snapshot);}
// Штаб.Точка · защищённый слой ЦУП (Yandex Cloud Functions, Node.js 22, без зависимостей).
// Отдаёт приватный снимок (события, задачи, входящие) только владельцу, открывшему ЦУП внутри MAX.
// Проверка: подпись данных запуска мини-приложения MAX (dev.max.ru/docs/webapps/validation),
// свежесть auth_date и user.id из списка разрешённых. Снимок лежит в закрытом бакете Object Storage.
//
// Переменные окружения (секрет — только через Lockbox, не в коде и не в репозитории):
//   MAX_BOT_TOKEN      — токен бота MAX (из Lockbox)
//   ALLOWED_USER_IDS   — id пользователей MAX через запятую
//   BUCKET             — имя закрытого бакета
//   OBJECT_KEY         — путь снимка, по умолчанию private/snapshot.json
//   ALLOWED_ORIGIN     — откуда разрешён запрос, по умолчанию https://daridarom.github.io
//   INIT_MAX_AGE       — сколько секунд действительны данные запуска, по умолчанию 86400
'use strict';
const crypto=require('crypto');

function parseInitData(raw){
 const pairs=[];
 for(const part of String(raw||'').split('&')){
  if(!part)continue;const i=part.indexOf('=');if(i<1)continue;
  pairs.push([decodeURIComponent(part.slice(0,i)),decodeURIComponent(part.slice(i+1).replace(/\+/g,'%20'))]);
 }
 return pairs;
}
// Возвращает {ok, reason, userId}. now — секунды.
function verifyInitData(raw,botToken,{maxAge=86400,now=Math.floor(Date.now()/1000)}={}){
 if(!raw||!botToken)return {ok:false,reason:'no_init_data'};
 const pairs=parseInitData(raw);
 const hash=(pairs.find(([k])=>k==='hash')||[])[1];
 if(!hash||!/^[0-9a-f]{64}$/i.test(hash))return {ok:false,reason:'no_hash'};
 const check=pairs.filter(([k])=>k!=='hash').sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>k+'='+v).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(botToken).digest();
 const calc=crypto.createHmac('sha256',secret).update(check).digest();
 const got=Buffer.from(hash,'hex');
 if(got.length!==calc.length||!crypto.timingSafeEqual(got,calc))return {ok:false,reason:'bad_signature'};
 const authDate=Number((pairs.find(([k])=>k==='auth_date')||[])[1]);
 if(!Number.isFinite(authDate)||now-authDate>maxAge||authDate-now>300)return {ok:false,reason:'expired'};
 let user=null;try{user=JSON.parse((pairs.find(([k])=>k==='user')||[])[1]||'null');}catch(e){}
 if(!user||user.id==null)return {ok:false,reason:'no_user'};
 return {ok:true,userId:String(user.id)};
}

function headersFor(origin,allowed){
 const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin===allowed){h['Access-Control-Allow-Origin']=allowed;h['Access-Control-Allow-Headers']='X-Max-Init-Data';h['Access-Control-Allow-Methods']='GET, OPTIONS';h['Access-Control-Max-Age']='600';}
 return h;
}
const reply=(code,body,h)=>({statusCode:code,headers:h,body:JSON.stringify(body)});

async function handler(event,context){
 const env=process.env;
 const allowed=env.ALLOWED_ORIGIN||'https://daridarom.github.io';
 const hdr=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
 const h=headersFor(hdr.origin,allowed);
 if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:h,body:''};
 if(event.httpMethod!=='GET')return reply(405,{error:'method'},h);
 const v=verifyInitData(hdr['x-max-init-data'],env.MAX_BOT_TOKEN,{maxAge:Number(env.INIT_MAX_AGE)||86400});
 // Причину отказа отдаём общим кодом, без подробностей о проверке.
 if(!v.ok)return reply(401,{error:'unauthorized'},h);
 const ids=String(env.ALLOWED_USER_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!ids.includes(v.userId))return reply(403,{error:'forbidden'},h);
 const token=context&&context.token&&context.token.access_token;
 if(!token||!env.BUCKET)return reply(500,{error:'not_configured'},h);
 const key=(env.OBJECT_KEY||'private/snapshot.json').split('/').map(encodeURIComponent).join('/');
 let r;
 try{r=await fetch(`https://storage.yandexcloud.net/${encodeURIComponent(env.BUCKET)}/${key}`,{headers:{'X-YaCloud-SubjectToken':token}});}
 catch(e){return reply(502,{error:'storage_unreachable'},h);}
 if(r.status===404)return reply(404,{error:'no_snapshot'},h);
 if(!r.ok)return reply(502,{error:'storage_'+r.status},h);
 const text=await r.text();
 try{const j=JSON.parse(text);if(j.schema!=='private-1')return reply(502,{error:'bad_snapshot'},h);}catch(e){return reply(502,{error:'bad_snapshot'},h);}
 return {statusCode:200,headers:h,body:text};
}

module.exports={handler,verifyInitData,parseInitData};

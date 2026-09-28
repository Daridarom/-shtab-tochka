import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url);
const gw=require('../cloud/private-gateway/index.js');

// Подписываем данные запуска так, как это делает MAX (dev.max.ru/docs/webapps/validation).
const TOKEN='test-token-not-real';
function sign(fields,token=TOKEN){
 const check=Object.keys(fields).sort().map(k=>k+'='+fields[k]).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
 const hash=crypto.createHmac('sha256',secret).update(check).digest('hex');
 return Object.entries({...fields,hash}).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
}
const now=1790630000;
const good=sign({auth_date:String(now-60),query_id:'q1',user:JSON.stringify({id:42,first_name:'Тест'})});
assert.deepEqual(gw.verifyInitData(good,TOKEN,{now}),{ok:true,userId:'42'});
assert.equal(gw.verifyInitData(good,'другой',{now}).reason,'bad_signature');
assert.equal(gw.verifyInitData(good.replace('q1','q2'),TOKEN,{now}).reason,'bad_signature');
assert.equal(gw.verifyInitData(sign({auth_date:String(now-90000),user:'{"id":42}'}),TOKEN,{now}).reason,'expired');
assert.equal(gw.verifyInitData('',TOKEN,{now}).reason,'no_init_data');
assert.equal(gw.verifyInitData(sign({auth_date:String(now)}),TOKEN,{now}).reason,'no_user');

// Обработчик: без подписи — 401, чужой id — 403, CORS только для сайта ЦУП, снимок читается с IAM-токеном функции.
process.env.MAX_BOT_TOKEN=TOKEN;process.env.ALLOWED_USER_IDS='42';process.env.BUCKET='b';
const realNow=Date.now;Date.now=()=>now*1000;
const snap={schema:'private-1',generated_at:'2026-09-28T21:00:00Z',events:[],tasks:[],inbox:[]};
let seen=null;global.fetch=async(url,opt)=>{seen={url,opt};return new Response(JSON.stringify(snap),{status:200});};
const ev=(h,m='GET')=>({httpMethod:m,headers:h});
const ctx={token:{access_token:'iam-token'}};
let r=await gw.handler(ev({Origin:'https://daridarom.github.io'}),ctx);assert.equal(r.statusCode,401);assert.equal(r.headers['Access-Control-Allow-Origin'],'https://daridarom.github.io');
r=await gw.handler(ev({Origin:'https://evil.example','X-Max-Init-Data':good}),ctx);assert.equal(r.statusCode,200);assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);
r=await gw.handler(ev({'x-max-init-data':good}),ctx);assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).schema,'private-1');
assert.equal(seen.url,'https://storage.yandexcloud.net/b/private/snapshot.json');assert.equal(seen.opt.headers['X-YaCloud-SubjectToken'],'iam-token');
assert.equal(r.headers['Cache-Control'],'no-store');
process.env.ALLOWED_USER_IDS='7';r=await gw.handler(ev({'x-max-init-data':good}),ctx);assert.equal(r.statusCode,403);
process.env.ALLOWED_USER_IDS='42';
global.fetch=async()=>new Response('',{status:404});r=await gw.handler(ev({'x-max-init-data':good}),ctx);assert.equal(r.statusCode,404);
global.fetch=async()=>new Response('{"schema":"x"}',{status:200});r=await gw.handler(ev({'x-max-init-data':good}),ctx);assert.equal(r.statusCode,502);
assert.equal((await gw.handler(ev({},'POST'),ctx)).statusCode,405);
assert.equal((await gw.handler(ev({Origin:'https://daridarom.github.io'},'OPTIONS'),ctx)).statusCode,204);
Date.now=realNow;

// Клиент: без адреса — «не подключён»; вне MAX — понятная причина; сбой не стирает последний снимок.
const dir=new URL('../public/',import.meta.url);
const src=(await readFile(new URL('private-source.js',dir),'utf8')).replace("'./model.js'","'"+new URL('model.js',dir).href+"'");
const P=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
assert.equal((await P.loadPrivate({url:''})).source.state,'not_connected');
const noMax=await P.loadPrivate({url:'https://f',initData:''});assert.equal(noMax.source.state,'not_connected');assert.match(noMax.source.reason,/внутри MAX/);
const ok=await P.loadPrivate({url:'https://f',initData:'x',now:Date.parse('2026-09-28T21:00:30Z'),fetchFn:async()=>new Response(JSON.stringify({...snap,events:[{id:'e',start:'2026-09-29T10:00:00+03:00',kind:'meeting'}]}))});
assert.equal(ok.source.state,'live');assert.equal(ok.events.length,1);
const down=await P.loadPrivate({url:'https://f',initData:'x',prev:ok,fetchFn:async()=>{throw new Error('net');}});
assert.equal(down.source.state,'offline');assert.equal(down.events.length,1);
assert.equal((await P.loadPrivate({url:'https://f',initData:'x',fetchFn:async()=>new Response('',{status:403})})).source.reason,'Этому аккаунту MAX доступ не выдан');
console.log('PASS: MAX signature checked, only allowed user gets the snapshot, CORS limited to CUP, client keeps honest states');

// Штаб.Точка · клиент защищённого рабочего слоя.
// События, задачи и входящие никогда не читаются из public live/status.json.
// Сервер принимает подписанный MAX initData, валидирует его с BOT_TOKEN и только затем отдаёт private-1.
import {fromPrivateSnapshot,privateUnavailable,SOURCE} from './model.js';

const CONFIG_URL=new URL('./private-config.json',import.meta.url);

export async function loadPrivateConfig(){
 try{
  const r=await fetch(CONFIG_URL,{cache:'no-store'});
  if(!r.ok)return {endpoint:null};
  const j=await r.json();
  const endpoint=typeof j?.endpoint==='string'?j.endpoint.trim():'';
  if(!endpoint)return {endpoint:null};
  const u=new URL(endpoint);
  if(u.protocol!=='https:')return {endpoint:null};
  return {endpoint:u.toString()};
 }catch(e){return {endpoint:null};}
}

export async function loadPrivate(getInitData,now=Date.now()){
 if(typeof window!=='undefined'&&import.meta.env?.DEV&&window.__SHTAB_PRIVATE__)return fromPrivateSnapshot(window.__SHTAB_PRIVATE__,now);
 const cfg=await loadPrivateConfig();
 if(!cfg.endpoint)return privateUnavailable('Защищённый сервер календаря ещё не подключён',SOURCE.NOT_CONNECTED);
 let initData='';
 try{initData=String(getInitData?.()||'');}catch(e){}
 if(!initData)return privateUnavailable('Для доступа к личному календарю откройте ЦУП внутри MAX',SOURCE.NOT_CONNECTED);
 try{
  const r=await fetch(cfg.endpoint,{
   method:'POST',
   headers:{'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify({initData}),
   cache:'no-store',
   credentials:'omit',
   referrerPolicy:'no-referrer'
  });
  if(r.status===401||r.status===403)return privateUnavailable('MAX не подтвердил доступ владельца',SOURCE.ERROR);
  if(!r.ok)return privateUnavailable('Защищённый сервер календаря недоступен · HTTP '+r.status,SOURCE.OFFLINE);
  const raw=await r.json();
  return fromPrivateSnapshot(raw,now);
 }catch(e){
  return privateUnavailable('Нет связи с защищённым сервером календаря',SOURCE.OFFLINE);
 }
}

export function startPrivate(onState,{getInitData,interval=60000}={}){
 let timer=null,busy=false,stopped=false;
 async function refresh(){
  if(busy||stopped)return;
  busy=true;
  try{onState(await loadPrivate(getInitData));}finally{busy=false;}
 }
 const onVis=()=>{if(typeof document!=='undefined'&&document.visibilityState==='visible')refresh();};
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVis);
 if(typeof window!=='undefined')window.addEventListener('online',refresh);
 refresh();
 timer=setInterval(refresh,interval);
 return {refresh,stop(){stopped=true;clearInterval(timer);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVis);if(typeof window!=='undefined')window.removeEventListener('online',refresh);}};
}

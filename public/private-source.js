// Штаб.Точка · клиент защищённого слоя. Адрес функции не секрет; доступ даёт только подпись запуска MAX.
// Пока адрес пустой, слой честно «не подключён». Данные держим только в памяти страницы.
import {SOURCE,emptyPrivate,fromPrivateSnapshot} from './model.js';
export const PRIVATE_URL='';
const REASON={
 no_url:null,
 no_max:'Приватные данные открываются только внутри MAX',
 unauthorized:'MAX не подтвердил вход — перезапустите ЦУП из бота',
 forbidden:'Этому аккаунту MAX доступ не выдан',
 no_snapshot:'Снимок ещё не выгружен компьютером Штаба',
 network:'Нет связи с защищённым слоем',
 server:'Ошибка защищённого слоя'
};
export function privateError(kind,prev){
 // При сбое оставляем последний подтверждённый снимок, но честно помечаем состояние.
 const state=kind==='network'?SOURCE.OFFLINE:SOURCE.ERROR;
 if(prev&&prev.events&&prev.source.asOf)return {...prev,source:{...prev.source,state,reason:REASON[kind]}};
 return {...emptyPrivate(),source:{state:kind==='no_max'?SOURCE.NOT_CONNECTED:state,reason:REASON[kind],ageSeconds:null,asOf:null}};
}
export async function loadPrivate({url=PRIVATE_URL,initData,prev=null,now=Date.now(),fetchFn=fetch}={}){
 if(!url)return emptyPrivate();
 if(!initData)return privateError('no_max',null);
 let r;
 try{r=await fetchFn(url,{headers:{'X-Max-Init-Data':initData},cache:'no-store'});}
 catch(e){return privateError('network',prev);}
 if(r.status===401)return privateError('unauthorized',prev);
 if(r.status===403)return privateError('forbidden',prev);
 if(r.status===404)return privateError('no_snapshot',prev);
 if(!r.ok)return privateError('server',prev);
 try{return fromPrivateSnapshot(await r.json(),now);}catch(e){return privateError('server',prev);}
}

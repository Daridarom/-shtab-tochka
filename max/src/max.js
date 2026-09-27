// Мост MAX (window.WebApp): всё опционально и в try/catch, вне MAX приложение работает как обычный сайт.
import {useEffect,useState} from 'react';
export const bridge=()=>(typeof window!=='undefined'&&window.WebApp)||null;
export function haptic(kind='light'){
 try{const h=bridge()?.HapticFeedback;if(!h)return;
  if(kind==='select')h.selectionChanged?.();
  else if(kind==='success'||kind==='warning'||kind==='error')h.notificationOccurred?.(kind);
  else h.impactOccurred?.(kind);
 }catch(e){}
}
export function useBackButton(visible,onBack){
 useEffect(()=>{
  const b=bridge()?.BackButton;if(!b)return;
  try{if(visible){b.onClick?.(onBack);b.show?.();}else{b.hide?.();}}catch(e){}
  return()=>{try{b.offClick?.(onBack);}catch(e){}};
 },[visible,onBack]);
}
function systemScheme(){try{return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}catch(e){return 'dark';}}
export function useMaxColorScheme(){
 const [s,setS]=useState(()=>bridge()?.colorScheme||systemScheme());
 useEffect(()=>{
  const w=bridge();const upd=()=>setS(bridge()?.colorScheme||systemScheme());
  try{w?.onEvent?.('themeChanged',upd);}catch(e){}
  let mq=null;try{mq=matchMedia('(prefers-color-scheme: light)');mq.addEventListener?.('change',upd);}catch(e){}
  return()=>{try{w?.offEvent?.('themeChanged',upd);}catch(e){}try{mq?.removeEventListener?.('change',upd);}catch(e){}};
 },[]);
 return s==='light'?'light':'dark';
}

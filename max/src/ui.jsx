// Общие элементы интерфейса MAX-ЦУП.
import {useEffect} from 'react';
import {Container,Flex,Typography} from '@maxhub/max-ui';
import {haptic} from './max.js';
import {sourceLevel,sourceLabel,sourceNote} from '../../public/model.js';

export function Row({dot,title,text,time,onClick}){
 const inner=<>{time!=null&&<time>{time}</time>}<span className={'dot '+dot}/><div><b>{title}</b>{text&&<small>{text}</small>}</div></>;
 if(onClick)return <button type="button" className="row rowBtn" onClick={()=>{haptic('select');onClick();}}>{inner}<i className="chev">›</i></button>;
 return <Flex className="row" gap={10}>{inner}</Flex>;
}
export function Empty({text}){return <p className="empty">{text}</p>;}
export function Card({title,aside,className='',children,id}){return <Container className={'card '+className} id={id}>{(title||aside)&&<div className="head"><Typography.Title variant="small-strong">{title}</Typography.Title>{aside&&<span className="aside">{aside}</span>}</div>}{children}</Container>;}
export function Seg({items,value,onChange,label}){
 return <div className="seg" role="tablist" aria-label={label}>{items.map(([id,t])=><button type="button" role="tab" aria-selected={value===id} key={id} className={value===id?'active':''} onClick={()=>{if(value!==id){haptic('select');onChange(id);}}}>{t}</button>)}</div>;
}
// Строка состояния источника: честно называет, откуда данные и насколько они свежие.
export function SourceLine({name,src,compact}){
 const lv=sourceLevel(src?.state);
 return <div className={'source '+lv+(compact?' compact':'')}><span className={'dot '+lv}/><div><b>{name}<em>{sourceLabel(src?.state)}</em></b>{!compact&&<small>{sourceNote(name,src)}</small>}</div></div>;
}
// Нижняя карточка: закрывается по фону, по Escape и нативной кнопкой «Назад» MAX (её ведёт App).
export function Sheet({title,onClose,children}){
 useEffect(()=>{
  const onKey=e=>{if(e.key==='Escape')onClose();};
  document.addEventListener('keydown',onKey);
  const prev=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prev;};
 },[onClose]);
 return <div className="sheetLayer" role="dialog" aria-modal="true" aria-label={title}>
  <div className="backdrop" onClick={onClose}/>
  <section className="sheet"><div className="grab" aria-hidden="true"/>
   <div className="sheetHead"><h2>{title}</h2><button type="button" className="close" onClick={onClose} aria-label="Закрыть">×</button></div>
   <div className="sheetBody">{children}</div>
  </section>
 </div>;
}
export function Field({k,children}){return children==null||children===''?null:<div className="field"><small>{k}</small><div>{children}</div></div>;}
export function Chip({children,tone=''}){return <span className={'chip '+tone}>{children}</span>;}
export function openExternal(url){try{const w=window.WebApp;if(w?.openLink){w.openLink(url);return;}}catch(e){}window.open(url,'_blank','noopener');}

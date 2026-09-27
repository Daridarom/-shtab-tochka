import {useEffect,useRef,useState,useCallback} from 'react';
import {Panel,Grid,Container,Flex,Typography} from '@maxhub/max-ui';
import {startLive,describeMode,ageLabel,moscowTime} from '../../public/live.js';
import {projectTree} from '../../public/projects.js';
import {haptic,useBackButton} from './max.js';

const TABS=[['home','Главная'],['projects','Проекты'],['systems','Системы'],['inbox','Входящие']];
const store={get(k,d){try{return localStorage.getItem(k)??d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const initial={mode:'loading',verdict:null,notice:null,metrics:{active:null,total:null,attention:null,done:null,dailyLimit:null,nextSlotLabel:null,problems:null,oldest:null},focus:[],systems:[],workflows:[],events:[],inbox:[],rostok:null,ageSeconds:null,asOf:null,loadedAt:Date.now()};

function Row({dot,title,text,time}){return <Flex className="row" gap={10}><>{time!=null&&<time>{time}</time>}<span className={'dot '+dot}/><div><b>{title}</b>{text&&<small>{text}</small>}</div></></Flex>;}
function Empty({text}){return <p className="empty">{text}</p>;}
function Card({title,aside,className='',children}){return <Container className={'card '+className}>{(title||aside)&&<div className="head"><Typography.Title variant="small-strong">{title}</Typography.Title>{aside&&<span className="aside">{aside}</span>}</div>}{children}</Container>;}
function RefreshIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>;}

function Issue({it}){
 return <div className={'focusRow '+it.level}><span className={'dot '+it.level}/><div>
  <b>{it.title}</b><small>{it.text}</small>
  {it.action&&<em className="act"><span>Что сделать:</span> {it.action}</em>}
  <i className="since">{it.sinceLabel}{it.sinceTime&&it.sinceLabel!=='только что замечено'?' · с '+it.sinceTime:''}</i>
  {it.details&&<details><summary>Подробности</summary><p>{it.details}</p></details>}
 </div></div>;
}
function Focus({s}){
 const n=s.focus.length;
 return <Card title="Нужно внимание" aside={n?n+' '+(n===1?'пункт':n<5?'пункта':'пунктов'):(s.mode==='loading'?'':'всё спокойно')} className={'span2 focus '+(s.verdict?.level||'')}>
  {n?s.focus.map(it=><Issue key={it.key} it={it}/>):<div className="focusRow ok"><span className="dot ok"/><div><b>{s.mode==='loading'?'Получаем состояние штаба':'Критичных проблем нет'}</b>{s.mode!=='loading'&&s.metrics.active!=null&&<small>{s.metrics.active} из {s.metrics.total} процессов работают штатно</small>}</div></div>}
 </Card>;
}
function Metrics({s}){
 const m=s.metrics;
 const cells=[['Проблемы',m.problems??'—',m.problems?m.oldest:'нет'],['Сделано сегодня',m.done!=null?m.done+(m.dailyLimit?' из '+m.dailyLimit:''):'—','публикаций'],['Следующий слот',m.nextSlotLabel||'—','публикация']];
 return <Grid cols={3} gap={8} className="span2">{cells.map(([k,v,d])=><Container className="metric" key={k}><Typography.Label variant="small">{k}</Typography.Label><div className="metricValue">{v}</div><small>{d}</small></Container>)}</Grid>;
}
function Rostok({r}){
 if(!r)return null;
 const stat=(k,v)=><div className="stat" key={k}><small>{k}</small><b>{v??'—'}</b></div>;
 return <Card title="Росток · публикации" aside={r.unresolved?'есть неясные':'по плану'}>
  <div className="stats">{stat('Сегодня',r.publishedToday!=null&&r.dailyLimit!=null?r.publishedToday+' из '+r.dailyLimit:r.publishedToday)}{stat('В очереди',r.queue)}{stat('Следующий слот',r.nextSlotLabel)}{stat('Всего опубликовано',r.totalPublished)}</div>
 </Card>;
}
function Workflows({list}){
 return <Card title="Автоматические процессы" aside={list.length?list.filter(w=>w[1]==='ok').length+' из '+list.length:''}>
  {list.length?list.map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>):<Empty text="Список процессов появится после первого обновления"/>}
 </Card>;
}
function Feed({events}){return <Card title="Оперативная лента">{events.length?events.map((x,i)=><Row key={i} time={x[0]} dot={x[2]} title={x[1]}/>):<Empty text="История появится после первого обновления"/>}</Card>;}
function Systems({s}){
 const bad=s.systems.filter(x=>x[1]!=='ok'),good=s.systems.filter(x=>x[1]==='ok');
 if(!s.systems.length)return <Card title="Системы"><Empty text="Ждём первое обновление состояния"/></Card>;
 return <>
  {bad.length>0&&<Card title="Требуют внимания" aside={String(bad.length)}>{bad.map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>)}</Card>}
  <Card title="Работают штатно" aside={String(good.length)}>{good.length?good.map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>):<Empty text="Пока ничего не подтверждено"/>}</Card>
 </>;
}
function Inbox({s}){
 return <Card title="Входящие" aside={s.focus.length?String(s.focus.length):''}>{s.focus.length?s.focus.map(it=><Issue key={it.key} it={it}/>):<Empty text={s.mode==='live'||s.mode==='stale'?'Критичных сигналов нет. Всё, что требует внимания, появится здесь.':'Список появится после первого обновления'}/>}</Card>;
}
function Projects(){
 const [path,setPath]=useState(()=>{try{return JSON.parse(store.get('shtab.max.path','[]'))||[];}catch(e){return [];}});
 useEffect(()=>{store.set('shtab.max.path',JSON.stringify(path));},[path]);
 const back=useCallback(()=>{haptic('light');setPath(p=>p.slice(0,-1));},[]);
 useBackButton(path.length>0,back);
 let nodes=projectTree,node=null;
 for(const id of path){node=nodes.find(x=>x.id===id);if(!node){nodes=[];break;}nodes=node.children||[];}
 return <Card className="projects">
  {path.length>0&&<button type="button" className="back" onClick={back}>‹ Назад</button>}
  <Typography.Title variant="small-strong">{node?node.name:'Проекты'}</Typography.Title>
  {node?.desc&&<p className="desc">{node.desc}</p>}
  {nodes.length===0&&node&&<Empty text="Задачи, сроки и документы этого проекта подключаются отдельным слоем. Неподтверждённые данные здесь не показываются."/>}
  {nodes.map((x,i)=><button type="button" className="project" key={x.id} onClick={()=>{haptic('select');setPath([...path,x.id]);}}><span className="num">{String(i+1).padStart(2,'0')}</span><div><b>{x.name}</b><small>{x.desc||''}</small></div><i>{x.children?.length?'›':'•'}</i></button>)}
 </Card>;
}

export default function App(){
 const [s,setS]=useState(initial);
 const [tab,setTabState]=useState(()=>TABS.some(t=>t[0]===store.get('shtab.max.tab'))?store.get('shtab.max.tab'):'home');
 const [busy,setBusy]=useState(false);
 const [,setTick]=useState(0);
 const live=useRef(null);
 useEffect(()=>{live.current=startLive(d=>setS({...d,loadedAt:Date.now()}));const id=setInterval(()=>setTick(t=>t+1),1000);return()=>{live.current?.stop();clearInterval(id);};},[]);
 const setTab=id=>{haptic('select');setTabState(id);store.set('shtab.max.tab',id);try{scrollTo({top:0});}catch(e){}};
 const onRefresh=async()=>{if(busy)return;haptic('light');setBusy(true);try{await live.current?.refresh();}finally{setBusy(false);}};
 const age=s.ageSeconds==null?null:s.ageSeconds+Math.max(0,Math.round((Date.now()-s.loadedAt)/1000));
 const status=s.mode==='loading'?'Обновляем…':describeMode(s)+(age!=null?' · '+ageLabel(age):'')+(s.asOf?' · '+moscowTime(s.asOf):'');
 return <Panel mode="secondary" className={'shell mode-'+s.mode}>
  <header className="top">
   <div><Typography.Label variant="small" className="eyebrow">ШТАБ.ТОЧКА · MAX</Typography.Label><Typography.Title variant="large-strong" className="title">Центр управления</Typography.Title><small className={'status '+s.mode}>{status}</small></div>
   <button type="button" className={'refresh'+(busy||s.mode==='loading'?' spin':'')} onClick={onRefresh} aria-label="Обновить"><RefreshIcon/></button>
  </header>
  {s.verdict&&<div className={'verdict '+s.verdict.level}><span className={'dot '+s.verdict.level}/>{s.verdict.text}</div>}
  {s.notice&&<div className={'notice '+s.notice.level}>{s.notice.text}</div>}
  {tab==='home'&&<div className="home"><Focus s={s}/><Metrics s={s}/><Rostok r={s.rostok}/><Workflows list={s.workflows}/><Feed events={s.events}/></div>}
  {tab==='projects'&&<Projects/>}
  {tab==='systems'&&<div className="home"><Systems s={s}/></div>}
  {tab==='inbox'&&<Inbox s={s}/>}
  <nav>{TABS.map(([id,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{t}{id==='inbox'&&s.focus.length>0&&<em className="badge">{s.focus.length}</em>}</button>)}</nav>
 </Panel>;
}

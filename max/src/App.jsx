import {useEffect,useRef,useState,useCallback,useMemo} from 'react';
import {Panel,Grid,Container,Flex,Typography} from '@maxhub/max-ui';
import {startLive,describeMode,ageLabel,moscowTime} from '../../public/live.js';
import {documentView,normalizeMaxState,channelViews} from '../../public/section-state.js';
import {projectTree} from '../../public/projects.js';
import {haptic,useBackButton} from './max.js';
import {startStarfield} from '../../public/starfield.js';
import {orbitSVG,orbitNodes} from '../../public/orbit.js';

const TABS=[['home','Сегодня'],['calendar','Календарь'],['projects','Проекты'],['systems','Системы'],['inbox','Входящие']];
const store={get(k,d){try{return localStorage.getItem(k)??d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const initial={mode:'loading',verdict:null,notice:null,cards:[],metrics:{active:null,total:null,attention:null,done:null,dailyLimit:null,nextSlotLabel:null,problems:null,oldest:null},focus:[],systems:[],workflows:[],events:[],inbox:[],rostok:null,ageSeconds:null,asOf:null,loadedAt:Date.now()};

function Row({dot,title,text,time}){return <Flex className="row" gap={10}><>{time!=null&&<time>{time}</time>}<span className={'dot '+dot}/><div><b>{title}</b>{text&&<small>{text}</small>}</div></></Flex>;}
function Empty({text}){return <p className="empty">{text}</p>;}
function Card({title,aside,className='',children}){return <Container className={'card '+className}>{(title||aside)&&<div className="head"><Typography.Title variant="small-strong">{title}</Typography.Title>{aside&&<span className="aside">{aside}</span>}</div>}{children}</Container>;}
function Starfield({theme}){const ref=useRef(null);useEffect(()=>{const h=startStarfield(ref.current,{theme});return()=>h.stop();},[theme]);return <canvas ref={ref} className="stars" aria-hidden="true"/>;}
function ThemeIcon({setting}){
 if(setting==='light')return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
 if(setting==='dark')return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>;
}
function OrbitCard({s,onDocuments}){
 const [sel,setSel]=useState(null);
 const nodes=useMemo(()=>orbitNodes(s),[s]);
 const key=nodes.map(n=>n.id+n.level).join('|');
 const html=useMemo(()=>nodes.length?orbitSVG(nodes,{selected:sel}):'',[key,sel]);
 const onClick=e=>{const g=e.target.closest('[data-node]');if(!g)return;haptic('select');setSel(g.dataset.node===sel?null:g.dataset.node);};
 const cur=nodes.find(n=>n.id===sel);const issue=cur&&s.focus.find(f=>f.key===cur.id);
 const bad=nodes.filter(n=>n.level!=='ok').length;
 return <Card title="Схема связей" aside={nodes.length?(bad?bad+' из '+nodes.length+' с сигналом':'все каналы в норме'):''} className="span2 hud orbitCard">
  {nodes.length?<div className="orbitWrap" onClick={onClick} dangerouslySetInnerHTML={{__html:html}}/>:<Empty text="Схема появится после первого обновления"/>}
  {cur?<div className={'orbitInfo '+cur.level}><b>{cur.title}</b><small>{issue?issue.text:cur.detail}</small>{issue?.action&&<em className="act"><span>Что сделать:</span> {issue.action}</em>}{cur.id==='drive'&&<button type="button" className="back" onClick={onDocuments}>Открыть документы</button>}</div>:nodes.length>0&&<div className="orbitInfo muted"><small>Нажми на узел, чтобы увидеть его состояние</small></div>}
 </Card>;
}
function RefreshIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>;}

function Issue({it}){
 return <div className={'focusRow '+it.level}><span className={'dot '+it.level}/><div>
  <b>{it.title}</b><small>{it.text}</small>
  {it.action&&<em className="act"><span>Что сделать:</span> {it.action}</em>}
  <i className="since">На этом устройстве: {it.sinceLabel}{it.sinceTime&&it.sinceLabel!=='только что замечено'?' · с '+it.sinceTime:''}</i>
  {it.details&&<details><summary>Подробности</summary><p>{it.details}</p></details>}
 </div></div>;
}
function Focus({s}){
 const n=s.focus.length;
 const known=['live','stale'].includes(s.mode);
 const calm=known?(s.mode==='stale'?'В последнем снимке критичных проблем нет':'Критичных проблем нет'):(s.mode==='loading'?'Получаем состояние штаба':'Состояние пока не подтверждено');
 return <Card title="Нужно внимание" aside={n?n+' '+(n===1?'пункт':n<5?'пункта':'пунктов'):(known?'по данным снимка':'нет данных')} className={'span2 hud focus '+(s.verdict?.level||'')}>
  {n?s.focus.map(it=><Issue key={it.key} it={it}/>):<div className={'focusRow '+(known?'ok':'wait')}><span className={'dot '+(known?'ok':'wait')}/><div><b>{calm}</b>{known&&s.metrics.active!=null&&<small>{s.metrics.active} из {s.metrics.total} процессов работают штатно по данным снимка</small>}</div></div>}
 </Card>;
}
function Metrics({s}){
 const m=s.metrics;
 const cells=[['Проблемы',m.problems??'—',m.problems==null?'нет данных':m.problems?m.oldest:'нет'],['Публикации',m.done!=null?m.done+(m.dailyLimit?' из '+m.dailyLimit:''):'—','сегодня'],['Следующий слот',m.nextSlotLabel||'—','публикация']];
 return <Grid cols={3} gap={8} className="span2">{cells.map(([k,v,d])=><Container className="metric" key={k}><Typography.Label variant="small">{k}</Typography.Label><div className={'metricValue'+(typeof v==='string'&&/[а-яa-z]/i.test(v)?' text':'')}>{v}</div><small>{d}</small></Container>)}</Grid>;
}
function Rostok({r}){
 if(!r)return <Card title="Росток · публикации"><Empty text="Подтверждённые данные публикаций пока недоступны"/></Card>;
 const stat=(k,v)=><div className="stat" key={k}><small>{k}</small><b>{v??'—'}</b></div>;
 return <Card title="Росток · публикации" aside={r.statusLabel||'требует проверки'}>
  <div className="stats">{stat('Сегодня',r.publishedToday!=null&&r.dailyLimit!=null?r.publishedToday+' из '+r.dailyLimit:r.publishedToday)}{stat('В очереди',r.queue)}{stat('Следующий слот',r.nextSlotLabel)}{stat('Всего опубликовано',r.totalPublished)}</div>
 </Card>;
}
function Workflows({list}){
 return <Card title="Автоматические процессы" aside={list.length?list.filter(w=>w[1]==='ok').length+' из '+list.length:''}>
  {list.length?list.map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>):<Empty text="Список процессов появится после первого обновления"/>}
 </Card>;
}
function Documents({s}){
 const d=documentView(s);
 return <Card title="Документы" aside={d.stale?'последний снимок':!d.available?'нет данных':d.level==='ok'?'проверено источником':'нужно внимание'} className="span2">
  <Row dot={d.level} title={d.title} text={d.detail}/>
  <details><summary>Контекст, индекс и оригиналы — разные проверки</summary><p>{d.context}. {d.index}. {d.originals}</p></details>
  <p className="empty">Реестр оригиналов, подтверждения копий на Диске и компьютере пока не подключены к этому экрану. Отсутствие списка здесь не означает потерю файлов.</p>
  {d.asOf&&<small className="since">Снимок панели: {moscowTime(d.asOf,true)} МСК. Это не время сохранения документов.</small>}
 </Card>;
}
function CalendarPreview(){return <Card title="Календарь" aside="защищённый слой"><Empty text="Подключение Google Calendar подтверждено. События будут поступать через приватный шлюз; названия, адреса, суммы и ссылки не публикуются в открытой телеметрии."/></Card>;}
function CalendarScreen(){return <div className="home"><Card title="Сегодня" className="span2"><Empty text="Здесь появятся встречи и контрольные точки сегодняшнего дня после подключения приватного календарного шлюза."/></Card><Card title="Ближайшие 7 дней"><Empty text="Встречи · выезды · ВКС · контрольные точки"/></Card><Card title="Оплаты"><Empty text="Финансовые события показываются отдельно от встреч."/></Card><Card title="Связь с проектами" className="span2"><Empty text="Следующий слой: событие → проект → задача → документы. В публичный status.json приватные детали не передаются."/></Card></div>;}
function Feed({events}){return <Card title="Текущий снимок">{events.length?events.map((x,i)=><Row key={i} time={x[0]} dot={x[2]} title={x[1]}/>):<Empty text="Сводка появится после первого обновления"/>}</Card>;}
function Systems({s}){
 const bad=s.systems.filter(x=>x[1]!=='ok'),good=s.systems.filter(x=>x[1]==='ok');
 if(!s.systems.length)return <Card title="Системы"><Empty text="Ждём первое обновление состояния"/></Card>;
 return <>
  {bad.length>0&&<Card title="Требуют внимания" aside={String(bad.length)}>{bad.map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>)}</Card>}
  <Card title="Работают штатно" aside={String(good.length)}>{good.length?good.map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>):<Empty text="Пока ничего не подтверждено"/>}</Card>
 </>;
}
function Inbox({s}){
 return <div className="home"><Card title="Входящие · каналы" className="span2">
  {channelViews(s).map(c=><Row key={c.id} dot={c.level} title={c.title} text={c.detail}/>)}
  <p className="empty">Это состояние получателей и накопленное число записей, а не список новых сообщений или выполненных задач.</p>
  <details><summary>Что ещё не подключено</summary><p>Карточки входящих, оригиналы вложений, связанные поручения и события календаря требуют отдельного защищённого источника. Их содержимое не публикуется в открытой панели.</p></details>
 </Card><Card title="Сигналы внимания" aside={s.focus.length?String(s.focus.length):''} className="span2">{s.focus.length?s.focus.map(it=><Issue key={it.key} it={it}/>):<Empty text={s.mode==='live'?'По текущему снимку сигналов внимания нет. Это не подтверждает обработку всех входящих.':s.mode==='stale'?'В последнем снимке сигналов нет. Текущее состояние требует обновления.':'Состояние сигналов пока не подтверждено'}/>}</Card></div>;
}
function Projects({s}){
 const [path,setPath]=useState(()=>{try{const p=JSON.parse(store.get('shtab.max.path','[]'));return Array.isArray(p)&&p.length<=12&&p.every(x=>typeof x==='string')?p:[];}catch(e){return [];}});
 useEffect(()=>{store.set('shtab.max.path',JSON.stringify(path));},[path]);
 const back=useCallback(()=>{haptic('light');setPath(p=>p.slice(0,-1));},[]);
 useBackButton(path.length>0,back);
 let nodes=projectTree,node=null;
 for(const id of path){node=nodes.find(x=>x.id===id);if(!node){nodes=[];break;}nodes=node.children||[];}
 const operational=node&&['hq','rostok'].includes(node.id);
 return <Card className="projects">
  {path.length>0&&<button type="button" className="back" onClick={back}>‹ Назад</button>}
  <Typography.Title variant="small-strong">{node?node.name:'Проекты'}</Typography.Title>
  {node?.desc&&<p className="desc">{node.desc}</p>}
  {node?.id==='rostok'&&<><Rostok r={s.rostok}/><Workflows list={s.workflows.filter(x=>/Росток|публикаци/i.test(x[0]))}/><p className="empty">Показаны данные публикаций из снимка панели. Готовность всей очереди на завтра отдельно здесь не подтверждается.</p></>}
  {node?.id==='hq'&&<><Documents s={s}/><Workflows list={s.workflows}/><Card title="Приём сообщений">{channelViews(s).map(c=><Row key={c.id} dot={c.level} title={c.title} text={c.detail}/>)}</Card></>}
  {nodes.length===0&&node&&!operational&&<Empty text="Задачи, сроки и документы этого проекта ещё не подключены к экрану. Неподтверждённые данные здесь не показываются."/>}
  {nodes.map((x,i)=><button type="button" className="project" key={x.id} onClick={()=>{haptic('select');setPath([...path,x.id]);}}><span className="num">{String(i+1).padStart(2,'0')}</span><div><b>{x.name}</b><small>{x.desc||''}</small></div><i>{x.children?.length?'›':'•'}</i></button>)}
 </Card>;
}

export default function App({scheme='dark',themeSetting='dark',cycleTheme=()=>{}}){
 const [s,setS]=useState(initial);
 const [tab,setTabState]=useState(()=>TABS.some(t=>t[0]===store.get('shtab.max.tab'))?store.get('shtab.max.tab'):'home');
 const [busy,setBusy]=useState(false);
 const [,setTick]=useState(0);
 const live=useRef(null);
 useEffect(()=>{live.current=startLive(d=>setS({...normalizeMaxState(d),loadedAt:Date.now()}));const id=setInterval(()=>setTick(t=>t+1),1000);return()=>{live.current?.stop();clearInterval(id);};},[]);
 const setTab=id=>{haptic('select');setTabState(id);store.set('shtab.max.tab',id);try{scrollTo({top:0});}catch(e){}};
 const onRefresh=async()=>{if(busy)return;haptic('light');setBusy(true);try{await live.current?.refresh();}finally{setBusy(false);}};
 const age=s.ageSeconds==null?null:s.ageSeconds+Math.max(0,Math.round((Date.now()-s.loadedAt)/1000));
 const status=s.mode==='loading'?'Обновляем…':describeMode(s)+(age!=null?' · '+ageLabel(age):'')+(s.asOf?' · '+moscowTime(s.asOf):'');
 return <><Starfield theme={scheme}/><Panel mode="secondary" className={'shell mode-'+s.mode}>
  <header className="top">
   <div><Typography.Label variant="small" className="eyebrow">ШТАБ.ТОЧКА · MAX</Typography.Label><Typography.Title variant="large-strong" className="title">Центр управления</Typography.Title><small className={'status '+s.mode}>{status}</small></div>
   <div className="tools"><button type="button" className="theme" onClick={()=>{haptic('select');cycleTheme();}} aria-label={'Тема: '+({dark:'тёмная',light:'светлая',auto:'как в MAX'})[themeSetting]} title={'Тема: '+({dark:'тёмная',light:'светлая',auto:'как в MAX'})[themeSetting]}><ThemeIcon setting={themeSetting}/></button><button type="button" className={'refresh'+(busy||s.mode==='loading'?' spin':'')} onClick={onRefresh} aria-label="Обновить"><RefreshIcon/></button></div>
  </header>
  {s.verdict&&<div className={'verdict '+s.verdict.level}><span className={'dot '+s.verdict.level}/>{s.verdict.text}</div>}
  {s.notice&&<div className={'notice '+s.notice.level}>{s.notice.text}</div>}
  {tab==='home'&&<div className="home"><OrbitCard s={s} onDocuments={()=>setTab('systems')}/><Focus s={s}/><Metrics s={s}/><CalendarPreview/><Rostok r={s.rostok}/><Workflows list={s.workflows}/><Feed events={s.events}/></div>}
  {tab==='calendar'&&<CalendarScreen/>}
  {tab==='projects'&&<Projects s={s}/>}
  {tab==='systems'&&<div className="home"><Documents s={s}/><Systems s={s}/></div>}
  {tab==='inbox'&&<Inbox s={s}/>}
  </Panel><nav>{TABS.map(([id,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{t}{id==='inbox'&&s.focus.length>0&&<em className="badge">{s.focus.length}</em>}</button>)}</nav>
 </>;
}

import {useEffect,useState} from 'react';
import {Panel,Grid,Container,Flex,Typography} from '@maxhub/max-ui';
import {loadState} from '../../public/live.js';
import {projectTree} from '../../public/projects.js';
const initial={mode:'loading',metrics:{active:null,attention:null,done:null},systems:[],events:[],inbox:[]};
function Row({dot,title,text,time}){return <Flex className="row" gap={10}><>{time!=null&&<time>{time}</time>}<span className={'dot '+dot}/><div><b>{title}</b>{text&&<small>{text}</small>}</div></></Flex>}
function Empty({text}){return <p className="empty">{text}</p>}
function Projects(){
 const [path,setPath]=useState([]);
 let nodes=projectTree,node=null;
 for(const id of path){node=nodes.find(x=>x.id===id);if(!node)break;nodes=node.children||[];}
 return <Container className="card">
  {path.length>0&&<button type="button" className="back" onClick={()=>setPath(path.slice(0,-1))}>‹ Назад</button>}
  <Typography.Title variant="small-strong">{node?node.name:'Проекты'}</Typography.Title>
  {node?.desc&&<p className="desc">{node.desc}</p>}
  {nodes.length===0&&node&&<Empty text="Задачи, сроки и документы этого проекта подключаются отдельным слоем. Неподтверждённые данные здесь не показываются."/>}
  {nodes.map((x,i)=><button type="button" className="project" key={x.id} onClick={()=>setPath([...path,x.id])}><span className="num">{String(i+1).padStart(2,'0')}</span><div><b>{x.name}</b><small>{x.desc||''}</small></div><i>{x.children?.length?'›':'•'}</i></button>)}
 </Container>;
}
export default function App(){
 const [s,setS]=useState(initial);const [tab,setTab]=useState('home');
 useEffect(()=>{let live=true;const load=()=>loadState().then(d=>live&&setS(d)).catch(()=>{});load();const id=setInterval(load,30000);return()=>{live=false;clearInterval(id)}},[]);
 const status=s.mode==='live'?'Данные свежие':s.mode==='stale'?'Данные устарели':s.mode==='offline'?'Нет связи с источником':'Получаем состояние…';
 return <Panel mode="secondary" className="shell">
  <header><Typography.Label variant="small" className="eyebrow">ШТАБ.ТОЧКА · MAX</Typography.Label><Typography.Title variant="large-strong" className="title">Центр управления</Typography.Title><small className="status">{status}</small></header>
  {tab==='home'&&<>
   <Grid cols={3} gap={8}>{[['Сейчас',s.metrics.active],['Внимание',s.metrics.attention],['Сегодня',s.metrics.done]].map(([k,v])=><Container className="metric" key={k}><Typography.Label variant="small">{k}</Typography.Label><div className="metricValue">{v??'—'}</div></Container>)}</Grid>
   <Container className="card"><Typography.Title variant="small-strong">Главное сейчас</Typography.Title>{s.systems.length?s.systems.slice(0,6).map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>):<Empty text="Ждём первое обновление состояния"/>}</Container>
   <Container className="card"><Typography.Title variant="small-strong">Оперативная лента</Typography.Title>{s.events.length?s.events.map((x,i)=><Row key={i} time={x[0]} dot={x[2]} title={x[1]}/>):<Empty text="История появится после первого обновления"/>}</Container>
  </>}
  {tab==='projects'&&<Projects/>}
  {tab==='systems'&&<Container className="card"><Typography.Title variant="small-strong">Системы</Typography.Title>{s.systems.length?s.systems.map((x,i)=><Row key={i} dot={x[1]} title={x[0]} text={x[2]}/>):<Empty text="Ждём первое обновление состояния"/>}</Container>}
  {tab==='inbox'&&<Container className="card"><Typography.Title variant="small-strong">Входящие</Typography.Title>{s.inbox.length?s.inbox.map((x,i)=><Row key={i} dot={x[2]} title={x[0]} text={x[1]}/>):<Empty text={s.mode==='live'||s.mode==='stale'?'Критичных сигналов нет. Всё, что требует внимания, появится здесь.':'Список появится после первого обновления'}/>}</Container>}
  <nav>{[['home','Главная'],['projects','Проекты'],['systems','Системы'],['inbox','Входящие']].map(([id,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{t}</button>)}</nav>
 </Panel>;
}

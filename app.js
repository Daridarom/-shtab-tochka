const projectTree=[
 {id:'tochka',name:'Точка притяжения',desc:'Штаб, команда и проекты в Крыму',children:[
   {id:'hq',name:'Штаб',desc:'Единый центр управления'},
   {id:'alexander',name:'Александр Благов',desc:'Управляющий контур'},
   {id:'polina',name:'Полина',desc:'Секретарь · поручения · документы'},
   {id:'development',name:'Девелопмент Крым',desc:'Земельные и территориальные проекты',children:[
     {id:'h45',name:'Горизонт 45 / Азгард',desc:'Бухта Космонавтов · туристический комплекс'},
     {id:'elios',name:'Элиос',desc:'Земельный проект · СЭЗ и ЛПХ'},
     {id:'blagodar',name:'Благодар',desc:'Земельный проект · ЛПХ'},
     {id:'bospor',name:'Боспор',desc:'Клубный земельный формат'}
   ]}
 ]},
 {id:'future',name:'О будущем',desc:'Образовательные и смысловые проекты',children:[
   {id:'kinouroki',name:'Киноуроки',desc:'Фильмы · методика · образовательная система'}
 ]},
 {id:'rko',name:'РКО',desc:'Русское космическое общество · отдельное направление'},
 {id:'reo',name:'РЭО Крым',desc:'Российское экологическое общество · Крым'},
 {id:'media',name:'Медиа / AI',desc:'AI-студия · монтаж · автоматизация'},
 {id:'communities',name:'Центр сообществ',desc:'Заявки и взаимодействие'},
 {id:'personal',name:'Личный контур',desc:'Обучение и эксперименты'}
];
let projectPath=[];
const state={operations:[],metrics:{active:null,attention:null,done:null},systems:[['ЦУП','ok','Интерфейс доступен']],projects:projectTree,events:[['Сейчас','ЦУП работает в режиме просмотра','ok']],inbox:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function humanIssue(x){const n=String(x[0]||'').toLowerCase(),d=x[2]||'';if(n.includes('публика'))return 'Публикации: '+d;if(n.includes('визуал'))return 'Визуалы: '+d;if(n.includes('росток'))return 'Росток: '+d;if(n.includes('drive'))return 'Документы: '+d;if(n.includes('система'))return 'Компьютер штаба: '+d;return x[0]+': '+d;}
function currentProjectNode(){let nodes=projectTree,node=null;for(const id of projectPath){node=nodes.find(x=>x.id===id);if(!node)break;nodes=node.children||[];}return node;}
function projectNodes(){const node=currentProjectNode();return node?(node.children||[]):projectTree;}
function renderProjects(){
 const box=$('#projectList');if(!box)return;
 const node=currentProjectNode(),nodes=projectNodes();
 let head='';
 if(projectPath.length){head=`<button class="project-back" type="button">‹ Назад</button><div class="project-context"><b>${node?.name||'Проекты'}</b><small>${node?.desc||''}</small></div>`;}
 if(!nodes.length&&node){box.innerHTML=head+`<div class="project-leaf"><span>Раздел проекта</span><h3>${node.name}</h3><p>${node.desc||''}</p><small>Задачи, сроки и документы этого проекта подключаются отдельным слоем. Неподтверждённые данные здесь не показываются.</small></div>`;return;}
 box.innerHTML=head+nodes.map((x,i)=>`<article class="project-card" data-project="${x.id}"><span>${String(i+1).padStart(2,'0')}</span><div><b>${x.name}</b><small>${x.desc||''}</small></div><i>${x.children?.length?'›':'•'}</i></article>`).join('');
}
document.addEventListener('click',e=>{const back=e.target.closest('.project-back');if(back){projectPath.pop();renderProjects();return;}const card=e.target.closest('.project-card');if(!card)return;projectPath.push(card.dataset.project);renderProjects();scrollTo({top:0,behavior:'smooth'});});
function render(){ const focus=$('#focusList');if(focus){const rows=[];if(state.metrics.attention!=null&&state.metrics.attention>0)rows.push(['attention',state.metrics.attention+' пункта требуют внимания']);const issues=state.systems.filter(x=>x[1]!=='ok').slice(0,3);issues.forEach(x=>rows.push([x[1],humanIssue(x)]));if(!rows.length&&state.metrics.active!=null)rows.push(['active','Критичных проблем нет · '+state.metrics.active+' процесса работают']);focus.innerHTML=(rows.length?rows:[['wait','Получаем состояние штаба']]).map(x=>`<div class="focus-row"><span class="dot ${x[0]==='attention'?'err':x[0]==='active'?'ok':x[0]}"></span><b>${x[1]}</b></div>`).join('');} $('#m-active').textContent=state.metrics.active??'—';$('#m-attn').textContent=state.metrics.attention??'—';$('#m-done').textContent=state.metrics.done??'—';$('#systems').innerHTML=state.systems.map(x=>`<div class="sys"><span class="dot ${x[1]}"></span><div><b>${x[0]}</b><small>${x[2]}</small></div></div>`).join('');$('#events').innerHTML=state.events.map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[2]}"></span><p>${x[1]}</p></div>`).join('');renderProjects();$('#inboxList').innerHTML=state.inbox.map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[2]}"></span><p>${x[1]}</p></div>`).join('');$('#flowList').innerHTML=state.systems.slice(2).map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[1]}"></span><p>${x[2]}</p></div>`).join('');$('#healthText').textContent='СВЯЗЬ ЕСТЬ';$('#updated').textContent='проверяем свежесть';}
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.classList.toggle('active',x===b));$$('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.view));scrollTo({top:0,behavior:'smooth'});});
setInterval(()=>$('#clock').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),1000);render();
async function refresh(){try{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(d.metrics)state.metrics=d.metrics;if(d.systems)state.systems=d.systems;if(d.events)state.events=d.events;if(d.inbox)state.inbox=d.inbox;if(d.projects)state.operations=d.projects;render();$('#updated').textContent=d.mode==='live'?'Обновлено сейчас':d.mode==='stale'?'Данные устарели · '+String(d.asOf||'').replace('T',' ').slice(0,16):'Нет связи с источником';}catch(e){}}
refresh();setInterval(refresh,30000);
async function health(){try{const r=await fetch('/api/health',{cache:'no-store'});if(!r.ok)return;const h=await r.json();
 const upsert=(name,status,text)=>{const row=state.systems.find(x=>x[0]===name);if(row){row[1]=status;row[2]=text;}else state.systems.splice(2,0,[name,status,text]);};
 state.systems=state.systems.filter(x=>x[0]!=='Облачное состояние'&&x[0]!=='Ingest / приём данных'&&x[0]!=='Redis / хранилище');
 upsert('ЦУП','ok','Интерфейс доступен');
 upsert('Обновление данных',h.liveConfigured?'ok':'wait',h.liveConfigured?'Работает автоматически · '+(h.ageSeconds??'?')+' с назад':'Нет свежих данных');
 render();}catch(e){}}health();setInterval(health,30000);
// MAX Mini App compatibility: safe read-only shell. No write actions are exposed.
(function initMaxMiniApp(){
  document.documentElement.classList.add('readonly-mode');
  const ua=navigator.userAgent||'';
  if(/MAX/i.test(ua)) document.documentElement.classList.add('max-miniapp');
  const bridge=window.WebApp;
  try{bridge?.ready?.();}catch(e){}
})();

(function maxContext(){const w=window.WebApp;if(!w)return;document.documentElement.classList.add('max-mode');document.documentElement.dataset.platform=w.platform||'max';try{w.BackButton?.hide?.();}catch(e){}if(w.getLaunchContext)w.getLaunchContext().then(x=>{document.documentElement.dataset.entry=x?.entryPoint||'default'}).catch(()=>{});})();

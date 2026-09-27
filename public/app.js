import {startLive,describeMode,ageLabel,moscowTime} from './live.js?v=2';
import {projectTree} from './projects.js?v=1';
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
function render(){ const focus=$('#focusList');if(focus){const rows=state.focus&&state.focus.length?state.focus:[['wait','Получаем состояние штаба','']];focus.innerHTML=rows.map(x=>`<div class="focus-row"><span class="dot ${x[0]}"></span><div><b>${x[1]}</b>${x[2]?`<small>${x[2]}</small>`:''}</div></div>`).join('');} $('#m-active').textContent=state.metrics.active??'—';$('#m-attn').textContent=state.metrics.attention??'—';$('#m-done').textContent=state.metrics.done??'—';$('#systems').innerHTML=state.systems.map(x=>`<div class="sys"><span class="dot ${x[1]}"></span><div><b>${x[0]}</b><small>${x[2]}</small></div></div>`).join('');$('#events').innerHTML=state.events.map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[2]}"></span><p>${x[1]}</p></div>`).join('');renderProjects();$('#inboxList').innerHTML=state.inbox.map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[2]}"></span><p>${x[1]}</p></div>`).join('');$('#flowList').innerHTML=state.systems.slice(2).map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[1]}"></span><p>${x[2]}</p></div>`).join('');const wl=$('#workflowList');if(wl){const w=state.workflows||[];wl.innerHTML=w.length?w.map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[1]}"></span><p>${x[2]}</p></div>`).join(''):'<div class="event"><time>—</time><span class="dot wait"></span><p>Список процессов появится после обновления</p></div>';const wa=$('#wfAside');if(wa)wa.textContent=w.length?w.filter(x=>x[1]==='ok').length+' из '+w.length+' в норме':'';}const rc=$('#rostok');if(rc){const r=state.rostok;rc.hidden=!r;if(r){$('#rostokAside').textContent=r.unresolved?'есть неясные':'по плану';$('#rostokStats').innerHTML=[['Сегодня',r.publishedToday!=null&&r.dailyLimit!=null?r.publishedToday+' из '+r.dailyLimit:r.publishedToday],['В очереди',r.queue],['Следующий слот',r.nextSlotLabel],['Всего опубликовано',r.totalPublished]].map(x=>`<div class="stat"><small>${x[0]}</small><b>${x[1]??'—'}</b></div>`).join('');}}}
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.classList.toggle('active',x===b));$$('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.view));scrollTo({top:0,behavior:'smooth'});});
setInterval(()=>$('#clock').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),1000);render();
let loadedAt=Date.now();
function apply(d){
 state.metrics=d.metrics;state.systems=[['ЦУП','ok','Интерфейс доступен'],...d.systems];state.events=d.events;state.inbox=d.inbox;state.mode=d.mode;state.focus=d.focus;state.workflows=d.workflows;state.rostok=d.rostok;state.ageSeconds=d.ageSeconds;state.asOf=d.asOf;loadedAt=Date.now();
 render();
 $('#healthText').textContent=d.mode==='offline'?'НЕТ СВЯЗИ':d.mode==='loading'?'ПРОВЕРКА…':'СВЯЗЬ ЕСТЬ';
 updatedLabel();
 document.documentElement.dataset.mode=d.mode;
}
function updatedLabel(){const el=$('#updated');if(!el)return;if(state.mode==='loading'){el.textContent='Обновляем…';return;}const age=state.ageSeconds==null?null:state.ageSeconds+Math.max(0,Math.round((Date.now()-loadedAt)/1000));el.textContent=describeMode(state)+(age!=null?' · '+ageLabel(age):'')+(state.asOf?' · '+moscowTime(state.asOf):'');}
setInterval(updatedLabel,1000);
const live=startLive(apply);
const refreshBtn=$('#refresh');if(refreshBtn)refreshBtn.onclick=async()=>{refreshBtn.classList.add('spin');try{window.WebApp?.HapticFeedback?.impactOccurred?.('light');}catch(e){}try{await live.refresh();}finally{refreshBtn.classList.remove('spin');}};
// MAX Mini App compatibility: safe read-only shell. No write actions are exposed.
(function initMaxMiniApp(){
  document.documentElement.classList.add('readonly-mode');
  const ua=navigator.userAgent||'';
  if(/MAX/i.test(ua)) document.documentElement.classList.add('max-miniapp');
  const bridge=window.WebApp;
  try{bridge?.ready?.();}catch(e){}
})();

(function maxContext(){const w=window.WebApp;if(!w)return;document.documentElement.classList.add('max-mode');document.documentElement.dataset.platform=w.platform||'max';try{w.BackButton?.hide?.();}catch(e){}if(w.getLaunchContext)w.getLaunchContext().then(x=>{document.documentElement.dataset.entry=x?.entryPoint||'default'}).catch(()=>{});})();

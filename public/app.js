import {startLive,describeMode,ageLabel,moscowTime} from './live.js?v=4';
import {startStarfield} from './starfield.js?v=1';
import {orbitSVG,orbitNodes} from './orbit.js?v=1';
import {projectTree} from './projects.js?v=1';
let projectPath=[];let orbitSel=null;
const state={operations:[],verdict:null,notice:null,focus:[],metrics:{active:null,total:null,attention:null,done:null,dailyLimit:null,nextSlotLabel:null,problems:null,oldest:null},systems:[['ЦУП','ok','Интерфейс доступен']],projects:projectTree,events:[['Сейчас','ЦУП работает в режиме просмотра','ok']],inbox:[]};
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
function render(){ const focus=$('#focusList');if(focus){const items=state.focus||[];focus.innerHTML=items.length?items.map(it=>`<div class="focus-row ${it.level}"><span class="dot ${it.level}"></span><div><b>${it.title}</b><small>${it.text}</small>${it.action?`<em class="act"><span>Что сделать:</span> ${it.action}</em>`:''}<i class="since">${it.sinceLabel}${it.sinceTime&&it.sinceLabel!=='только что замечено'?' · с '+it.sinceTime:''}</i>${it.details?`<details><summary>Подробности</summary><p>${it.details}</p></details>`:''}</div></div>`).join(''):`<div class="focus-row ok"><span class="dot ok"></span><div><b>${state.mode==='loading'?'Получаем состояние штаба':'Критичных проблем нет'}</b>${state.mode!=='loading'&&state.metrics.active!=null?`<small>${state.metrics.active} из ${state.metrics.total} процессов работают штатно</small>`:''}</div></div>`;const fc=$('#focusCount');if(fc)fc.textContent=items.length?items.length+' '+(items.length===1?'пункт':items.length<5?'пункта':'пунктов'):'всё спокойно';}
renderOrbit();
const v=$('#verdict');if(v&&state.verdict){v.className='verdict '+state.verdict.level;v.innerHTML=`<span class="dot ${state.verdict.level}"></span><b>${state.verdict.text}</b>`;}
const nt=$('#notice');if(nt){nt.hidden=!state.notice;if(state.notice){nt.className='notice '+state.notice.level;nt.textContent=state.notice.text;}}
const mm=state.metrics;$('#m-problems').textContent=mm.problems??'—';$('#m-problems-sub').textContent=mm.problems?mm.oldest:(mm.problems===0?'нет':'по картам и процессам');$('#m-done').textContent=mm.done!=null?mm.done+(mm.dailyLimit?' из '+mm.dailyLimit:''):'—';const ms=$('#m-slot');ms.textContent=mm.nextSlotLabel||'—';ms.classList.toggle('text',!!mm.nextSlotLabel);$('#systems').innerHTML=state.systems.map(x=>`<div class="sys"><span class="dot ${x[1]}"></span><div><b>${x[0]}</b><small>${x[2]}</small></div></div>`).join('');$('#events').innerHTML=state.events.map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[2]}"></span><p>${x[1]}</p></div>`).join('');renderProjects();$('#inboxList').innerHTML=(state.focus||[]).length?(state.focus||[]).map(it=>`<div class="focus-row ${it.level}"><span class="dot ${it.level}"></span><div><b>${it.title}</b><small>${it.text}</small>${it.action?`<em class="act"><span>Что сделать:</span> ${it.action}</em>`:''}<i class="since">${it.sinceLabel}</i></div></div>`).join(''):`<div class="event"><time>—</time><span class="dot ok"></span><p>${state.mode==='loading'?'Список появится после обновления':'Критичных сигналов нет. Всё, что требует внимания, появится здесь.'}</p></div>`;$('#flowList').innerHTML=state.systems.slice(2).map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[1]}"></span><p>${x[2]}</p></div>`).join('');const wl=$('#workflowList');if(wl){const w=state.workflows||[];wl.innerHTML=w.length?w.map(x=>`<div class="event"><time>${x[0]}</time><span class="dot ${x[1]}"></span><p>${x[2]}</p></div>`).join(''):'<div class="event"><time>—</time><span class="dot wait"></span><p>Список процессов появится после обновления</p></div>';const wa=$('#wfAside');if(wa)wa.textContent=w.length?w.filter(x=>x[1]==='ok').length+' из '+w.length+' в норме':'';}const rc=$('#rostok');if(rc){const r=state.rostok;rc.hidden=!r;if(r){$('#rostokAside').textContent=r.statusLabel||'требует проверки';$('#rostokStats').innerHTML=[['Сегодня',r.publishedToday!=null&&r.dailyLimit!=null?r.publishedToday+' из '+r.dailyLimit:r.publishedToday],['В очереди',r.queue],['Следующий слот',r.nextSlotLabel],['Всего опубликовано',r.totalPublished]].map(x=>`<div class="stat"><small>${x[0]}</small><b>${x[1]??'—'}</b></div>`).join('');}}}
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.classList.toggle('active',x===b));$$('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.view));scrollTo({top:0,behavior:'smooth'});});
setInterval(()=>$('#clock').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),1000);render();
let loadedAt=Date.now();
function apply(d){
 state.metrics=d.metrics;state.verdict=d.verdict;state.notice=d.notice;state.cards=d.cards||[];state.systems=[['ЦУП','ok','Интерфейс доступен'],...d.systems];state.events=d.events;state.inbox=d.inbox;state.mode=d.mode;state.focus=d.focus;state.workflows=d.workflows;state.rostok=d.rostok;state.ageSeconds=d.ageSeconds;state.asOf=d.asOf;loadedAt=Date.now();
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

// ---- схема связей ----
function renderOrbit(){const ow=$('#orbitWrap');if(!ow)return;const nodes=orbitNodes(state);ow.innerHTML=nodes.length?orbitSVG(nodes,{selected:orbitSel}):'<p class="empty">Схема появится после первого обновления</p>';const bad=nodes.filter(n=>n.level!=='ok').length;const oa=$('#orbitAside');if(oa)oa.textContent=nodes.length?(bad?bad+' из '+nodes.length+' с сигналом':'все каналы в норме'):'живые данные';const info=$('#orbitInfo');if(!info)return;const cur=nodes.find(n=>n.id===orbitSel);if(!cur){info.className='orbitInfo muted';info.innerHTML='<small>Нажми на узел, чтобы увидеть его состояние</small>';return;}const issue=(state.focus||[]).find(f=>f.key===cur.id);info.className='orbitInfo '+cur.level;info.innerHTML=`<b>${cur.title}</b><small>${issue?issue.text:cur.detail}</small>${issue&&issue.action?`<em class="act"><span>Что сделать:</span> ${issue.action}</em>`:''}`;}
document.addEventListener('click',e=>{const g=e.target.closest('[data-node]');if(!g)return;try{window.WebApp?.HapticFeedback?.selectionChanged?.();}catch(err){}orbitSel=g.dataset.node===orbitSel?null:g.dataset.node;renderOrbit();});
// ---- тема и звёзды ----
const THEME_KEY='shtab.theme',THEME_ORDER=['dark','light','auto'];
const ICONS={light:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',dark:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',auto:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>'};
function themeSetting(){try{const v=localStorage.getItem(THEME_KEY);return THEME_ORDER.includes(v)?v:'dark';}catch(e){return 'dark';}}
function systemScheme(){const w=window.WebApp;if(w&&w.colorScheme)return w.colorScheme==='light'?'light':'dark';try{return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}catch(e){return 'dark';}}
const stars=startStarfield($('#stars'),{theme:'dark'});
function applyTheme(){const s=themeSetting();const eff=s==='auto'?systemScheme():s;document.documentElement.dataset.theme=eff;const b=$('#theme');if(b){b.innerHTML=ICONS[s];b.title='Тема: '+({auto:'как в системе',dark:'тёмная',light:'светлая'})[s];b.setAttribute('aria-label',b.title);}stars.setTheme(eff);}
const themeBtn=$('#theme');if(themeBtn)themeBtn.onclick=()=>{const s=themeSetting();const next=THEME_ORDER[(THEME_ORDER.indexOf(s)+1)%THEME_ORDER.length];try{localStorage.setItem(THEME_KEY,next);}catch(e){}try{window.WebApp?.HapticFeedback?.selectionChanged?.();}catch(e){}applyTheme();};
try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',applyTheme);}catch(e){}
applyTheme();

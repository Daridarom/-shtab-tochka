// Схема связей «ШТАБ ↔ системы»: SVG-разметка по живым данным. Одна реализация для панели и MAX.
// nodes: [{id,title,level,detail}] · level: ok | wait | err
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const SHORT={'Компьютер штаба':'Компьютер','Канал управления':'Канал','Автоматические процессы':'Процессы','Google Drive':'Документы'};
export function orbitSVG(nodes,{selected=null,width=360,height=270}={}){
 const cx=width/2,cy=height/2-4,rx=width/2-52,ry=height/2-46,n=Math.max(1,nodes.length);
 const parts=[];
 parts.push(`<svg class="orbit" viewBox="0 0 ${width} ${height}" role="img" aria-label="Схема связей штаба">`);
 parts.push(`<defs><radialGradient id="oc" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--accent2)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent2)" stop-opacity="0"/></radialGradient></defs>`);
 parts.push(`<ellipse class="ring" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`);
 parts.push(`<ellipse class="ring ring2" cx="${cx}" cy="${cy}" rx="${rx*0.62}" ry="${ry*0.62}"/>`);
 nodes.forEach((nd,i)=>{
  const a=-Math.PI/2+i*(2*Math.PI/n);const x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);
  const lv=nd.level==='err'?'err':nd.level==='wait'?'wait':'ok';
  const d=`M${cx.toFixed(1)},${cy.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`;
  parts.push(`<path class="link ${lv}" d="${d}"/>`);
  if(lv==='ok')parts.push(`<circle class="packet" r="2.2"><animateMotion dur="${(2.6+(i%4)*0.6).toFixed(1)}s" begin="${(i*0.37).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></circle>`);
  if(lv==='err')parts.push(`<circle class="packet err" r="2.6"><animateMotion dur="1.4s" begin="${(i*0.2).toFixed(2)}s" repeatCount="indefinite" path="${d.replace(/^M([^ ]+) L(.+)$/,'M$2 L$1')}"/></circle>`);
  const label=SHORT[nd.title]||nd.title;
  const below=Math.sin(a)>=-0.2;
  parts.push(`<g class="node ${lv}${selected===nd.id?' selected':''}" data-node="${esc(nd.id)}" tabindex="0" role="button" aria-label="${esc(nd.title)}"><circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="20"/><circle class="core" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"/><circle class="tap" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26"/><text x="${x.toFixed(1)}" y="${(below?y+27:y-19).toFixed(1)}" text-anchor="middle">${esc(label)}</text></g>`);
 });
 parts.push(`<g class="center"><circle class="glow" cx="${cx}" cy="${cy}" r="46" fill="url(#oc)"/><circle class="orbitRing" cx="${cx}" cy="${cy}" r="38"/><circle class="hub" cx="${cx}" cy="${cy}" r="27"/><text x="${cx}" y="${cy-2}" text-anchor="middle" class="hubText">ШТАБ</text><text x="${cx}" y="${cy+11}" text-anchor="middle" class="hubSub">ТОЧКА</text></g>`);
 parts.push('</svg>');
 return parts.join('');
}
// Узлы из экранного состояния: карточки коллектора + сводный узел процессов.
export function orbitNodes(state){
 const cards=Array.isArray(state.cards)?state.cards:[];
 const nodes=cards.map(c=>({id:c.id,title:c.title,level:c.level,detail:c.detail}));
 if(state.workflows&&state.workflows.length){const bad=state.workflows.filter(w=>w[1]!=='ok');nodes.push({id:'workflows',title:'Автоматические процессы',level:bad.some(w=>w[1]==='err')?'err':bad.length?'wait':'ok',detail:(state.workflows.length-bad.length)+' из '+state.workflows.length+' работают штатно'});}
 return nodes;
}
// Живая схема Штаба (MAX): связи по реальному маршруту процессов. graph — из model.js schemeGraph().
// Импульс рисуется только на работающих участках свежего снимка; на месте остановки — метка узла.
const LABEL_SHORT={'ИИ-исполнители':'ИИ-исполн.'};
export function schemeSVG(graph,{selected=null,width=360,height=400}={}){
 const p=[`<svg class="scheme" viewBox="0 0 ${width} ${height}" role="group" aria-label="Живая схема штаба">`];
 graph.edges.forEach((e,i)=>{
  const d=`M${e.x1},${e.y1} L${e.x2},${e.y2}`;
  p.push(`<path class="edge ${e.kind}" d="${d}"/>`);
  if(e.kind==='flow')p.push(`<circle class="pulse" r="2.6"><animateMotion dur="3.2s" begin="${(i*0.45).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></circle>`);
 });
 graph.nodes.forEach(n=>{
  const r=n.hub?24:13,sel=selected===n.id;
  const label=esc(LABEL_SHORT[n.title]||n.title),ly=n.hub?n.y+r+15:n.y+r+14;
  p.push(`<g class="snode ${n.level}${n.stale?' stale':''}${sel?' selected':''}${n.hub?' hub':''}" data-node="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(n.title)}: ${n.level==='ok'?'штатно':n.level==='wait'?'внимание':n.level==='err'?'ошибка':'не подтверждено'}">`+
   `<circle class="tap" cx="${n.x}" cy="${n.y}" r="${Math.max(r+14,27)}"/>`+
   (sel?`<circle class="ring" cx="${n.x}" cy="${n.y}" r="${r+6}"/>`:'')+
   `<circle class="core" cx="${n.x}" cy="${n.y}" r="${r}"/>`+
   (n.hub?`<text class="hubText" x="${n.x}" y="${n.y+4}" text-anchor="middle">ШТАБ</text>`:(n.level==='err'?`<text class="mark" x="${n.x}" y="${n.y+4}" text-anchor="middle">!</text>`:n.level==='none'?`<text class="mark" x="${n.x}" y="${n.y+4}" text-anchor="middle">?</text>`:''))+
   (n.hub?'':`<text class="lbl" x="${n.x}" y="${ly}" text-anchor="middle">${label}</text>`)+`</g>`);
 });
 p.push('</svg>');
 return p.join('');
}

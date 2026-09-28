// Safe presentation only: never infer preserved originals or completed tasks from telemetry.
export function documentView(state={}){
 const card=(state.cards||[]).find(c=>c.id==='drive');
 const available=!!card&&['live','stale'].includes(state.mode);
 const detail=available?String(card.detail||''):'Нет данных от источника';
 const indexPending=available&&/индекс/i.test(detail)&&/ожида|retry|ошиб|не подтвержд/i.test(detail);
 const contextChecked=available&&/контекст проверен/i.test(detail);
 return {
  available,level:available&&['ok','wait','err'].includes(card.level)?card.level:'wait',
  title:indexPending?'Облачный индекс задач ждёт обновления':'Документы и синхронизация',
  detail,context:contextChecked?'Источник подтверждает проверку контекста':'Проверка контекста отдельно не подтверждена',
  index:indexPending?'Облачная копия индекса задач ожидает обновления':available&&card.level==='ok'?'Проверка индекса пройдена по данным источника':'Актуальность индекса требует проверки',
  originals:'Сохранность каждого вложения на Диске и компьютере этим индикатором не проверяется.',
  stale:state.mode==='stale',asOf:state.asOf||null
 };
}
export function normalizeMaxState(state){
 const docs=documentView(state);
 return {...state,focus:(state.focus||[]).map(item=>item.key==='drive'?{...item,
  title:docs.title,text:docs.detail,
  action:docs.available?'Проверить результат синхронизации индекса задач. Оригиналы вложений проверяются отдельно.':'Восстановить получение состояния, затем проверить синхронизацию',
  details:docs.originals
 }:item)};
}
export function channelViews(state={}){
 return ['telegram','max'].map(id=>{
  const card=(state.cards||[]).find(c=>c.id===id);
  const available=!!card&&['live','stale'].includes(state.mode);
  return {id,title:id==='max'?'MAX':'Telegram',
   level:available&&['ok','wait','err'].includes(card.level)?card.level:'wait',
   detail:available?String(card.detail||'Нет подробностей'):'Нет подтверждённого состояния получателя'};
 });
}

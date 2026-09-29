// Safe presentation only: never infer preserved originals or completed tasks from telemetry.
export function documentView(state={}){
 const cards=state.cards||[],drive=cards.find(c=>c.id==='drive'),index=cards.find(c=>c.id==='task_index');
 const available=!!drive&&['live','stale'].includes(state.mode);
 const driveDetail=available?String(drive.detail||''):'Нет данных от источника';
 const indexAvailable=!!index&&['live','stale'].includes(state.mode);
 const legacyIndexPending=!indexAvailable&&available&&/индекс/i.test(driveDetail)&&/ожида|retry|ошиб|не подтвержд/i.test(driveDetail);
 const driveLevel=available&&['ok','wait','err'].includes(drive.level)?drive.level:'wait';
 const indexLevel=indexAvailable&&['ok','wait','err'].includes(index.level)?index.level:legacyIndexPending?'wait':driveLevel==='ok'?'ok':'wait';
 const indexDetail=indexAvailable?String(index.detail||''):legacyIndexPending?'Облачная копия индекса задач ожидает обновления':'Состояние облачной копии индекса отдельно не подтверждено';
 const level=[driveLevel,indexLevel].includes('err')?'err':[driveLevel,indexLevel].includes('wait')?'wait':available?'ok':'wait';
 return {
  available,level,title:'Документы и индекс задач',
  detail:driveDetail,
  driveLevel,
  indexLevel,
  context:/контекст проверен/i.test(driveDetail)?'Источник подтверждает контекст Google Drive':driveDetail,
  index:indexDetail,
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

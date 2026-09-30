// Публичная проекция календаря в репозитории не должна нести суммы, адреса, телефоны, ссылки и лишние поля.
// Проверка использует те же правила, что и экранная редакция в public/model.js.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=async f=>import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../public/'+f,import.meta.url)),'utf8').toString('base64'));
const M=await load('model.js');
const file=process.argv[2]?new URL(process.argv[2],'file://'+process.cwd()+'/'):new URL('../live/calendar.json',import.meta.url);
const d=JSON.parse(await readFile(file,'utf8'));
assert.equal(d.schema,'calendar-1');assert.ok(d.generated_at);assert.ok(Array.isArray(d.events));
const allowedTop=new Set(['schema','generated_at','ttl_seconds','events']);
for(const k of Object.keys(d))assert.ok(allowedTop.has(k),'лишнее поле верхнего уровня: '+k);
const allowedEvent=new Set(['id','title','kind','start','end','endConfirmed','allDay','format','location','project']);
const problems=[];
for(const e of d.events){
 for(const k of Object.keys(e))if(!allowedEvent.has(k))problems.push(e.id+': лишнее поле '+k);
 for(const [field,val] of [['title',e.title],['location',e.location]]){const h=M.privateHints(val);if(h.length)problems.push(e.id+' '+field+': '+h.join(', '));}
}
if(problems.length){console.error('PRIVATE DATA IN CALENDAR PROJECTION:\n'+problems.join('\n'));process.exit(1);}
console.log('PASS: calendar projection has no amounts, addresses, phones, links or extra fields ('+d.events.length+' events)');

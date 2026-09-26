import crypto from 'crypto';

function validate(initData, token){
  if(!initData||!token) return {ok:false,reason:'missing'};
  const parts=initData.split('&').map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]});
  if(parts.filter(x=>x[0]==='hash').length!==1) return {ok:false,reason:'hash'};
  const original=parts.find(x=>x[0]==='hash')[1];
  const decoded=parts.map(([k,v])=>[k,decodeURIComponent(v)]).sort((a,b)=>a[0].localeCompare(b[0]));
  const data=decoded.filter(x=>x[0]!=='hash').map(x=>x[0]+'='+x[1]).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
  const hash=crypto.createHmac('sha256',secret).update(data).digest('hex');
  if(hash.length!==original.length||!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(original))) return {ok:false,reason:'signature'};
  const map=Object.fromEntries(decoded);
  const authDate=Number(map.auth_date||0);
  if(!authDate||Math.abs(Date.now()/1000-authDate)>3600) return {ok:false,reason:'expired'};
  let user=null; try{user=JSON.parse(map.user||'null')}catch{}
  return user?.id?{ok:true,user}:{ok:false,reason:'user'};
}
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({ok:false});
  const result=validate(req.body?.initData,process.env.MAX_BOT_TOKEN);
  if(!result.ok) return res.status(401).json({ok:false,reason:result.reason});
  const owner=String(process.env.MAX_OWNER_ID||'');
  const partner=(process.env.MAX_PARTNER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  const secretary=(process.env.MAX_SECRETARY_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  const id=String(result.user.id);
  const role=id===owner?'owner':partner.includes(id)?'partner':secretary.includes(id)?'secretary':null;
  return role?res.status(200).json({ok:true,role,user:{id,first_name:result.user.first_name||'',last_name:result.user.last_name||''}}):res.status(403).json({ok:false,reason:'not_allowed',userId:id});
}
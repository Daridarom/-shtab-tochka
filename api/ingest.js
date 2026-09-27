function redisConfig(){return {url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN};}
async function redis(cmd){const {url,token}=redisConfig();if(!url||!token)throw new Error('storage_not_configured');const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(cmd)});if(!r.ok)throw new Error('storage_error_'+r.status);const j=await r.json();return j.result;}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
 if(!process.env.INGEST_KEY)return res.status(503).json({ok:false,error:'ingest_not_configured'});
 const key=req.headers['x-shtab-key'];if(!key||key!==process.env.INGEST_KEY)return res.status(401).json({ok:false,error:'unauthorized'});
 const body=req.body||{};if(!body.source||!body.type)return res.status(400).json({ok:false,error:'source_and_type_required'});
 const event={id:body.id||globalThis.crypto?.randomUUID?.()||String(Date.now()),ts:body.ts||new Date().toISOString(),source:String(body.source).slice(0,80),type:String(body.type).slice(0,80),status:String(body.status||'info').slice(0,30),project:String(body.project||'').slice(0,120),title:String(body.title||'').slice(0,240),meta:body.meta&&typeof body.meta==='object'?body.meta:{}};
 try{
   await redis(['LPUSH','shtab:events',JSON.stringify(event)]);await redis(['LTRIM','shtab:events','0','199']);await redis(['SET','shtab:last_ingest',event.ts]);
   if(body.state&&typeof body.state==='object')await redis(['SET','shtab:state',JSON.stringify({...body.state,updatedAt:event.ts})]);
   return res.status(200).json({ok:true,accepted:true,id:event.id,ts:event.ts});
 }catch(e){return res.status(503).json({ok:false,error:String(e.message||e),accepted:false});}
}
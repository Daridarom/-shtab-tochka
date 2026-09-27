const LIVE_URL='https://raw.githubusercontent.com/Daridarom/-shtab-tochka/main/live/status.json';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 let live=false,lastUpdate=null,ageSeconds=null;
 try{
   const r=await fetch(LIVE_URL+'?t='+Date.now(),{headers:{'User-Agent':'shtab-tochka-health'}});
   if(r.ok){
     const d=await r.json();lastUpdate=d.generated_at||null;
     ageSeconds=lastUpdate?Math.max(0,Math.round((Date.now()-Date.parse(lastUpdate))/1000)):null;
     live=Number.isFinite(ageSeconds)&&ageSeconds<=Math.max(120,d.ttl_seconds||120);
   }
 }catch(e){}
 res.status(200).json({ok:true,service:'shtab-tochka',time:new Date().toISOString(),liveConfigured:live,lastUpdate,ageSeconds,transport:'sanitized-github-projection'});
}
const LIVE_URLS=['https://raw.githubusercontent.com/Daridarom/-shtab-tochka/telemetry/live/status.json','https://raw.githubusercontent.com/Daridarom/-shtab-tochka/main/live/status.json'];
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 let live=false,lastUpdate=null,ageSeconds=null,source=null;
 for(const url of LIVE_URLS){
   try{
     const r=await fetch(url+'?t='+Date.now(),{headers:{'User-Agent':'shtab-tochka-health'}});
     if(!r.ok)continue;
     const d=await r.json();if(!d||!d.generated_at)continue;
     lastUpdate=d.generated_at;source=url.includes('/telemetry/')?'telemetry-branch':'main-branch';
     ageSeconds=Math.max(0,Math.round((Date.now()-Date.parse(lastUpdate))/1000));
     live=Number.isFinite(ageSeconds)&&ageSeconds<=Math.max(120,d.ttl_seconds||120);
     break;
   }catch(e){}
 }
 // `source` tells the local collector which branch production reads, so it can stop publishing to main.
 res.status(200).json({ok:true,service:'shtab-tochka',time:new Date().toISOString(),liveConfigured:live,lastUpdate,ageSeconds,source,transport:'sanitized-github-projection'});
}
// Звёздное поле для фона: лёгкое, останавливается, когда экран скрыт, и не двигается при reduced-motion.
export function startStarfield(canvas,{theme='dark'}={}){
 if(!canvas||!canvas.getContext)return {stop(){},setTheme(){}};
 const ctx=canvas.getContext('2d');let stars=[],w=0,h=0,dpr=1,raf=0,last=0,running=true,mode=theme;
 const reduced=(()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}})();
 function resize(){
  dpr=Math.min(2,window.devicePixelRatio||1);w=canvas.clientWidth||window.innerWidth;h=canvas.clientHeight||window.innerHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const n=Math.round(w*h*0.00016);stars=Array.from({length:Math.max(60,Math.min(260,n))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()<0.12?1.6:Math.random()*0.9+0.4,a:Math.random()*0.5+0.3,p:Math.random()*Math.PI*2,s:Math.random()*0.9+0.3,v:Math.random()*0.012+0.004}));
 }
 function draw(t){
  ctx.clearRect(0,0,w,h);
  const dark=mode!=='light';
  for(const st of stars){
   const tw=reduced?1:0.65+0.35*Math.sin(t*0.001*st.s+st.p);
   ctx.globalAlpha=(dark?st.a:st.a*0.35)*tw;
   ctx.fillStyle=dark?(st.r>1.4?'#bfeaff':'#e8f4ff'):'#1b3a5c';
   ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill();
   if(!reduced){st.y+=st.v;if(st.y>h+2){st.y=-2;st.x=Math.random()*w;}}
  }
  ctx.globalAlpha=1;
 }
 function frame(t){
  if(!running)return;
  if(t-last>=40){last=t;draw(t);}
  if(reduced){return;}
  raf=requestAnimationFrame(frame);
 }
 const onVis=()=>{const vis=document.visibilityState==='visible';if(vis&&!running){running=true;raf=requestAnimationFrame(frame);}else if(!vis){running=false;cancelAnimationFrame(raf);}};
 resize();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',onVis);
 raf=requestAnimationFrame(frame);
 return {stop(){running=false;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVis);},setTheme(t){mode=t;if(reduced)draw(performance.now());}};
}

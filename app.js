const buttons=[...document.querySelectorAll('nav button[data-target]')];
const views={cup:document.getElementById('view-cup'),projects:document.getElementById('view-projects'),flows:document.getElementById('view-flows'),inbox:document.getElementById('view-inbox')};
buttons.forEach(btn=>btn.addEventListener('click',()=>{buttons.forEach(b=>b.classList.toggle('active',b===btn));const el=views[btn.dataset.target];if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}));
const authBtn=document.querySelector('.lock button');if(authBtn){authBtn.disabled=true;authBtn.textContent='Вход будет через Vercel';}

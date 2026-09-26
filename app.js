// SECURITY: no client-side fake login. Until server-side authentication is connected,
// the public GitHub Pages shell must not reveal or fetch any private Shtab data.
const enter=document.getElementById('enter');
const cup=document.getElementById('cup');
if(cup) cup.hidden=true;
if(enter){
  enter.textContent='Авторизация готовится';
  enter.disabled=true;
  enter.setAttribute('aria-disabled','true');
}

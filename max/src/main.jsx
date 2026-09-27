import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {MaxUI} from '@maxhub/max-ui';
import '@maxhub/max-ui/dist/styles.css';
import './shtab.css';
import App from './App.jsx';
import {bridge,useMaxColorScheme} from './max.js';
try{bridge()?.ready?.();}catch(e){}
function Root(){
 const scheme=useMaxColorScheme();
 useEffect(()=>{document.documentElement.dataset.theme=scheme;},[scheme]);
 const platform=bridge()?.platform;
 return <MaxUI platform={platform==='ios'?'ios':platform==='android'?'android':undefined} colorScheme={scheme}><App/></MaxUI>;
}
createRoot(document.getElementById('root')).render(<Root/>);

import {createRoot} from 'react-dom/client';
import {MaxUI} from '@maxhub/max-ui';
import '@maxhub/max-ui/dist/styles.css';
import './shtab.css';
import App from './App.jsx';
const platform=window.WebApp?.platform;
try{window.WebApp?.ready?.()}catch{}
createRoot(document.getElementById('root')).render(<MaxUI platform={platform==='ios'?'ios':platform==='android'?'android':undefined} colorScheme="dark"><App/></MaxUI>);

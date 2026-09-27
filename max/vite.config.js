import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
const here=dirname(fileURLToPath(import.meta.url));
export default defineConfig({root:here,base:'./',plugins:[react()],build:{outDir:resolve(here,'..','public','max'),emptyOutDir:true}});

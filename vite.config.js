import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'path';
export default defineConfig({root:resolve(process.cwd(),'max'),base:'/max/',plugins:[react()],build:{outDir:resolve(process.cwd(),'public/max'),emptyOutDir:true},server:{port:5173}});

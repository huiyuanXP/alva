import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),resolve:{alias:{'@alva-i18n':fileURLToPath(new URL('./src/i18n',import.meta.url))}},plugins:[react({jsxImportSource:'@alva-i18n'})],build:{outDir:'dist',emptyOutDir:true}});

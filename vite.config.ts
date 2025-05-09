import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		preact(),
	],
	publicDir: '',
	build: {
		outDir: 'public/f',
	},
	base: '/f',
});

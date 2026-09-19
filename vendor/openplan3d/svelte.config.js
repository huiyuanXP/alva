import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: { base: '/engine' },
		adapter: adapter({ out: process.env.APP_ENGINE_DIR || 'build' })
	}
};

export default config;

import { defineConfig } from 'bunup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	exports: true,
	unused: true,
	dts: {
		minify: true
	},
	minify: true,
	minifyIdentifiers: true,
	minifySyntax: true,
	minifyWhitespace: true
})

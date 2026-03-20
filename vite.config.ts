import { defineConfig } from "vite-plus"

export default defineConfig({
	test: {
		environment: "happy-dom",
		setupFiles: "./vitest.setup.ts",
		globals: true, // enable globals for the auto clean up test only
	},

	pack: {
		entry: {
			index: "./src/index.ts",
			pure: "./src/pure.ts",
		},
		outDir: "./dist",
		platform: "neutral",
		dts: true,
		sourcemap: true,
		nodeProtocol: true,
		attw: { profile: "esm-only", enabled: "local-only" },
		publint: { enabled: "local-only" },
		format: "esm",
		exports: {
			devExports: true,
		},
	},

	lint: {
		ignorePatterns: ["dist/**"],
		plugins: [],
		categories: {},
		rules: {},
		settings: {
			"jsx-a11y": {
				// "polymorphicPropName": null,
				components: {},
				attributes: {},
			},
			jsdoc: {
				ignorePrivate: false,
				ignoreInternal: false,
				ignoreReplacesDocs: true,
				overrideReplacesDocs: true,
				augmentsExtendsReplacesDocs: false,
				implementsReplacesDocs: false,
				exemptDestructuredRootsFromChecks: false,
				tagNamePreference: {},
			},
			vitest: {
				typecheck: false,
			},
		},
		env: {
			builtin: true,
		},
		globals: {},
	},

	fmt: {
		semi: false,
		useTabs: true,
		sortImports: {},
		sortPackageJson: true,
	},

	staged: {
		"*": "vp check --fix",
	},
})

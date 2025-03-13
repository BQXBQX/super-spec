import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["**/*.test.ts"],
		exclude: ["**/*.d.ts", "node_modules/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: ["**/*.d.ts", "**/*.test.ts", "node_modules/**"],
		},
		benchmark: {
			include: ["**/*.bench.ts"],
		},
	},
});

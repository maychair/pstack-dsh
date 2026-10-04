import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    platform: 'node',
    format: 'esm',
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    dts: true,
    outDir: 'lib',
    clean: true,
    deps: {
      neverBundle: [/^@deepseek-ai\//],
    },
  },
  {
    entry: { client: 'src/client/index.tsx' },
    platform: 'browser',
    target: 'es2022',
    format: 'cjs',
    tsconfig: 'tsconfig.client.json',
    outExtensions: () => ({ js: '.cjs' }),
    dts: false,
    outDir: 'lib',
    clean: false,
    deps: {
      neverBundle: [/^@deepseek-ai\//, /^react(?:\/|$)/],
    },
  },
])

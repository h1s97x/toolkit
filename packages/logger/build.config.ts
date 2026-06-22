import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['./src/index'],
  outDir: 'dist',
  declaration: 'compatible',
  rollup: {
    emitCJS: true,
    esbuild: {
      target: 'es2020',
    },
  },
});

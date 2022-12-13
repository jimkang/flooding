/* global process */

import createConfig from './rollup-tools/base-config';
import { serve } from './rollup-tools/config-tools';

var floodings = [];

// Inspired by https://github.com/Tom-Siegel/multi-page-svelte/blob/5dd47f9ffe3cbddbaa5e29be5056ce1ed56060b2/rollup-pages.config.js#L45
var configs = [
  {
    input: 'app.ts',
    outputFile: 'index.js',
    reloadPath: '.',
    serve: !process.env.APP && serve,
    serveOpts: { port: 7000 },
  },
]
  .concat(
    floodings.map((v) => ({
      input: `floodings/${v}/${v}-flooding.js`,
      outputFile: `floodings/${v}/${v}-flooding-bundle.js`,
      reloadPath: `floodings/${v}`,
      serve: process.env.APP === v && serve,
      serveOpts: { rootDir: '.', serveDir: `floodings/${v}`, port: 6001 },
    }))
  )
  .map(createConfig);

export default configs;

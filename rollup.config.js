import { builtinModules } from 'module';
import cp from 'child_process';
import path from 'path';
import pkg from './package.json';

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';

const dev = process.env.NODE_ENV === 'development';
const outputPath = path.resolve(__dirname, 'build/');
const serverArgs = ['-b', './sample_bot.py', '-d', '1000'];

function runServer() {
  let proc;
  return {
    writeBundle() {
      if (proc) {
        proc.kill('SIGTERM');
        console.info('Killed outdated server.');
      }
      proc = cp.spawn(
        'node',
        ['--enable-source-maps', './build/index.js', ...serverArgs],
        { stdio: ['ignore', 'inherit', 'inherit'], shell: true, }
      );
    },
  };
}

const app = {
  input: 'app/main.js',
  output: {
    sourcemap: dev,
    format: 'iife',
    name: 'app',
    file: path.resolve(outputPath, 'public/build/bundle.js'),
  },
  plugins: [
    svelte({
      dev,
      css: (css) => {
        css.write('bundle.css');
      },
    }),
    resolve({ browser: true, dedupe: ['svelte'] }),
    commonjs(),
    dev && livereload('public'),
    !dev && terser(),
    copy({
      targets: [
        { src: 'app/public/*', dest: path.resolve(outputPath, 'public/') },
      ],
    }),
  ],
  watch: { clearScreen: false },
};

const server = {
  input: 'server/index.js',
  output: {
    sourcemap: dev,
    file: path.resolve(outputPath, 'index.js'),
    format: 'cjs'
  },
  plugins: [resolve(), dev && runServer()],
  external: builtinModules.concat(Object.keys(pkg.dependencies)),
  watch: { clearScreen: false },
};

const config = [server];
if (process.env.SVELTE_APP) {
  config.push(app);
}
export default config;

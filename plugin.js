'use strict';

const {resolve} = require('path');
const workerpool = require('workerpool');
const fs = require('fs');

module.exports = function postcssPlugin(snowpackConfig, options) {
  // options validation
  if (options) {
    if (typeof options !== 'object' || Array.isArray(options))
      throw new Error('options isn’t an object. Please see README.');
    if (options.config && typeof options.config !== 'string')
      throw new Error('options.config must be a path to a PostCSS config file.');
  }

  let worker, pool;

  return {
    name: '@snowpack/postcss-transform',
    resolve: {
      input: ['.css', '.pcss'],
      output: ['.css'],
    },
    async load({filePath}) {
      let {input = ['.css', '.pcss'], config} = options;
      //console.log(fileExt);
      // if (!input.includes(fileExt) || !contents) return;
      const contents = fs.readFileSync(filePath, 'utf8');

      if (config) {
        config = resolve(config);
      }

      pool = pool || workerpool.pool(require.resolve('./worker.js'));
      worker = worker || (await pool.proxy());

      const encodedResult = await worker.transformAsync(contents, {
        config,
        cwd: snowpackConfig.root || process.cwd(),
        map:
          snowpackConfig.buildOptions && snowpackConfig.buildOptions.sourceMaps
            ? {
                prev: false,
                annotation: false,
                inline: false,
              }
            : false,
      });
      const {css, map} = JSON.parse(encodedResult);

      return {
        '.css': css,
      };
    },
    cleanup() {
      pool && pool.terminate();
    },
  };
};

const mem = require('mem');
const updateNotifier = require('update-notifier');
const weblog = require('webpack-log');

const pkg = require('../package.json');

const eventbus = require('./bus');
const { getApp } = require('./app');
const { getCompiler } = require('./compiler');
const { getOptions } = require('./options');

module.exports = (argv, opts) => {
  updateNotifier({ pkg }).notify();

  process.env.WEBPACK_SERVE = true;

  getOptions(argv, opts)
    .then(({ configs, options }) => {
      const bus = eventbus(options);
      const log = weblog({ id: 'webpack-serve', name: 'serve' });

      /* eslint-disable no-param-reassign */
      options.bus = bus;
      options.compiler = getCompiler(configs, options);

      const app = getApp(options);
      const { start, stop } = app;
      const exit = mem((signal) => {
        stop(() => {
          log.info(`Process Ended via ${signal}`);
          process.exit(0);
        });
      });

      for (const signal of ['exit', 'SIGINT', 'SIGTERM']) {
        process.on(signal, () => exit(signal));
      }

      start();

      return Object.freeze({
        app,
        options,
        on(...args) {
          options.bus.on(...args);
        },
      });
    })
    .catch((e) => {
      process.emitWarning('An error was thrown while starting webpack-serve');
      throw e;
    });
};
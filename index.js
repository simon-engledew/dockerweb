require('babel-core/register')({
  presets: ['es2015'],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "syntax-async-functions","transform-regenerator"]
});
require("babel-polyfill");

require('./src/index.js');

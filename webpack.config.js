const path = require('path');
const webpack = require('webpack');

// Define the Webpack config.
const config = {
  devtool: 'inline-source-map',
  performance: {
    hints: false,
  },
  entry: {
    app: [
      './src/index.js',
    ],
  },
  module: {},
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].js?[chunkhash]',
  },
  plugins: [
    // Use hoisting.
    new webpack.optimize.ModuleConcatenationPlugin(),
  ],
};

// Define development-only plugins.
// if (isDev) {
//   // Setup the source maps.
//   config.plugins.push(new webpack.SourceMapDevToolPlugin({
//     filename: '[file].map',
//   }));
// }

module.exports = config;

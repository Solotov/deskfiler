const path = require('path');
const ArchivePlugin = require('webpack-archive-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './index.js',
  target: 'node',
  output: {
    filename: 'index.js',
    path: path.join(__dirname, '..', '..', 'plugins-dist', 'imageTagViewer'),
  },
  resolve: {
    alias: {
      hummus: './hummus',
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            cacheDirectory: false,
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    electron: '4.1.4',
                  },
                  modules: false,
                  useBuiltIns: 'entry',
                },
              ],
              [
                '@babel/preset-react',
                {
                  development: true,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin([
      {
        from: 'manifest.json',
      },
      {
        from: 'icon.png',
      },
    ]),
    new ArchivePlugin({
      format: 'tar',
      output: path.join(__dirname, '..', '..', 'plugins-dist', 'imageTagViewer'),
    }),
  ],
};

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'lambda-handler': './src/lambda-handler.ts',
    'format-batch-handler': './src/format-batch-handler.ts',
  },
  target: 'node',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  externals: {
    'aws-sdk': 'aws-sdk',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: '.env', to: '.' },
      ],
    }),
  ],
};

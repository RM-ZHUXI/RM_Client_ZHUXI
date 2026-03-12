import type { Configuration } from 'webpack';
import * as path from 'path';

const config: Configuration = {
  entry: './src/preload/index.ts',
  target: 'electron-preload',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx'],
  },
};

export default config;

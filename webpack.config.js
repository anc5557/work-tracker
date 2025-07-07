const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

// Renderer (React) 설정
const rendererConfig = {
  mode: isDevelopment ? 'development' : 'production',
  entry: './src/renderer/index.tsx',
  target: 'electron-renderer',
  devtool: isDevelopment ? 'eval-source-map' : false,
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/renderer/components'),
      '@/lib': path.resolve(__dirname, 'src/renderer/lib'),
      '@/shared': path.resolve(__dirname, 'src/shared')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'renderer.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist/renderer')
    },
    port: 3000,
    hot: true
  }
};

// Main Process 설정
const mainConfig = {
  mode: isDevelopment ? 'development' : 'production',
  entry: './src/main/index.ts',
  target: 'electron-main',
  devtool: isDevelopment ? 'eval-source-map' : false,
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/renderer/components'),
      '@/lib': path.resolve(__dirname, 'src/renderer/lib'),
      '@/shared': path.resolve(__dirname, 'src/shared')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'main.js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ],
  node: {
    __dirname: false,
    __filename: false
  }
};

// Preload 설정
const preloadConfig = {
  mode: isDevelopment ? 'development' : 'production',
  entry: './src/preload/index.ts',
  target: 'electron-preload',
  devtool: isDevelopment ? 'eval-source-map' : false,
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/renderer/components'),
      '@/lib': path.resolve(__dirname, 'src/renderer/lib'),
      '@/shared': path.resolve(__dirname, 'src/shared')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'preload.js'
  },
  node: {
    __dirname: false,
    __filename: false
  }
};

module.exports = [rendererConfig, mainConfig, preloadConfig]; 
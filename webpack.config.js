const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

module.exports = (env = {}, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;

  // Get custom env name from --env (default to 'local')
  const targetEnv = env.env || 'local';

  // Map env names to filenames
  const envFilesMap = {
    local: '.env.local',
    dev: '.env.dev',
    production: '.env.production'
  };

  const envFilename = envFilesMap[targetEnv] || '.env.local';
  const envPath = path.resolve(__dirname, 'envs', envFilename);

  // Load env variables
  const fileExists = fs.existsSync(envPath);
  const envVars = dotenv.config({ path: fileExists ? envPath : undefined }).parsed || {};

  // Inject variables into DefinePlugin
  const envKeys = Object.keys(envVars).reduce((prev, key) => {
    prev[`process.env.${key}`] = JSON.stringify(envVars[key]);
    return prev;
  }, {});

  envKeys['process.env.NODE_ENV'] = JSON.stringify(argv.mode);

  return {
    mode: argv.mode,
    entry: {
      'V2reportingPortal': './src/index.tsx',
    },
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'V2reportingPortal_build'),
      filename: '[name].bundle.js',
      chunkFilename: '[name].[chunkhash:8].js',
      assetModuleFilename: 'static/asset/[name].[hash][ext]',
      publicPath: (envVars.PUBLIC_PATH || '/').replace(/\\/g, '/'),
      clean: true,
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
        watch: false,
      },
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: {
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
      },
      compress: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      // Prevent URI decode errors from serve-index
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }

        // Add URL validation middleware before all others
        const urlValidator = (req, res, next) => {
          if (req.url) {
            try {
              // Validate the URL path can be decoded
              const pathOnly = req.url.split('?')[0].split('#')[0];
              if (pathOnly && pathOnly.length > 1) {
                decodeURIComponent(pathOnly);
              }
            } catch (e) {
              // Malformed URI - return 404 immediately
              res.status(404).send('Not Found');
              return;
            }
          }
          next();
        };

        // Add error handler directly to Express app to catch URI errors
        if (devServer.app) {
          devServer.app.use((err, req, res, next) => {
            if (err && (err.message && err.message.includes('URI malformed') || err.code === 'ERR_INVALID_URI')) {
              res.status(404).send('Not Found');
              return;
            }
            next(err);
          });
        }

        // Insert validator at start
        return [urlValidator, ...middlewares];
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|jpe?g|gif|webp|avif)$/i,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 10 * 1024, // 10kb
            },
          },
        },
        {
          test: /\.svg$/,
          // Only process SVGs imported in src code, not static assets in public
          exclude: /node_modules/,
          type: 'asset/resource',
          generator: {
            filename: 'static/asset/[name].[hash][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/asset/fonts/[name].[hash][ext]',
          },
        },
      ],
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico',
        inject: true,
        ...(isProduction
          ? {
            minify: {
              removeComments: true,
              collapseWhitespace: true,
              removeRedundantAttributes: true,
              useShortDoctype: true,
              removeEmptyAttributes: true,
              removeStyleLinkTypeAttributes: true,
              keepClosingSlash: true,
              minifyJS: true,
              minifyCSS: true,
              minifyURLs: true,
            },
          }
          : undefined),
      }),
      // Ensure public assets are available in the build output (production/dev builds).
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public/assets'),
            to: 'assets',
            noErrorOnMissing: true,
          },
        ],
      }),
      new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      }),
      new webpack.DefinePlugin(envKeys),
      isDevelopment && new webpack.HotModuleReplacementPlugin(),
    ].filter(Boolean),
    resolve: {
      fallback: {
        "buffer": false
      },
      extensions: ['.tsx', '.ts', '.js', '.jsx']
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
  };
};
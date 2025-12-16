// Copyright (C) 2017-2023 Smart code 203358507

const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');
const webpack = require('webpack');
const threadLoader = require('thread-loader');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const packageJson = require('./package.json');

const UNKNOWN_COMMIT_HASH = 'unknown';
const MIN_COMMIT_HASH_LENGTH = 7;
const MAX_COMMIT_HASH_LENGTH = 40;

const COMMIT_HASH = resolveCommitHash({
    projectRootPath: __dirname,
    environment: process.env,
});

function resolveCommitHash({ projectRootPath, environment }) {
    const commitHashFromEnvironment = readCommitHashFromEnvironment(environment);
    if (commitHashFromEnvironment) {
        return commitHashFromEnvironment;
    }

    const gitDirectoryPath = path.join(projectRootPath, '.git');
    const hasGitDirectory = fs.existsSync(gitDirectoryPath);
    if (!hasGitDirectory) {
        return UNKNOWN_COMMIT_HASH;
    }

    const commitHashFromGit = readCommitHashFromGit();
    if (commitHashFromGit) {
        return commitHashFromGit;
    }

    return UNKNOWN_COMMIT_HASH;
}

function readCommitHashFromEnvironment(environment) {
    if (!environment || typeof environment !== 'object') {
        return null;
    }

    const candidates = [
        environment.GIT_COMMIT,
        environment.COMMIT_HASH,
        environment.SOURCE_VERSION,
        environment.GITHUB_SHA,
        environment.CI_COMMIT_SHA,
        environment.VERCEL_GIT_COMMIT_SHA,
    ];

    for (const candidate of candidates) {
        const normalized = normalizeCommitHash(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return null;
}

function readCommitHashFromGit() {
    try {
        const stdout = execSync('git rev-parse HEAD', {
            stdio: ['ignore', 'pipe', 'ignore'],
        });

        return normalizeCommitHash(stdout.toString());
    } catch {
        return null;
    }
}

function normalizeCommitHash(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim().toLowerCase();
    const isHex = /^[0-9a-f]+$/.test(trimmed);
    if (!isHex) {
        return null;
    }

    if (trimmed.length < MIN_COMMIT_HASH_LENGTH) {
        return null;
    }

    return trimmed.slice(0, MAX_COMMIT_HASH_LENGTH);
}

const THREAD_LOADER = {
    loader: 'thread-loader',
    options: {
        name: 'shared-pool',
        workers: os.cpus().length,
    },
};

threadLoader.warmup(
    THREAD_LOADER.options,
    [
        'babel-loader',
        'ts-loader',
        'css-loader',
        'postcss-loader',
        'less-loader',
    ],
);

module.exports = (env, argv) => ({
    mode: argv.mode,
    devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
    entry: {
        main: './src/index.js',
        worker: './node_modules/@stremio/stremio-core-web/worker.js',
    },
    output: {
        path: path.join(__dirname, 'build'),
        filename: `${COMMIT_HASH}/scripts/[name].js`,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    THREAD_LOADER,
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/preset-env',
                                '@babel/preset-react',
                            ],
                        },
                    },
                ],
            },
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: [
                    THREAD_LOADER,
                    {
                        loader: 'ts-loader',
                        options: {
                            happyPackMode: true,
                        },
                    },
                ],
            },
            {
                test: /\.less$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            esModule: false,
                        },
                    },
                    THREAD_LOADER,
                    {
                        loader: 'css-loader',
                        options: {
                            esModule: false,
                            importLoaders: 2,
                            modules: {
                                namedExport: false,
                                localIdentName: '[local]-[hash:base64:5]',
                            },
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    require('cssnano')({
                                        preset: [
                                            'advanced',
                                            {
                                                autoprefixer: {
                                                    add: true,
                                                    remove: true,
                                                    flexbox: false,
                                                    grid: false,
                                                },
                                                cssDeclarationSorter: true,
                                                calc: false,
                                                colormin: false,
                                                convertValues: false,
                                                discardComments: {
                                                    removeAll: true,
                                                },
                                                discardOverridden: false,
                                                discardUnused: false,
                                                mergeIdents: false,
                                                normalizeDisplayValues: false,
                                                normalizePositions: false,
                                                normalizeRepeatStyle: false,
                                                normalizeUnicode: false,
                                                normalizeUrl: false,
                                                reduceIdents: false,
                                                reduceInitial: false,
                                                zindex: false,
                                            },
                                        ],
                                    }),
                                ],
                            },
                        },
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                strictMath: true,
                                ieCompat: false,
                            },
                        },
                    },
                ],
            },
            {
                test: /\.ttf$/,
                exclude: /node_modules/,
                type: 'asset/resource',
                generator: {
                    filename: `${COMMIT_HASH}/fonts/[name][ext][query]`,
                },
            },
            {
                test: /\.(png|jpe?g|svg)$/,
                exclude: /node_modules/,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name][ext][query]',
                },
            },
            {
                test: /\.wasm$/,
                type: 'asset/resource',
                generator: {
                    filename: `${COMMIT_HASH}/binaries/[name][ext][query]`,
                },
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json', '.less', '.wasm'],
        alias: {
            stremio: path.resolve(__dirname, 'src'),
            'stremio-router': path.resolve(__dirname, 'src', 'router'),
        },
    },
    devServer: {
        host: '0.0.0.0',
        static: false,
        hot: false,
        server: 'https',
        liveReload: false,
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                test: /\.js$/,
                extractComments: false,
                terserOptions: {
                    ecma: 5,
                    mangle: true,
                    warnings: false,
                    output: {
                        comments: false,
                        beautify: false,
                        wrap_iife: true,
                    },
                },
            }),
        ],
    },
    plugins: [
        new webpack.ProgressPlugin(),
        new webpack.EnvironmentPlugin({
            SENTRY_DSN: null,
            ...(env || {}),
            SERVICE_WORKER_DISABLED: false,
            DEBUG: argv.mode !== 'production',
            VERSION: packageJson.version,
            COMMIT_HASH,
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ['*'],
        }),
        argv.mode === 'production' &&
            new WorkboxPlugin.GenerateSW({
                maximumFileSizeToCacheInBytes: 20000000,
                clientsClaim: true,
                skipWaiting: true,
            }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'favicons', to: 'favicons' },
                { from: 'images', to: 'images' },
                { from: 'screenshots/*.webp', to: './' },
                { from: '.well-known', to: '.well-known' },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: `${COMMIT_HASH}/styles/[name].css`,
        }),
        new HtmlWebPackPlugin({
            template: './src/index.html',
            inject: false,
            scriptLoading: 'blocking',
            faviconsPath: 'favicons',
            imagesPath: 'images',
        }),
        new WebpackPwaManifest({
            name: 'Stremio Web',
            short_name: 'Stremio',
            description: 'Freedom To Stream',
            background_color: '#161523',
            theme_color: '#2a2843',
            orientation: 'any',
            display: 'standalone',
            display_override: ['standalone'],
            scope: './',
            start_url: './',
            publicPath: './',
            icons: [
                {
                    src: 'images/icon.png',
                    destination: 'icons',
                    sizes: [196, 512],
                    purpose: 'any',
                },
                {
                    src: 'images/maskable_icon.png',
                    destination: 'maskable_icons',
                    sizes: [196, 512],
                    purpose: 'maskable',
                    ios: true,
                },
                {
                    src: 'favicons/favicon.ico',
                    destination: 'favicons',
                    sizes: [256],
                },
            ],
            screenshots: [
                {
                    src: 'screenshots/board_wide.webp',
                    sizes: '1440x900',
                    type: 'image/webp',
                    form_factor: 'wide',
                    label: 'Homescreen of Stremio',
                },
                {
                    src: 'screenshots/board_narrow.webp',
                    sizes: '414x896',
                    type: 'image/webp',
                    form_factor: 'narrow',
                    label: 'Homescreen of Stremio',
                },
            ],
            fingerprints: false,
            ios: true,
        }),
    ].filter(Boolean),
});

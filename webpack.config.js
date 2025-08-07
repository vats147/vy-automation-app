const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    entry: './src/renderer/index.js',
    target: 'electron-renderer',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'renderer.js',
    },
    resolve: {
        extensions: ['.js', '.jsx'],
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', { targets: { electron: '28' } }],
                            ['@babel/preset-react', { runtime: 'automatic' }]
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                type: 'asset/resource'
            }
        ]
    },
    devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
    externals: {
        'electron': 'commonjs electron'
    }
};

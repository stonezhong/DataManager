const webpack = require("webpack");
const path = require("path");

module.exports = {
    mode: "development",
    externals: {
        jquery: 'jQuery',
        react: 'React',
        'react-dom': 'ReactDOM',
    },
    resolve: {
        roots: [
            path.resolve('./explorer/client'),
        ],
    },
    entry: {
        "datasets"          : '/pages/datasets/main.jsx',
        "dataset"           : '/pages/dataset/main.jsx',
        "pipelines"         : '/pages/pipelines/main.jsx',
        "pipeline"          : '/pages/pipeline/main.jsx',
        "pipeline_groups"   : '/pages/pipeline_groups/main.jsx',
        "pipeline_group"    : '/pages/pipeline_group/main.jsx',
        "applications"      : '/pages/applications/main.jsx',
        "schedulers"        : '/pages/schedulers/main.jsx',
        "test"              : '/pages/test/main.jsx',
    },
    output: {
        path: path.resolve("explorer", "static", "js-bundle"),
        filename: "[name].js"
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                    }
                ],
            },
            {
                test: /\.css$/,
                loader: 'style-loader',
            },
            {
                test: /\.css$/,
                loader: 'css-loader',
            }
        ]
    },
    devtool: '#inline-source-map'
}
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
            path.resolve('./explorer/static/js'),
        ],
    },
    entry: {
        "datasets"          : './explorer/static/js/pages/datasets/main.jsx',
        "dataset"           : './explorer/static/js/pages/dataset/main.jsx',
        "pipelines"         : './explorer/static/js/pages/pipelines/main.jsx',
        "pipeline"          : './explorer/static/js/pages/pipeline/main.jsx',
        "pipeline_groups"   : './explorer/static/js/pages/pipeline_groups/main.jsx',
        "pipeline_group"    : './explorer/static/js/pages/pipeline_group/main.jsx',
        "applications"      : './explorer/static/js/pages/applications/main.jsx',
        "schedulers"        : './explorer/static/js/pages/schedulers/main.jsx',
        "test"              : './explorer/static/js/pages/test/main.jsx',
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
        ]
    },
    devtool: '#inline-source-map'
}
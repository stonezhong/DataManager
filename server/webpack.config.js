const webpack = require("webpack");
const path = require("path");

module.exports = {
    mode: "development",
    externals: {
        jquery: 'jQuery',
        react: 'React',
        'react-dom': 'ReactDOM',
    },
    entry: {
        "home"              : './explorer/static/js/home.jsx',
        "datasets"          : './explorer/static/js/datasets.jsx',
        "dataset"           : './explorer/static/js/dataset.jsx',
        "pipelines"         : './explorer/static/js/pipelines.jsx',
        "pipeline"          : './explorer/static/js/pipeline.jsx',
        "pipeline_groups"   : './explorer/static/js/pipeline_groups.jsx',
        "pipeline_group"    : './explorer/static/js/pipeline_group.jsx',
        "applications"      : './explorer/static/js/applications.jsx',
        "test"              : './explorer/static/js/test.jsx',

        // "index": './explorer/static/js/index.jsx',
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
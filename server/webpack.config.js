const webpack = require("webpack");
const path = require("path");

module.exports = env => ({
    mode: env,
    externals: {
        jquery: 'jQuery',
        react: 'React',
        'react-dom': 'ReactDOM',
        'react-bootstrap/Button':       ['ReactBootstrap', 'Button'],
        'react-bootstrap/Col':          ['ReactBootstrap', 'Col'],
        'react-bootstrap/Row':          ['ReactBootstrap', 'Row'],
        'react-bootstrap/Form':         ['ReactBootstrap', 'Form'],
        'react-bootstrap/Container':    ['ReactBootstrap', 'Container'],
        'react-bootstrap/Modal':        ['ReactBootstrap', 'Modal'],
        'react-bootstrap/Table':        ['ReactBootstrap', 'Table'],
        'react-bootstrap/Spinner':      ['ReactBootstrap', 'Spinner'],
        'react-bootstrap/Alert':        ['ReactBootstrap', 'Alert'],
        'lodash': '_',
        '@ckeditor/ckeditor5-build-classic': 'ClassicEditor',
        '@ckeditor/ckeditor5-react': 'CKEditor',
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
        "application"       : '/pages/application/main.jsx',
        "dataset_instance"  : '/pages/dataset_instance/main.jsx',
        "schedulers"        : '/pages/schedulers/main.jsx',
        "datarepos"         : '/pages/datarepos/main.jsx',
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
                test: /\.s[ac]ss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ]
            }
        ]
    },
    devtool: env=="production"?undefined:'#inline-source-map'
});

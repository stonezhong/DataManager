# js debug
see "devtool: '#inline-source-map'" in webpack.config.js, you can remove this line for production.


# Data Catalog Service
## APIs
```
POST /Datasets              Create a dataset
GET /Datasets               List all dataset
DEL /Datasets/<id>          Delete a dataset, only can delete if there is not dataset instance
PATCH /Datasets/<id>        Only description, author, team can change
```


# TODO
- Dataset PATCH method only can update description, author and team field.

```
npm install @babel/core @babel/preset-env @babel/preset-react @babel/plugin-proposal-class-properties babel-loader html-loader html-webpack-plugin webpack webpack-cli --save-dev
```

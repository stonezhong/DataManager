# [setup and deploy](setup.md)

# Tips
<details>
<summary>Enable js debug</summary>

see the following line in `webpack.config.js`:

```
devtool: '#inline-source-map'
```
</details>

<details>
<summary>JS to import local library using absolute path</summary>

- Advantage: You do not need to modify your code if you move your code location.

E.g., you can do:
```
import {dt_2_utc_string, get_csrf_token} from '/common_lib'
```

since we have below, any absolute path will be looked under ./explorer/static/js
```
    resolve: {
        roots: [
            path.resolve('./explorer/static/js'),
        ],
    },
```
</details>

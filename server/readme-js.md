```
explorer/static/css/bootstrap.min.css is copied from bootstrap@4.4.1, so stick to this version of bootstrap in package.json

always run npm list and try to fix errors

popper.js: is required by bootstrap@4.4.1, add it manually.
node-sass: is required by sass-loader@10.1.1
fibers@3.1.0: is required by sass-loader@10.1.1

"private": true in package.json
    this is to solve warning below:
npm WARN data-manager@1.0.0 No repository field.
npm WARN data-manager@1.0.0 license should be a valid SPDX license expression

in template base.html, use specific version instead of only specify major version
<script src="https://unpkg.com/react@16/umd/react.development.js"></script> is not good since it causes redirect which wastes ~100 ms, it redirects to
https://unpkg.com/react@16.14.0/umd/react.development.js, since we want to absolutely control the minor version and make sure it matches what we have in package.json


```


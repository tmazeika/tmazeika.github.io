# [mazeika.me](https://mazeika.me)

My personal site. Built with [Pug](https://pugjs.org) and a custom script.

## Development

```sh
# Install packages
yarn
# Build the project into build/public/ (required for every change!)
yarn build
# Serve the static files at build/public/ (development only)
yarn start
```

The build script just executes the [build.js](./build.js) file. Here's a summary of how it works:

- Looks at src/pages/blog/index.json to find all blog posts' metadata (title, slug, and date).
- Uses src/blog-gen/post.pug as a template for compiling each blog post Markdown file into HTML, each time
  replacing `content` with the associated rendered Markdown content.
- Recursively compiles .pug files within src/pages/ into HTML, keeping the same directory structure. If a .json file
  with the same basename exists next to the Pug template, it will pass that JSON object to the Pug compiler only for
  that template.
- Finally, it recursively copies src/assets/ into build/public/assets/.

I've explored a couple of different frameworks for building this blog before settling on [Pug](https://pugjs.org) templating with a custom build script. Most other solutions added too much magic and unnecessary complexity to the simple use case that I had. I wanted:

1. An "about me" page.
2. An index of all blog posts.
3. Blog posts written in Markdown with syntax highlighting for fenced code blocks.

None of those requirements included server interaction, so the entirety of the site would be served statically. This is where a bundler like Webpack would have come in, but I opted to bundle the static site by invoking the Pug, Markdown, and syntax highlighting compilers manually in code. Back to the basics. The advantages are several:

1. You spend just as much time fumbling with Webpack plugins for a few hours.
2. You actually understand what's happening.
3. It's fun!

The following is a high-level tutorial on how to get started on your own blog. It is not meant to fully detail every step. Instead, it is a guide for how to fit together all the pieces. For a completed example, check out the [source of this site](https://github.com/tmazeika/tmazeika.github.io/tree/395b9d982206a8b45c93fad1cff714c4487b5aed).

## Project Setup

Create a Node project with Yarn and add the [pug](https://www.npmjs.com/package/pug) package. Also create a `build.js` file, which will be responsible for bundling our templates and assets into a static site.

```text
.
├── node_modules/
├── build.js
├── package.json
└── yarn.lock
```

In your `package.json`, add a `build` script that runs `node build.js`:

<pre class="filename"><code>package.json</code></pre>
```json lines
{
  // ...
  "scripts": {
    "build": "node build.js"
  },
  // ...
}
```

## Pages

Use Pug to create a layout template from which all pages will extend. Then, create the homepage, blog index, and a sample blog post.

<pre class="filename"><code>layout.pug</code></pre>
```pug
doctype html
html
  head: title My Blog
  body: block content
```

<pre class="filename"><code>index.pug</code></pre>
```pug
extends layout
block content
  p Welcome to my blog!
  p: a(href='blog') All Posts
```

<pre class="filename"><code>blog/index.pug</code></pre>
```pug
extends ../layout
block content
  h1 All Posts
  ul
    li: a(href='first-post.html') First Post
```

<pre class="filename"><code>blog/first-post.pug</code></pre>
```pug
extends ../layout
block content
  h1 First Post
  p This is my first blog post. Wow!
```

Ideally, we would like to generate the following site structure from these templates:

```text
public/
├── blog/
│   ├── first-post.html
│   └── index.html
└── index.html
```

The [Pug docs](https://pugjs.org/api/reference.html#pugcompilefilepath-options) tell us how to compile a Pug template into an HTML string. Since this is a part of the build step, put this into `build.js`:

<pre class="filename"><code>build.js</code></pre>
```js
const fs = require('fs'); // This is built in to Node!
const pug = require('pug');

// Compile each template with Pug.
const indexHtml =  pug.renderFile('index.pug');
const blogIndexHtml =  pug.renderFile('blog/index.pug');
const blogFirstPostHtml =  pug.renderFile('blog/first-post.pug');

// Now that we have HTML strings, let's write them out to files within public/.
// Since this is a build script, we'll want to start with an empty build
// directory every time, so recursively remove public/:
fs.rmSync('public', { recursive: true, force: true });
fs.mkdirSync('public');
fs.mkdirSync('public/blog');
fs.writeFileSync('public/index.html', indexHtml);
fs.writeFileSync('public/blog/index.html', blogIndexHtml);
fs.writeFileSync('public/blog/first-post.html', blogFirstPostHtml);
```

That's it! Run `yarn build` and open up `public/index.html` in your browser. At this point, we'll skip over how to make this more flexible for a larger site, but the basic idea is there.

# Markdown

Now looking at [this section](https://pugjs.org/language/includes.html#including-filtered-text) of the Pug docs, we've got immediate direction for how to add Markdown support. You would just do `yarn add markdown-it jstransformer jstransformer-markdown-it`, copy in their example, and voilà! However, we're going to go in a slightly different direction in light of doing everything ourselves. It's actually easier that way because we're going to want to configure the syntax highlighter later.

Add only the Markdown compiler with `yarn add markdown-it`. Now let's write our blog post in Markdown, in a file next to `first-post.pug` called `first-post.md` (note the extension):

<pre class="filename"><code>first-post.md</code></pre>
```md
# First Post
This is my first blog post. Wow!
```

And update `first-post.pug` to include it:

<pre class="filename"><code>first-post.pug</code></pre>
```pug
extends ../layout
block content
  include:markdown first-post.md
```

During the build step, Pug will read `first-post.md` and run it through a function that we're going to supply called `markdown()`. Super simple stuff. Let's give it `markdown()`:

<pre class="filename"><code>build.js</code></pre>
```js
const fs = require('fs');
// Import the Markdown compiler and instantiate it.
const md = require('markdown-it')();
const pug = require('pug');

const options = {
  filters: {
     // `src` is just raw text from our .md file. This function renders it into
    // HTML.
    markdown: (src) => md.render(src),
  },
};

// Pass the `options` object to the Pug compiler.
const indexHtml =  pug.renderFile('index.pug', options);
const blogIndexHtml =  pug.renderFile('blog/index.pug', options);
const blogFirstPostHtml =  pug.renderFile('blog/first-post.pug', options);
// ...
```

## Syntax Highlighting

I decided to use [Shiki](https://shiki.matsu.io/) for this, but most other syntax highlighters work just the same. Run `yarn add shiki`. Similar to the Markdown compiler, the Shiki library provides to us a function, `codeToHtml()`, that turns some string of source code into colorful HTML. The markdown-it instantiation procedure is quite amenable to such a function:

<pre class="filename"><code>build.js</code></pre>
```js
const fs = require('fs');
const pug = require('pug');

(async () => {
  const highlighter = await require('shiki').getHighlighter({
    theme: 'one-dark-pro',
  });
  const md = require('markdown-it')({
    // `src` is the raw text inside fenced code blocks that markdown-it finds.
    // `lang` is the specified language of that code block.
    highlight: (src, lang) => highlighter.codeToHtml(src, { lang }),
  });
  const options = {
    filters: {
      markdown: (src) => md.render(src), // No change here!
    },
  };
  // Move the rest of the old code into this function body...
})();
```

We've moved everything into an immediately invoked async function because Shiki decided to provide an async API. No big deal.

## Continuing

Figuring out how to compose and customize dependencies is a challenge. That's why I've kept the dependency tree tiny and why I call into those libraries, not get called by them. As a result, it should be fairly easy (depending on skill level) to implement some of the following suggestions and beyond:

- **Add an assets directory.** Store your images, styles, and scripts in here and then copy them verbatim into the `public/assets/` directory during the build step.
- **Keep track of the current page for navigation purposes.** You can pass the name of each page as a variable during template compilation. Then, conditionally highlight the active page in a navbar.
- **Generalize the Pug compilation code in `build.js`.** There's a bit of repeated code when reading and compiling templates. List the files in your directory and filter for those ending in ".pug".
- **Auto-generate the blog index.** Use Pug's iteration syntax and a JS object with all blog posts in it that you can pass into the Pug compiler's `options` parameter.
- **Eliminate `first-post.pug`.** This is a little trickier because you can't use variables when specifying the `include` path in a Pug template. I solved this by copying all my source files into a temporary directory and then preprocessing the blog posts to effectively generate the post templates for me.

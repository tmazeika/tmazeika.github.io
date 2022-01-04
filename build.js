#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pug = require('pug');

(async () => {
  const highlighter = await require('shiki').getHighlighter({
    theme: 'one-dark-pro',
  });
  const md = require('markdown-it')({
    highlight(src, lang) {
      return highlighter.codeToHtml(src, { lang });
    },
  });
  const defaultPugOptions = {
    filters: {
      md: (src) => md.render(src),
    },
  };

  fs.rmSync('build', { recursive: true, force: true });

  copyTree('src', 'build/src');

  const blogIndexContent = fs.readFileSync('build/src/pages/blog/index.json', { encoding: 'utf-8' });
  const { posts: blogPosts } = JSON.parse(blogIndexContent);
  fs.mkdirSync('build/public/blog', { recursive: true });
  fs.mkdirSync('build/public/assets', { recursive: true });
  blogPosts.forEach((options) => {
    fs.copyFileSync(`build/src/pages/blog/${options.slug}.md`, 'build/src/blog-gen/content.md');
    const templateFilename = 'build/src/blog-gen/post.pug';
    let template = fs.readFileSync(templateFilename, { encoding: 'utf-8' });
    template = template.replaceAll('__filename', `../pages/blog/${options.slug}.md`);
    const rendered = pug.render(template, {
      ...defaultPugOptions,
      ...options,
      filename: templateFilename,
      pageName: options.title,
    });
    fs.writeFileSync(`build/public/blog/${options.slug}.html`, rendered);
  });

  copyTree('build/src/pages', 'build/public', (filename) =>
    path.extname(filename) === '.pug' ? compilePage(filename) : []);
  copyTree('build/src/assets', 'build/public/assets');

  function copyTree(srcDir, dstDir, fileFn) {
    fs.mkdirSync(dstDir, { recursive: true });
    fs.readdirSync(srcDir).forEach((srcFilename) => {
      const dstFilename = path.join(dstDir, srcFilename);
      srcFilename = path.join(srcDir, srcFilename);
      if (fs.statSync(srcFilename).isDirectory()) {
        copyTree(srcFilename, dstFilename, fileFn);
      } else if (fileFn) {
        const [newFilename, content] = fileFn(srcFilename);
        if (typeof content === 'string') {
          fs.writeFileSync(path.join(dstDir, newFilename), content);
        }
      } else {
        fs.copyFileSync(srcFilename, dstFilename);
      }
    });
  }

  function compilePage(filename) {
    const { dir, name } = path.parse(filename);
    const optionsFilename = path.join(dir, `${name}.json`);
    let options;
    if (fs.existsSync(optionsFilename)) {
      const content = fs.readFileSync(optionsFilename, { encoding: 'utf-8' });
      options = JSON.parse(content);
    }
    return [`${name}.html`, pug.renderFile(filename, {
      ...defaultPugOptions,
      ...options,
    })];
  }
})();

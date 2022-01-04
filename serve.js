#!/usr/bin/env node

const port = 8080;
const fileServer = new (require('node-static')).Server('build/public');
require('http')
  .createServer((req, res) =>
    fileServer.serve(req, res))
  .listen(port, () =>
    console.log(`http://localhost:${port}`));

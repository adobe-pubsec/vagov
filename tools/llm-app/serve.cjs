const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const findSchools = require('./actions/find-schools/index.js');
const compareSchools = require('./actions/compare-schools/index.js');

const blockPath = path.resolve(__dirname, '../../blocks/gi-bill-comparison');
const scriptsPath = path.resolve(__dirname, '../../scripts');
const assets = new Map([
  ['/', [path.join(__dirname, 'preview.html'), 'text/html']],
  ['/preview.js', [path.join(__dirname, 'preview.js'), 'text/javascript']],
  ['/blocks/gi-bill-comparison/gi-bill-comparison.js', [path.join(blockPath, 'gi-bill-comparison.js'), 'text/javascript']],
  ['/blocks/gi-bill-comparison/gi-bill-comparison.css', [path.join(blockPath, 'gi-bill-comparison.css'), 'text/css']],
  ['/scripts/gi-bill-catalog.mjs', [path.join(scriptsPath, 'gi-bill-catalog.mjs'), 'text/javascript']],
  ['/scripts/gi-bill-schools.json', [path.join(scriptsPath, 'gi-bill-schools.json'), 'application/json']],
]);
const handlers = new Map([
  ['/api/find-schools', findSchools],
  ['/api/compare-schools', compareSchools],
]);

function createServer() {
  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET' || request.url.length > 4096) {
      response.writeHead(400).end('Only bounded GET requests are supported by this local preview.');
      return;
    }
    const url = new URL(request.url, 'http://localhost');
    const handler = handlers.get(url.pathname);
    if (handler) {
      let args;
      try {
        args = JSON.parse(url.searchParams.get('args') || '{}');
      } catch (error) {
        response.writeHead(400).end('Action arguments must be valid JSON.');
        return;
      }
      try {
        const result = await handler(args);
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
      } catch (error) {
        console.error('[gi-bill-preview] Handler failed:', error);
        response.writeHead(500).end('The action could not be completed.');
      }
      return;
    }
    const asset = assets.get(url.pathname);
    if (!asset) {
      response.writeHead(404).end('Not found.');
      return;
    }
    try {
      const data = await readFile(asset[0]);
      response.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8` }).end(data);
    } catch (error) {
      console.error('[gi-bill-preview] Asset could not be read:', error);
      response.writeHead(500).end('The preview asset could not be loaded.');
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.on('error', (error) => {
    console.error('[gi-bill-preview] Server failed:', error);
    process.exitCode = 1;
  });
  server.listen(3011, '127.0.0.1', () => {
    process.stdout.write('GI Bill LLM App local preview: http://127.0.0.1:3011\n');
  });
}

module.exports = createServer;

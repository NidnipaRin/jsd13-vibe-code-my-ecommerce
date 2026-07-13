import http from 'node:http';
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

function loadEnv() {
  const envFile = new URL('./.env', import.meta.url);
  const contents = readFileSync(envFile, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnv();
const port = Number(process.env.PORT || 3000);
const client = new MongoClient(process.env.MONGODB_URI);
const database = () => client.db(process.env.MONGODB_DB || 'solitair-friend-project');
const productTypeLabels = {
  service_online: 'คอร์สออนไลน์',
  service_onsite: 'บริการที่หน้าร้าน',
  physical: 'อุปกรณ์และสินค้า'
};

function send(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' });
    return response.end();
  }
  try {
    if (request.method === 'GET' && request.url === '/api/health') {
      await database().command({ ping: 1 });
      return send(response, 200, { status: 'ok', database: database().databaseName });
    }
    if (request.method === 'GET' && request.url?.startsWith('/api/products')) {
      const products = (await database().collection('products').find({}).limit(100).toArray()).map((product) => ({
        ...product,
        category: product.category || productTypeLabels[product.product_type] || 'สินค้า'
      }));
      return send(response, 200, { products });
    }
    return send(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Database request failed:', error.message);
    return send(response, 503, { error: 'Database is unavailable' });
  }
});

server.listen(port, async () => {
  try {
    await client.connect();
    console.log(`API connected to MongoDB and listening on http://localhost:${port}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
});

process.on('SIGINT', async () => { await client.close(); process.exit(0); });

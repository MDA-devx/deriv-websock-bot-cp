import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
// Serve static files with logging
app.use((req, res, next) => {
  console.log(`[Static] Request: ${req.method} ${req.path}`);
  next();
});
app.use(express.static(path.join(__dirname, '..')));

const port = 3002; // Fixed port for consistency
console.log(`[Backend] Preparing to start server on port ${port}`);

const server = createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`[Backend] Server running at http://0.0.0.0:${port}/`);
  console.log(`[Backend] Access locally at: http://localhost:${port}/`);
  console.log(`[Backend] Serving static files from: ${path.join(__dirname, '..')}`);
});

server.on('error', (err) => {
  console.error(`[Backend] Server error:`, err);
});

server.on('listening', () => {
  console.log(`[Backend] Server is listening on port ${port}`);
});

export default server;
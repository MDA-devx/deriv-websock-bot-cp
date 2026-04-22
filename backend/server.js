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

// Get hostname from environment or use default
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT || 3002; // Fixed port for consistency
console.log(`[Backend] Preparing to start server on ${hostname}:${port}`);

const server = createServer(app);

server.listen(port, hostname, () => {
  console.log(`[Backend] Server running at http://${hostname}:${port}/`);
  console.log(`[Backend] Access locally at: http://localhost:${port}/`);
  console.log(`[Backend] Serving static files from: ${path.join(__dirname, '..')}`);
  
  // Provide helpful instructions for local dashboard access
  if (hostname === '0.0.0.0') {
    console.log(`[Backend] For local dashboard access, use: http://localhost:${port}/free-index.html`);
    console.log(`[Backend] Or configure your hosts file to map dashboard.deriv to 127.0.0.1`);
  }
});

server.on('error', (err) => {
  console.error(`[Backend] Server error:`, err);
});

server.on('listening', () => {
  console.log(`[Backend] Server is listening on port ${port}`);
});

export default server;
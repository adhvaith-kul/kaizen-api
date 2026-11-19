import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { log, errorLog } from './utils/logger.js';
import apiRoutes from './api/index.js';
import { query } from './config/db.js';

dotenv.config();
process.env.TZ = 'Asia/Kolkata';

let currentDir = process.cwd();
try {
  if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string' && import.meta.url.startsWith('file:')) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  currentDir = process.cwd();
}
const __dirname = currentDir;

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Serve static assets for the landing page in local Node environment
const assetsDir = path.resolve(__dirname, '..', 'public', 'assets');
const altAssetsDir = path.resolve(process.cwd(), 'public', 'assets');
if (fs.existsSync(assetsDir)) {
  app.use('/assets', express.static(assetsDir));
} else if (fs.existsSync(altAssetsDir)) {
  app.use('/assets', express.static(altAssetsDir));
}

app.use(
  morgan('dev', {
    skip: () => process.env.NODE_ENV === 'test',
    stream: {
      write: (message) => log(message.trim()),
    },
  })
);

// Landing Page
app.get('/', (req, res) => {
  const landingFile = path.resolve(__dirname, '..', 'public', 'index.html');
  const altFile = path.resolve(process.cwd(), 'public', 'index.html');
  if (fs.existsSync(landingFile)) {
    return res.sendFile(landingFile);
  }
  if (fs.existsSync(altFile)) {
    return res.sendFile(altFile);
  }
  res.type('html').send('<!DOCTYPE html><html><body><h1>Kaizen API</h1></body></html>');
});

// API status (moved from / to /status)
app.get('/status', (req, res) => {
  res.json({ message: 'Kaizen API is running!' });
});

app.get('/init', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date() });
});

app.get('/health', async (req, res) => {
  try {
    let dbStatus = 'unconfigured';
    let dbTime = null;

    if (process.env.DATABASE_URL) {
      try {
        const result = await query('SELECT NOW()');
        dbStatus = 'connected';
        dbTime = result.rows[0].now;
      } catch (dbErr) {
        dbStatus = 'error';
      }
    }

    res.json({
      status: 'ok',
      service: 'kaizen-api',
      database: dbStatus,
      dbTime,
      timestamp: new Date(),
    });
  } catch (error) {
    errorLog('Health check error:', error);
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: 'Uploaded file or payload is too large. Please select smaller images.',
    });
  }
  errorLog('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;

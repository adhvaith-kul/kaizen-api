import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { log, errorLog } from './utils/logger.js';
import apiRoutes from './api/index.js';
import { query } from './config/db.js';

dotenv.config();
process.env.TZ = 'Asia/Kolkata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Serve static assets for the landing page
app.use('/assets', express.static(path.join(__dirname, '..', 'public', 'assets')));

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
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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

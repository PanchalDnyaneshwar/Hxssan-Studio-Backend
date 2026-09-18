import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import inquiryRoutes from './routes/inquiries.js';
import projectRoutes from './routes/projects.js';
import reelRoutes from './routes/reels.js';
import serviceRoutes from './routes/services.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hxssan-studio-backend',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/services', serviceRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start Server & Connect Database
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`⚡ Hxssan Studio Express Server Started`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🛡️  Admin API ready: /api/auth/login`);
      console.log(`📬 Inquiries API ready: /api/inquiries`);
      console.log(`🗄️  PostgreSQL Connected & Schema Ready`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

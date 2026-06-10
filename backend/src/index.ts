import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import qrTagRoutes from './routes/qrTags.js';
import friendRoutes from './routes/friends.js';
import budgetRoutes from './routes/budgets.js';
import analyticsRoutes from './routes/analytics.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // In production, restrict to allowed origins
  credentials: true,
}));
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/qr-tags', qrTagRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/analytics', analyticsRoutes);

// Catch 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Centralized Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] PocketPal API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

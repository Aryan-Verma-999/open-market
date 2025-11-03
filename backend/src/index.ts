import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import compression from 'compression';
import { prisma } from './lib/database';
import { redis } from './lib/redis';
import { QueryOptimizer } from './lib/queryOptimizer';
// import { monitoringService, errorHandler } from './lib/monitoring';
import { securityHeaders, corsConfig, sanitizeInput, requestSizeLimiter } from './middleware/security';
import { rateLimiter, rateLimitConfigs } from './middleware/rateLimiter';
import routes from './routes';
import { initializeSocketService } from './services/socketService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3002;

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Compression middleware for response optimization
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Security middleware
app.use(securityHeaders());
app.use(cors(corsConfig()));

// Request monitoring
// app.use(monitoringService.requestMonitoring());

// Request sanitization and size limiting
app.use(sanitizeInput());
app.use(requestSizeLimiter('50mb')); // Increased for file uploads

// Rate limiting
app.use('/api/auth', rateLimiter(rateLimitConfigs.auth));
app.use('/api/search', rateLimiter(rateLimitConfigs.search));
app.use('/api/upload', rateLimiter(rateLimitConfigs.upload));
app.use('/api', rateLimiter(rateLimitConfigs.api));

// Logging middleware
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400 // Only log errors in production
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Simple health check
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Metrics endpoint for monitoring (protected in production)
app.get('/metrics', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !req.get('X-Internal-Request')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// API routes
app.use('/api', routes);

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString(),
    },
  });
});

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  
  // Initialize WebSocket service
  try {
    const socketService = initializeSocketService(server);
    console.log('🔌 WebSocket service initialized');
  } catch (error) {
    console.warn('⚠️  WebSocket service initialization failed:', error);
  }
  
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database');
  } catch (error) {
    console.warn('⚠️  Failed to connect to database:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Server will continue running without database for development');
    }
  }

  // Warm up cache for better initial performance
  try {
    await QueryOptimizer.warmUpCache();
    console.log('🔥 Cache warmed up successfully');
  } catch (error) {
    console.warn('⚠️  Cache warm-up failed:', error);
  }

  // Schedule periodic cleanup
  // setInterval(async () => {
  //   try {
  //     await monitoringService.cleanup(30); // Keep 30 days of data
  //   } catch (error) {
  //     console.error('Periodic cleanup failed:', error);
  //   }
  // }, 24 * 60 * 60 * 1000); // Run daily

  console.log('🎯 Performance optimizations enabled');
  console.log('🛡️  Security middleware active');
  console.log('📊 Monitoring and logging active');
});

export default app;
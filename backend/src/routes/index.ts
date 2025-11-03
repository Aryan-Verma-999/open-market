import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import listingRoutes from './listings';
import categoryRoutes from './categories';
import searchRoutes from './search';
import messageRoutes from './messages';
import notificationRoutes from './notifications';
import dashboardRoutes from './dashboard';
import adminRoutes from './admin';
import reportRoutes from './reports';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API info
router.get('/', (req, res) => {
  res.json({ 
    message: 'Equipment Marketplace API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      listings: '/api/listings',
      search: '/api/search',
      messages: '/api/messages',
      notifications: '/api/notifications',
      categories: '/api/categories',
      dashboard: '/api/dashboard',
      admin: '/api/admin',
      reports: '/api/reports'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/listings', listingRoutes);
router.use('/search', searchRoutes);
router.use('/categories', categoryRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);

export default router;
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/database';
import simpleAuthRoutes from './routes/simple-auth';
import simpleMessageRoutes from './routes/simple-messages';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth routes
app.use('/api/auth', simpleAuthRoutes);

// Message routes
app.use('/api/messages', simpleMessageRoutes);

// Categories route
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    res.json(categories);
  } catch (error) {
    console.error('Categories error:', error);
    res.json([
      { id: 1, name: 'Construction Equipment', slug: 'construction', children: [] },
      { id: 2, name: 'Agricultural Equipment', slug: 'agricultural', children: [] },
      { id: 3, name: 'Industrial Equipment', slug: 'industrial', children: [] }
    ]);
  }
});

// Listings routes
app.get('/api/listings', async (req, res) => {
  try {
    const { seller } = req.query;
    
    let whereClause = {};
    
    // If seller=me, get listings for the authenticated user
    if (seller === 'me') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_secret');
        whereClause = { sellerId: decoded.userId };
      } catch (jwtError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            city: true,
            state: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    res.json({
      listings,
      total: listings.length,
      page: 1,
      limit: 50
    });
  } catch (error) {
    console.error('Listings error:', error);
    res.json({
      listings: [],
      total: 0,
      page: 1,
      limit: 50
    });
  }
});

// Create new listing
app.post('/api/listings', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_secret');
    
    const {
      title,
      description,
      category,
      brand,
      model,
      condition,
      price,
      location,
      specifications,
      images
    } = req.body;

    if (!title || !description || !category || !condition || !price || !location) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, category, condition, price, location'
      });
    }

    // Find or create category
    let categoryRecord = await prisma.category.findFirst({
      where: { 
        OR: [
          { slug: category },
          { name: { contains: category, mode: 'insensitive' } }
        ]
      }
    });

    if (!categoryRecord) {
      // Create a new category if it doesn't exist
      categoryRecord = await prisma.category.create({
        data: {
          name: category.charAt(0).toUpperCase() + category.slice(1),
          slug: category.toLowerCase().replace(/\s+/g, '-'),
          description: `${category} equipment and machinery`
        }
      });
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        categoryId: categoryRecord.id,
        sellerId: decoded.userId,
        brand: brand || null,
        model: model || null,
        condition,
        price: parseFloat(price),
        city: location.city || 'Unknown',
        state: location.state || 'Unknown',
        specifications: specifications || {},
        images: images || [],
        status: 'LIVE'
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            city: true,
            state: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    res.json({
      success: true,
      listing
    });

  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({
      error: 'Failed to create listing'
    });
  }
});

// Catch all API routes
app.use('/api/*', (req, res) => {
  res.status(501).json({
    error: 'API endpoint not implemented yet',
    endpoint: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Equipment Marketplace API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔑 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`💬 Messages: http://localhost:${PORT}/api/messages`);
  
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
  } catch (error) {
    console.warn('⚠️  Database connection failed:', error);
  }
});

export default app;
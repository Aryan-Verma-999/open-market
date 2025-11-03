import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { findUserByEmail, getAllListings, getListingById } from './db';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-vercel-app.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Demo endpoints for your marketplace
app.get('/api/listings', (req, res) => {
  const listings = getAllListings();
  res.json({
    listings: listings.map(listing => ({
      ...listing,
      seller: {
        name: 'Demo Seller',
        verified: true
      }
    }))
  });
});

app.get('/api/listings/:id', (req, res) => {
  const listing = getListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  res.json({
    ...listing,
    seller: {
      name: 'Demo Seller',
      verified: true,
      phone: '+91 98765 43210',
      email: 'seller@example.com'
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    },
    token: `demo-jwt-token-${user.id}`
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, firstName, lastName, role } = req.body;
  
  res.json({
    user: {
      id: Date.now().toString(),
      email,
      firstName,
      lastName,
      role: role || 'BUYER'
    },
    token: 'demo-jwt-token-new-user'
  });
});

app.get('/api/messages', (req, res) => {
  res.json({
    conversations: []
  });
});

// Catch all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Export for Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
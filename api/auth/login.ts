import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Login request received:', { method: req.method, body: req.body });
    
    const { email, password } = req.body || {};

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // For demo purposes, use simple authentication
    const demoUsers = [
      { id: '1', email: 'buyer1@example.com', password: 'buyer123', firstName: 'John', lastName: 'Buyer', role: 'BUYER' },
      { id: '2', email: 'seller1@example.com', password: 'seller123', firstName: 'Jane', lastName: 'Seller', role: 'SELLER' },
      { id: '3', email: 'admin@example.com', password: 'admin123', firstName: 'Admin', lastName: 'User', role: 'ADMIN' }
    ];

    console.log('Looking for user with email:', email);
    console.log('Password provided:', password);
    console.log('Available users:', demoUsers.map(u => ({ email: u.email, password: u.password })));
    
    const user = demoUsers.find(u => {
      console.log(`Comparing: ${u.email} === ${email} && ${u.password} === ${password}`);
      return u.email === email && u.password === password;
    });

    if (!user) {
      console.log('User not found or invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', user.email);
    
    // Generate simple token for demo
    const token = `demo-jwt-token-${user.id}-${Date.now()}`;

    const response = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    };

    console.log('Sending response:', response);
    res.status(200).json(response);

  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
}
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const demoListings = [
      {
        id: '1',
        title: 'Industrial Mixer - Model XYZ-2023',
        description: 'High-capacity industrial mixer in excellent condition.',
        price: 250000,
        location: 'Mumbai, Maharashtra',
        condition: 'Excellent',
        category: 'Food Processing',
        images: ['/api/placeholder/400/300'],
        seller: {
          name: 'ABC Equipment Co.',
          verified: true
        },
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'CNC Milling Machine - Haas VF-2',
        description: 'Professional CNC milling machine with warranty.',
        price: 1500000,
        location: 'Delhi, NCR',
        condition: 'Good',
        category: 'Manufacturing',
        images: ['/api/placeholder/400/300'],
        seller: {
          name: 'XYZ Industries',
          verified: true
        },
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Dell PowerEdge Server R740',
        description: 'Enterprise server with dual processors.',
        price: 180000,
        location: 'Bangalore, Karnataka',
        condition: 'Very Good',
        category: 'IT Equipment',
        images: ['/api/placeholder/400/300'],
        seller: {
          name: 'Tech Solutions',
          verified: true
        },
        createdAt: new Date().toISOString()
      }
    ];

    res.status(200).json({
      listings: demoListings,
      total: demoListings.length,
      page: 1,
      limit: 10
    });

  } catch (error) {
    console.error('Listings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
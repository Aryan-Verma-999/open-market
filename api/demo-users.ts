import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const demoUsers = [
    { id: '1', email: 'buyer1@example.com', password: 'buyer123', firstName: 'John', lastName: 'Buyer', role: 'BUYER' },
    { id: '2', email: 'seller1@example.com', password: 'seller123', firstName: 'Jane', lastName: 'Seller', role: 'SELLER' },
    { id: '3', email: 'admin@example.com', password: 'admin123', firstName: 'Admin', lastName: 'User', role: 'ADMIN' }
  ];

  res.status(200).json({
    message: 'Demo users available',
    users: demoUsers.map(u => ({
      email: u.email,
      password: u.password,
      role: u.role,
      name: `${u.firstName} ${u.lastName}`
    })),
    timestamp: new Date().toISOString()
  });
}
// Simple in-memory database for demo
// In production, you would use Vercel Postgres or another database

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  password: string;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  condition: string;
  category: string;
  sellerId: string;
  images: string[];
  createdAt: string;
}

// Demo data
export const users: User[] = [
  {
    id: '1',
    email: 'buyer1@example.com',
    firstName: 'John',
    lastName: 'Buyer',
    role: 'BUYER',
    password: 'buyer123'
  },
  {
    id: '2', 
    email: 'seller1@example.com',
    firstName: 'Jane',
    lastName: 'Seller',
    role: 'SELLER',
    password: 'seller123'
  },
  {
    id: '3',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    password: 'admin123'
  }
];

export const listings: Listing[] = [
  {
    id: '1',
    title: 'Industrial Mixer - Model XYZ-2023',
    description: 'High-capacity industrial mixer in excellent condition. Perfect for food processing operations.',
    price: 250000,
    location: 'Mumbai, Maharashtra',
    condition: 'Excellent',
    category: 'Food Processing',
    sellerId: '2',
    images: ['/api/placeholder/400/300'],
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'CNC Milling Machine - Haas VF-2',
    description: 'Professional CNC milling machine with 1 year warranty remaining.',
    price: 1500000,
    location: 'Delhi, NCR', 
    condition: 'Good',
    category: 'Manufacturing',
    sellerId: '2',
    images: ['/api/placeholder/400/300'],
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Dell PowerEdge Server R740',
    description: 'Enterprise server with dual processors and 64GB RAM.',
    price: 180000,
    location: 'Bangalore, Karnataka',
    condition: 'Very Good',
    category: 'IT Equipment',
    sellerId: '2',
    images: ['/api/placeholder/400/300'],
    createdAt: new Date().toISOString()
  }
];

// Helper functions
export const findUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

export const findUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

export const getAllListings = (): Listing[] => {
  return listings;
};

export const getListingById = (id: string): Listing | undefined => {
  return listings.find(listing => listing.id === id);
};
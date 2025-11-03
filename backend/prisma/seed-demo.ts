import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...');

  // Create demo users
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer1@example.com' },
    update: {},
    create: {
      email: 'buyer1@example.com',
      firstName: 'John',
      lastName: 'Buyer',
      role: 'BUYER',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: buyer123
      phoneVerified: true,
      kycStatus: 'APPROVED'
    }
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller1@example.com' },
    update: {},
    create: {
      email: 'seller1@example.com',
      firstName: 'Jane',
      lastName: 'Seller',
      role: 'SELLER',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: seller123
      phoneVerified: true,
      kycStatus: 'APPROVED'
    }
  });

  // Create demo categories
  const foodProcessing = await prisma.category.upsert({
    where: { name: 'Food Processing' },
    update: {},
    create: {
      name: 'Food Processing',
      description: 'Equipment for food processing and manufacturing'
    }
  });

  const manufacturing = await prisma.category.upsert({
    where: { name: 'Manufacturing' },
    update: {},
    create: {
      name: 'Manufacturing',
      description: 'Industrial manufacturing equipment'
    }
  });

  // Create demo listings
  const listing1 = await prisma.listing.upsert({
    where: { id: 'demo-listing-1' },
    update: {},
    create: {
      id: 'demo-listing-1',
      title: 'Industrial Mixer - Model XYZ-2023',
      description: 'High-capacity industrial mixer in excellent condition. Perfect for food processing operations. Recently serviced and comes with all original documentation.',
      price: 250000,
      location: 'Mumbai, Maharashtra',
      condition: 'EXCELLENT',
      categoryId: foodProcessing.id,
      sellerId: seller.id,
      status: 'LIVE',
      images: ['/api/placeholder/400/300'],
      specifications: {
        brand: 'XYZ Industries',
        model: 'XYZ-2023',
        year: 2021,
        capacity: '500L',
        power: '15kW'
      }
    }
  });

  const listing2 = await prisma.listing.upsert({
    where: { id: 'demo-listing-2' },
    update: {},
    create: {
      id: 'demo-listing-2',
      title: 'CNC Milling Machine - Haas VF-2',
      description: 'Professional CNC milling machine with 1 year warranty remaining. Excellent for precision manufacturing.',
      price: 1500000,
      location: 'Delhi, NCR',
      condition: 'GOOD',
      categoryId: manufacturing.id,
      sellerId: seller.id,
      status: 'LIVE',
      images: ['/api/placeholder/400/300'],
      specifications: {
        brand: 'Haas',
        model: 'VF-2',
        year: 2020,
        workArea: '762 x 406 x 508 mm',
        spindle: '7500 RPM'
      }
    }
  });

  console.log('✅ Demo data seeded successfully!');
  console.log(`👤 Buyer: ${buyer.email}`);
  console.log(`👤 Seller: ${seller.email}`);
  console.log(`📦 Listings: ${listing1.title}, ${listing2.title}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create categories
  const categories = [
    {
      name: 'Food & Beverage',
      slug: 'food-beverage',
      description: 'Commercial kitchen equipment, food processing machinery, and beverage equipment',
      children: [
        { name: 'Commercial Ovens', slug: 'commercial-ovens', description: 'Industrial and commercial ovens' },
        { name: 'Mixers & Blenders', slug: 'mixers-blenders', description: 'Food mixers and blending equipment' },
        { name: 'Refrigeration', slug: 'refrigeration', description: 'Commercial refrigerators and freezers' },
        { name: 'Food Processing', slug: 'food-processing', description: 'Food processing and packaging equipment' },
      ]
    },
    {
      name: 'Manufacturing',
      slug: 'manufacturing',
      description: 'Industrial manufacturing equipment and machinery',
      children: [
        { name: 'CNC Machines', slug: 'cnc-machines', description: 'Computer numerical control machines' },
        { name: 'Lathes', slug: 'lathes', description: 'Metal and wood working lathes' },
        { name: 'Welding Equipment', slug: 'welding-equipment', description: 'Welding machines and accessories' },
        { name: 'Packaging Equipment', slug: 'packaging-equipment', description: 'Industrial packaging machinery' },
      ]
    },
    {
      name: 'Office Equipment',
      slug: 'office-equipment',
      description: 'Office furniture, computers, and business equipment',
      children: [
        { name: 'Computers & IT', slug: 'computers-it', description: 'Computers, servers, and IT equipment' },
        { name: 'Office Furniture', slug: 'office-furniture', description: 'Desks, chairs, and office furniture' },
        { name: 'Printers & Scanners', slug: 'printers-scanners', description: 'Printing and scanning equipment' },
        { name: 'Telecom Equipment', slug: 'telecom-equipment', description: 'Phone systems and communication equipment' },
      ]
    },
    {
      name: 'Technology',
      slug: 'technology',
      description: 'Electronic equipment and technology devices',
      children: [
        { name: 'Servers & Networking', slug: 'servers-networking', description: 'Server hardware and networking equipment' },
        { name: 'Audio/Visual', slug: 'audio-visual', description: 'AV equipment and sound systems' },
        { name: 'Testing Equipment', slug: 'testing-equipment', description: 'Electronic testing and measurement tools' },
        { name: 'Laboratory Equipment', slug: 'laboratory-equipment', description: 'Scientific and lab equipment' },
      ]
    },
    {
      name: 'Construction',
      slug: 'construction',
      description: 'Construction equipment and tools',
      children: [
        { name: 'Heavy Machinery', slug: 'heavy-machinery', description: 'Excavators, bulldozers, and heavy equipment' },
        { name: 'Power Tools', slug: 'power-tools', description: 'Electric and pneumatic power tools' },
        { name: 'Safety Equipment', slug: 'safety-equipment', description: 'Construction safety gear and equipment' },
        { name: 'Material Handling', slug: 'material-handling', description: 'Forklifts, cranes, and handling equipment' },
      ]
    }
  ];

  // Create parent categories and their children
  for (const categoryData of categories) {
    const parentCategory = await prisma.category.create({
      data: {
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        sortOrder: categories.indexOf(categoryData),
      },
    });

    // Create child categories
    for (const childData of categoryData.children) {
      await prisma.category.create({
        data: {
          name: childData.name,
          slug: childData.slug,
          description: childData.description,
          parentId: parentCategory.id,
          sortOrder: categoryData.children.indexOf(childData),
        },
      });
    }
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@equipmentmarketplace.com',
      phone: '+919999999999',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
      phoneVerified: true,
      emailVerified: true,
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      trustScore: 5.0,
    },
  });

  // Create sample seller users
  const sellerPassword = await bcrypt.hash('seller123', 12);
  const sellers = [
    {
      email: 'seller1@example.com',
      phone: '+919876543210',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      company: 'ABC Equipment Co.',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    {
      email: 'seller2@example.com',
      phone: '+919876543211',
      firstName: 'Priya',
      lastName: 'Sharma',
      company: 'XYZ Industries',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
    {
      email: 'seller3@example.com',
      phone: '+919876543212',
      firstName: 'Amit',
      lastName: 'Patel',
      company: 'Tech Solutions Ltd.',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
    },
  ];

  const createdSellers = [];
  for (const sellerData of sellers) {
    const seller = await prisma.user.create({
      data: {
        ...sellerData,
        passwordHash: sellerPassword,
        role: 'SELLER',
        kycStatus: 'VERIFIED',
        phoneVerified: true,
        emailVerified: true,
        trustScore: 4.5 + Math.random() * 0.5, // Random score between 4.5-5.0
      },
    });
    createdSellers.push(seller);
  }

  // Create sample buyer users
  const buyerPassword = await bcrypt.hash('buyer123', 12);
  const buyers = [
    {
      email: 'buyer1@example.com',
      phone: '+919876543220',
      firstName: 'Suresh',
      lastName: 'Gupta',
      company: 'Food Processing Co.',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
    },
    {
      email: 'buyer2@example.com',
      phone: '+919876543221',
      firstName: 'Meera',
      lastName: 'Singh',
      company: 'Manufacturing Hub',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    },
  ];

  const createdBuyers = [];
  for (const buyerData of buyers) {
    const buyer = await prisma.user.create({
      data: {
        ...buyerData,
        passwordHash: buyerPassword,
        role: 'BUYER',
        kycStatus: 'VERIFIED',
        phoneVerified: true,
        emailVerified: true,
        trustScore: 4.0 + Math.random() * 1.0, // Random score between 4.0-5.0
      },
    });
    createdBuyers.push(buyer);
  }

  // Get categories for sample listings
  const foodCategory = await prisma.category.findFirst({
    where: { slug: 'mixers-blenders' }
  });
  const manufacturingCategory = await prisma.category.findFirst({
    where: { slug: 'cnc-machines' }
  });
  const officeCategory = await prisma.category.findFirst({
    where: { slug: 'computers-it' }
  });

  // Create sample listings
  const sampleListings = [
    {
      sellerId: createdSellers[0].id,
      categoryId: foodCategory?.id || '',
      title: 'Industrial Mixer - Model XYZ-2023',
      brand: 'XYZ Industries',
      model: 'XYZ-2023',
      year: 2020,
      condition: 'GOOD' as const,
      price: 250000,
      description: 'Well-maintained industrial mixer in excellent working condition. Includes all original manuals and documentation. Perfect for food processing applications.',
      specifications: {
        capacity: '50 liters',
        power: '5 HP',
        voltage: '415V',
        weight: '200 kg',
        dimensions: '120x80x150 cm'
      },
      images: [
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800',
      ],
      city: 'Mumbai',
      state: 'Maharashtra',
      status: 'LIVE' as const,
      views: 45,
      saves: 8,
    },
    {
      sellerId: createdSellers[1].id,
      categoryId: manufacturingCategory?.id || '',
      title: 'CNC Milling Machine - Haas VF-2',
      brand: 'Haas',
      model: 'VF-2',
      year: 2018,
      condition: 'LIKE_NEW' as const,
      price: 1500000,
      description: 'Barely used CNC milling machine with low hours. Excellent for precision manufacturing. Includes tooling and setup.',
      specifications: {
        travels: 'X: 30", Y: 16", Z: 20"',
        spindle: '8100 RPM',
        toolChanger: '20 station',
        power: '20 HP'
      },
      images: [
        'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800',
      ],
      city: 'Delhi',
      state: 'Delhi',
      status: 'LIVE' as const,
      views: 78,
      saves: 15,
    },
    {
      sellerId: createdSellers[2].id,
      categoryId: officeCategory?.id || '',
      title: 'Dell PowerEdge Server R740',
      brand: 'Dell',
      model: 'PowerEdge R740',
      year: 2021,
      condition: 'LIKE_NEW' as const,
      price: 180000,
      description: 'High-performance server with dual processors and 64GB RAM. Perfect for small to medium businesses.',
      specifications: {
        processor: 'Dual Intel Xeon Silver 4214',
        memory: '64GB DDR4',
        storage: '2x 1TB SSD',
        network: 'Dual 10GbE'
      },
      images: [
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
      ],
      city: 'Bangalore',
      state: 'Karnataka',
      status: 'LIVE' as const,
      views: 32,
      saves: 6,
    },
  ];

  const createdListings = [];
  for (const listingData of sampleListings) {
    const listing = await prisma.listing.create({
      data: listingData,
    });
    createdListings.push(listing);
  }

  // Create demo conversations and messages
  const conversations = [
    // Buyer1 (Suresh) interested in Industrial Mixer from Seller1 (Rajesh)
    {
      listingId: createdListings[0].id,
      senderId: createdBuyers[0].id,
      receiverId: createdSellers[0].id,
      messages: [
        {
          senderId: createdBuyers[0].id,
          content: "Hi! I'm interested in your industrial mixer. Is it still available?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
        {
          senderId: createdSellers[0].id,
          content: "Yes, it's still available! It's in excellent working condition. Would you like to schedule an inspection?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        },
        {
          senderId: createdBuyers[0].id,
          content: "That sounds great! What's your best price? The listing shows ₹2,50,000.",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          senderId: createdBuyers[0].id,
          content: "I can offer ₹2,25,000 for it. Let me know if that works.",
          messageType: 'QUOTE' as const,
          quoteAmount: 225000,
          quoteStatus: 'PENDING' as const,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 minutes later
        },
        {
          senderId: createdSellers[0].id,
          content: "Thanks for the offer. I can do ₹2,35,000 as my final price. The machine is really well-maintained.",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          senderId: createdBuyers[0].id,
          content: "That works for me! When can I come for inspection?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        }
      ]
    },
    // Buyer2 (Meera) interested in CNC Machine from Seller2 (Priya)
    {
      listingId: createdListings[1].id,
      senderId: createdBuyers[1].id,
      receiverId: createdSellers[1].id,
      messages: [
        {
          senderId: createdBuyers[1].id,
          content: "Hello! I'm looking for a CNC machine for our manufacturing unit. Can you provide more details about the Haas VF-2?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          senderId: createdSellers[1].id,
          content: "Hi Meera! This machine has only 800 hours on it. It comes with all original tooling and documentation. Very reliable for precision work.",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        },
        {
          senderId: createdBuyers[1].id,
          content: "That's impressive! What's the reason for selling? And is there any warranty remaining?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        },
        {
          senderId: createdSellers[1].id,
          content: "We're upgrading to a larger machine. There's still 1 year warranty left from Haas. Machine is in Delhi, you can inspect anytime.",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        },
        {
          senderId: createdBuyers[1].id,
          content: "Excellent! I'm very interested. Can we discuss the price?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        }
      ]
    },
    // Admin monitoring conversation (Seller3 and a potential buyer about server)
    {
      listingId: createdListings[2].id,
      senderId: createdBuyers[0].id, // Suresh also interested in server
      receiverId: createdSellers[2].id,
      messages: [
        {
          senderId: createdBuyers[0].id,
          content: "Hi Amit! I need a server for our food processing business. Is this Dell server suitable for ERP applications?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          senderId: createdSellers[2].id,
          content: "Absolutely! This server can easily handle ERP workloads. It has dual processors and 64GB RAM. Very reliable for business applications.",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        },
        {
          senderId: createdBuyers[0].id,
          content: "Great! Can you include installation and setup support?",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          senderId: createdSellers[2].id,
          content: "Yes, I can provide basic setup support. The price includes delivery to Bangalore area.",
          messageType: 'TEXT' as const,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        }
      ]
    }
  ];

  // Create conversations and messages
  for (const convData of conversations) {
    const conversationId = `${convData.listingId}-${[convData.senderId, convData.receiverId].sort().join('-')}`;
    
    for (const msgData of convData.messages) {
      await prisma.message.create({
        data: {
          conversationId,
          senderId: msgData.senderId,
          receiverId: msgData.senderId === convData.senderId ? convData.receiverId : convData.senderId,
          listingId: convData.listingId,
          content: msgData.content,
          messageType: msgData.messageType,
          quoteAmount: msgData.quoteAmount,
          quoteStatus: msgData.quoteStatus,
          createdAt: msgData.createdAt,
        },
      });
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log(`📊 Created:`);
  console.log(`   - ${categories.length} parent categories`);
  console.log(`   - ${categories.reduce((sum, cat) => sum + cat.children.length, 0)} child categories`);
  console.log(`   - 1 admin user`);
  console.log(`   - ${sellers.length} seller users`);
  console.log(`   - ${buyers.length} buyer users`);
  console.log(`   - ${sampleListings.length} sample listings`);
  console.log(`   - ${conversations.length} demo conversations with ${conversations.reduce((sum, conv) => sum + conv.messages.length, 0)} messages`);
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('   Admin: admin@equipmentmarketplace.com / admin123');
  console.log('   Seller: seller1@example.com / seller123');
  console.log('   Buyer: buyer1@example.com / buyer123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { execSync } from 'child_process';
import { prisma } from '../src/lib/database';

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Run Prisma migrations
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
    
    console.log('✅ Database migrations completed successfully');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection verified');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
// test-profile.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProfileField() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        profile: true // This is the field that's causing the error
      },
      take: 1 // Limit to 1 record for simplicity
    });
    console.log('✅ SUCCESS! The `profile` field is recognized by Prisma.');
    console.log('Result:', JSON.stringify(users, null, 2));
  } catch (error: any) { // Use ': any' to bypass TypeScript's strict typing
    console.error('❌ FAILED: The `profile` field is not recognized.');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileField();
// File: src/app/api/admins/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET function to fetch all ADMIN users
export async function GET() {
  // 🛡️ SECURITY CHECK: Ensure the user is a SUPER_ADMIN
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
  }

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      include: {
        profile: true,
      },
    });
    return NextResponse.json(admins);
  } catch (error) {
    console.error('Failed to retrieve admins:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve admins' },
      { status: 500 }
    );
  }
}

// POST function to create a new ADMIN user
export async function POST(request: Request) {
  // 🛡️ SECURITY CHECK: Ensure the user is a SUPER_ADMIN
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password, firstName, lastName, position, startDate } = body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        // UPDATED: More helpful error message
        { error: 'User with this email already exists. Use the "Promote Employee" tab to grant admin rights.' },
        { status: 400 }
      );
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new User and their EmployeeProfile in one transaction
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        profile: {
          create: {
            firstName,
            lastName,
            position,
            startDate: new Date(startDate),
          },
        },
      },
      include: {
        profile: true,
      },
    });
    
    // Don't send the password back in the response
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error('Failed to create admin:', error);
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}
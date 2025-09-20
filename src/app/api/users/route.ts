// File: src/app/api/users/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// GET function to fetch users, with optional filtering by role
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') as Role | null;

    // Build the query object
    const whereClause = role ? { role: role } : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      // Include the employee's profile information in the result
      include: {
        profile: true,
      },
      orderBy: {
        profile: {
          firstName: 'asc',
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to retrieve users:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}
// File: src/app/api/admins/[id]/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// PATCH function to update a user's role to ADMIN
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 🛡️ SECURITY CHECK: Ensure the user is a SUPER_ADMIN
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
  }

  try {
    const userIdToPromote = params.id;

    // Find the user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: userIdToPromote },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the user's role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: userIdToPromote },
      data: {
        role: 'ADMIN',
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
    
  } catch (error) {
    console.error('Failed to promote user:', error);
    return NextResponse.json(
      { error: 'Failed to promote user' },
      { status: 500 }
    );
  }
}
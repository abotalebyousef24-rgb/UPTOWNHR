// File: src/app/api/admins/[id]/demote/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// PATCH function to demote an ADMIN user to EMPLOYEE
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
    const userIdToDemote = params.id;

    // Update the user's role to EMPLOYEE
    const updatedUser = await prisma.user.update({
      where: { id: userIdToDemote },
      data: {
        role: 'EMPLOYEE',
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
    
  } catch (error) {
    console.error('Failed to demote user:', error);
    return NextResponse.json(
      { error: 'Failed to demote user' },
      { status: 500 }
    );
  }
}
// File: src/app/api/manager/pending-cancellations/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; // Using your project's standard path
import { db } from '@/lib/db'; // Using your project's standard prisma client

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const userProfile = await db.employeeProfile.findUnique({
        where: { userId: session.user.id }
    });
    if (!userProfile) {
        return NextResponse.json([]);
    }

    const pendingCancellations = await db.leaveRequest.findMany({
        where: {
            // FIXED: Look for the correct status for managers to approve
            status: 'CANCELLATION_PENDING_MANAGER',
            employee: {
                managerId: userProfile.id
            },
        },
        include: {
            employee: { select: { firstName: true, lastName: true, } },
            leaveType: { select: { name: true, } }
        },
        orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(pendingCancellations);
  } catch (error) {
    console.error("[MANAGER_PENDING_CANCELLATIONS_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
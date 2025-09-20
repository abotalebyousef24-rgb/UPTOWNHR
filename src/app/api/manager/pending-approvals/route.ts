// File: src/app/api/manager/pending-approvals/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const userProfile = await db.employeeProfile.findUnique({
        where: { userId: session.user.id }
    });
    if (!userProfile) {
        return NextResponse.json([]);
    }

    const pendingRequests = await db.leaveRequest.findMany({
        where: {
            status: 'PENDING_MANAGER',
            employee: {
                managerId: userProfile.id
            },
        },
        include: {
            employee: { select: { firstName: true, lastName: true } },
            leaveType: { select: { name: true } }
        },
        orderBy: { createdAt: 'asc' }
    });

    // For each pending request, check for overlaps
    const requestsWithOverlapInfo = await Promise.all(
      pendingRequests.map(async (request) => {
        const overlappingRequest = await db.leaveRequest.findFirst({
          where: {
            // Check for requests from other employees on the same team
            employee: {
              managerId: userProfile.id,
              id: { not: request.employeeId } // Exclude the current employee
            },
            status: 'APPROVED_BY_ADMIN',
            // Check for date overlap
            startDate: { lte: request.endDate },
            endDate: { gte: request.startDate },
          },
        });
        return { ...request, hasOverlap: !!overlappingRequest };
      })
    );

    return NextResponse.json(requestsWithOverlapInfo);

  } catch (error) {
    console.error("[MANAGER_PENDING_APPROVALS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
// File: src/app/api/leave-requests/[requestId]/request-cancellation/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { getBypassDetails } from '@/lib/manager-actions';

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { requestId } = params;

    const userProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!userProfile) {
      return NextResponse.json({ message: "Employee profile not found" }, { status: 404 });
    }

    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!leaveRequest) {
      return NextResponse.json({ message: "Leave request not found" }, { status: 404 });
    }
    if (leaveRequest.employeeId !== userProfile.id) {
      return NextResponse.json({ message: "Forbidden: You cannot modify a request that is not yours." }, { status: 403 });
    }
    if (leaveRequest.status !== 'APPROVED_BY_ADMIN') {
      return NextResponse.json({ message: `This action is only for fully approved requests. Status is currently '${leaveRequest.status}'` }, { status: 400 });
    }
    
    const { bypass, reason } = await getBypassDetails(leaveRequest.employeeId);
    
    const newStatus = bypass 
      ? 'CANCELLATION_PENDING_ADMIN' 
      : 'CANCELLATION_PENDING_MANAGER';

    // Use a transaction to update the request and create an audit record
    const updatedRequest = await db.$transaction(async (prisma) => {
      const updated = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          statusBeforeCancellation: leaveRequest.status,
          cancellationReason: "Cancellation requested by employee.",
        },
      });

      await prisma.leaveRequestAudit.create({
        data: {
          leaveRequestId: requestId,
          changedById: session.user.id,
          previousStatus: leaveRequest.status,
          newStatus: newStatus,
          reason: "Cancellation requested by employee.",
        },
      });

      return updated;
    });

    return NextResponse.json(updatedRequest);

  } catch (error) {
    console.error("[LEAVE_REQUEST_CANCELLATION_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
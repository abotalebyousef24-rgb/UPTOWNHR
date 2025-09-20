// File: src/app/api/leave-requests/[requestId]/cancel/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { requestId } = params;

    const userProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!userProfile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }

    const leaveRequestToCancel = await db.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!leaveRequestToCancel) {
      return new NextResponse("Leave request not found", { status: 404 });
    }

    // Ensure the user owns this request
    if (leaveRequestToCancel.employeeId !== userProfile.id) {
      return new NextResponse("Forbidden: You cannot cancel a request that is not yours.", { status: 403 });
    }

    // Ensure the request is in a cancellable state
    const cancellableStatuses = ['PENDING_MANAGER'];
    if (!cancellableStatuses.includes(leaveRequestToCancel.status)) {
      return new NextResponse(`Request cannot be cancelled. Status is already '${leaveRequestToCancel.status}'`, { status: 400 });
    }
    
    // Update the request to CANCELLED
    const updatedRequest = await db.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledById: session.user.id,
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled by employee.',
      },
    });

    return NextResponse.json(updatedRequest);

  } catch (error) {
    console.error("[LEAVE_REQUEST_CANCEL_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
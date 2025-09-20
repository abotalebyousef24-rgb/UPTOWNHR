// File: src/app/api/manager/requests/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

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
        return new NextResponse("User profile not found", { status: 404 });
    }

    // Find all leave requests submitted by employees who report to this user
    const pendingRequests = await db.leaveRequest.findMany({
        where: {
            employee: {
                managerId: userProfile.id
            },
            // FIXED: Look for the correct status
            status: 'PENDING_MANAGER'
        },
        include: {
            employee: {
                select: {
                    firstName: true,
                    lastName: true,
                }
            },
            leaveType: {
                select: {
                    name: true,
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    return NextResponse.json(pendingRequests);

  } catch (error) {
    console.error("[MANAGER_REQUESTS_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
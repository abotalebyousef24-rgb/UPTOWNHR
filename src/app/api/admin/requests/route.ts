import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const requests = await db.leaveRequest.findMany({
      where: {
        status: {
          in: ['APPROVED_BY_MANAGER', 'PENDING_ADMIN'],
        },
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        leaveType: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[ADMIN_REQUESTS_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
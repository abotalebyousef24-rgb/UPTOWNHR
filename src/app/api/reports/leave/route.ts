import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * Role/manager scoping rules:
 * - SUPER_ADMIN, ADMIN: can view all employees (supports employeeId=all)
 * - Manager: can view their own records and their direct reports
 *   * If employeeId is provided and is not the manager or their direct report -> 403
 *   * If employeeId = all -> automatically scoped to [manager + direct reports]
 * - Employee: can view only their own records
 *   * If employeeId is provided and not their own -> 403
 *   * If employeeId = all -> automatically scoped to current user's employeeId
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const role = session.user.role;

  try {
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const statusesParam = searchParams.get('statuses'); // comma-separated list of LeaveStatus values

    // Resolve current user's employee profile
    const me = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!me) {
      return new NextResponse("User profile not found", { status: 400 });
    }

    // Determine accessible employee IDs for this user
    let accessibleEmployeeIds: string[] | null = null;

    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      // HR can access all; leave accessibleEmployeeIds as null meaning unscoped
      accessibleEmployeeIds = null;
    } else {
      // Non-HR: determine manager status and scoping
      // Check if current user manages others
      const directReports = await db.employeeProfile.findMany({
        where: { managerId: me.id },
        select: { id: true },
      });
      const directReportIds = directReports.map(r => r.id);

      if (directReportIds.length > 0) {
        // Manager: can see self + direct reports
        accessibleEmployeeIds = [me.id, ...directReportIds];
      } else {
        // Regular employee: only self
        accessibleEmployeeIds = [me.id];
      }
    }

    // Build where clause with scoping
    const whereClause: any = {};

    // Apply employee scope
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      // HR
      if (employeeIdParam && employeeIdParam !== 'all') {
        whereClause.employeeId = employeeIdParam;
      }
      // else unscoped (all)
    } else {
      // Non-HR
      if (!accessibleEmployeeIds || accessibleEmployeeIds.length === 0) {
        return new NextResponse("No accessible employees", { status: 403 });
      }

      if (!employeeIdParam || employeeIdParam === 'all') {
        whereClause.employeeId = { in: accessibleEmployeeIds };
      } else {
        // Specific employee requested; must be within accessible list
        if (!accessibleEmployeeIds.includes(employeeIdParam)) {
          return new NextResponse("Forbidden", { status: 403 });
        }
        whereClause.employeeId = employeeIdParam;
      }
    }

    // Apply date filter
    if (startDate && endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      whereClause.createdAt = {
        gte: new Date(startDate),
        lt: endOfDay,
      };
    }

    // Apply status filter if provided. Expect exact enum values from client:
    // APPROVED_BY_ADMIN, DENIED, PENDING_MANAGER, PENDING_ADMIN, CANCELLED,
    // CANCELLATION_PENDING_MANAGER, CANCELLATION_PENDING_ADMIN, APPROVED_BY_MANAGER
    if (statusesParam) {
      const rawStatuses = statusesParam.split(',').map(s => s.trim()).filter(Boolean);
      if (rawStatuses.length > 0) {
        whereClause.status = { in: rawStatuses as any };
      }
    }

    const leaveRequests = await db.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        leaveType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(leaveRequests);

  } catch (error) {
    console.error("[REPORTS_LEAVE_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
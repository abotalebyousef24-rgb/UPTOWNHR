// File: src/app/api/leave-requests/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { LeaveStatus } from "@prisma/client";

// Fetches the leave request history for the logged-in user
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    const employeeProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!employeeProfile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }

    const whereClause: any = {
      employeeId: employeeProfile.id,
    };

    if (startDate && endDate) {
      const parsedStart = new Date(startDate);
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ message: "Invalid date range" }, { status: 400 });
      }

      // include the full end day
      const endOfDay = new Date(parsedEnd);
      endOfDay.setDate(endOfDay.getDate() + 1);

      whereClause.createdAt = {
        gte: parsedStart,
        lt: endOfDay,
      };
    }

    const leaveRequests = await db.leaveRequest.findMany({
      where: whereClause,
      include: {
        leaveType: true,
        approvedBy: { select: { email: true } },
        deniedBy: { select: { email: true } },
        cancelledBy: { select: { email: true } },
        auditTrail: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: { select: { email: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(leaveRequests, { status: 200 });
  } catch (error: any) {
    console.error("[LEAVE_REQUESTS_GET_ERROR]", error);
    const devInfo =
      process.env.NODE_ENV !== "production"
        ? { error: String(error?.message || error) }
        : undefined;
    return NextResponse.json({ message: "Internal Server Error", ...devInfo }, { status: 500 });
  }
}

// Creates a new leave request and its first audit trail record
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leaveTypeId, startDate, endDate } = body ?? {};

    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ message: "Invalid start or end date" }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json({ message: "End date must be on or after start date" }, { status: 400 });
    }

    const employeeProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
      include: { workSchedule: true },
    });

    if (!employeeProfile) {
      return NextResponse.json({ message: "Employee profile not found" }, { status: 404 });
    }

    let workSchedule = employeeProfile.workSchedule;
    if (!workSchedule) {
      workSchedule = await db.workSchedule.findFirst({ where: { isDefault: true } });
    }
    if (!workSchedule) {
      return NextResponse.json(
        { message: "No default work schedule found. Please configure one." },
        { status: 500 }
      );
    }

    // Holidays within range: overlap with requested range AND relevant type
    const rangedHolidays = await db.holiday.findMany({
      where: {
        AND: [
          { startDate: { lte: end } }, // holiday starts before or on end of request
          { endDate: { gte: start } }, // holiday ends after or on start of request
          {
            OR: [
              { type: "COMPANY" },
              { type: "NATIONAL" },
              { type: "TEAM" },
              { AND: [{ type: "EMPLOYEE" }, { employeeId: employeeProfile.id }] },
            ],
          },
        ],
      },
    });

    // Expand holiday ranges to individual date strings for quick lookup
    const holidayDates = new Set<string>();
    for (const h of rangedHolidays) {
      const hStart = new Date(h.startDate);
      const hEnd = new Date(h.endDate);
      const d = new Date(hStart);
      while (d <= hEnd) {
        holidayDates.add(d.toISOString().split("T")[0]);
        d.setDate(d.getDate() + 1);
      }
    }

    // Weekly recurring employee-specific holidays (weekday-based offs)
    const weeklyEmployeeHolidays = await db.holiday.findMany({
      where: { type: "EMPLOYEE", employeeId: employeeProfile.id, repeatWeekly: true },
    });
    const weeklyHolidayWeekdays = new Set<number>(
      weeklyEmployeeHolidays.map((h) => new Date(h.startDate).getDay())
    );

    let workingDaysRequested = 0;
    let currentDate = new Date(start);

    const weekendMap = [
      !workSchedule.isSunday,
      !workSchedule.isMonday,
      !workSchedule.isTuesday,
      !workSchedule.isWednesday,
      !workSchedule.isThursday,
      !workSchedule.isFriday,
      !workSchedule.isSaturday,
    ];

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split("T")[0];
      const isWorkingDay = !weekendMap[dayOfWeek];
      const isHoliday = holidayDates.has(dateString) || weeklyHolidayWeekdays.has(dayOfWeek);
      if (isWorkingDay && !isHoliday) {
        workingDaysRequested++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (workingDaysRequested <= 0) {
      return NextResponse.json(
        { message: "Your request does not contain any working days." },
        { status: 400 }
      );
    }

    const balance = await db.leaveBalance.findFirst({
      where: {
        employeeId: employeeProfile.id,
        leaveTypeId: leaveTypeId,
        year: start.getFullYear(),
      },
    });

    if (!balance || balance.remaining < workingDaysRequested) {
      return NextResponse.json(
        {
          message: `Insufficient leave balance. Remaining: ${balance?.remaining || 0}, Requested Working Days: ${workingDaysRequested}`,
        },
        { status: 400 }
      );
    }

    let status: LeaveStatus = "PENDING_MANAGER";
    let skipReason: string | null = null;

    if (!employeeProfile.managerId) {
      status = "PENDING_ADMIN";
      skipReason = "No manager assigned.";
    } else {
      const managerOnLeave = await db.leaveRequest.findFirst({
        where: {
          employeeId: employeeProfile.managerId,
          status: { in: ["APPROVED_BY_MANAGER", "APPROVED_BY_ADMIN"] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      if (managerOnLeave) {
        status = "PENDING_ADMIN";
        skipReason = "Manager is on leave during the requested period.";
      }
    }

    const newLeaveRequest = await db.$transaction(async (prisma) => {
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          employeeId: employeeProfile.id,
          leaveTypeId: leaveTypeId,
          startDate: start,
          endDate: end,
          status: status,
          skipReason: skipReason,
        },
      });

      await prisma.leaveRequestAudit.create({
        data: {
          leaveRequestId: leaveRequest.id,
          changedById: session.user.id,
          previousStatus: leaveRequest.status,
          newStatus: leaveRequest.status,
          reason: "Request submitted by employee.",
        },
      });

      return leaveRequest;
    });

    return NextResponse.json(newLeaveRequest, { status: 201 });
  } catch (error: any) {
    console.error("[LEAVE_REQUEST_POST_ERROR]", error);
    const devInfo =
      process.env.NODE_ENV !== "production"
        ? { error: String(error?.message || error) }
        : undefined;
    return NextResponse.json({ message: "Internal Server Error", ...devInfo }, { status: 500 });
  }
}
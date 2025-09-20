// File: src/app/api/leave-requests/[requestId]/cancellation-approval/route.ts

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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, reason } = await req.json();
    const { requestId } = params;

    const approverProfile = await db.employeeProfile.findUnique({ where: { userId: session.user.id } });
    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: { include: { workSchedule: true } } },
    });

    if (!leaveRequest || !approverProfile) {
      return NextResponse.json({ message: "Request or approver profile not found" }, { status: 404 });
    }

    const isManager = leaveRequest.employee.managerId === approverProfile.id;
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const originalStatus = leaveRequest.status;

    if (action === 'REJECT') {
      if (!isManager && !isAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      
      const newStatus = leaveRequest.statusBeforeCancellation || 'APPROVED_BY_ADMIN';
      await db.$transaction([
        db.leaveRequest.update({
          where: { id: requestId },
          data: {
            status: newStatus,
            cancellationReason: `Cancellation rejected by ${session.user.role?.toLowerCase()}: ${reason}`,
          },
        }),
        db.leaveRequestAudit.create({
          data: {
            leaveRequestId: requestId,
            changedById: session.user.id,
            previousStatus: originalStatus,
            newStatus: newStatus,
            reason: `Cancellation rejected: ${reason}`,
          }
        })
      ]);

    } else if (action === 'APPROVE') {
      if (leaveRequest.status === 'CANCELLATION_PENDING_MANAGER' && isManager) {
        await db.$transaction([
          db.leaveRequest.update({ where: { id: requestId }, data: { status: 'CANCELLATION_PENDING_ADMIN' } }),
          db.leaveRequestAudit.create({
            data: {
              leaveRequestId: requestId,
              changedById: session.user.id,
              previousStatus: originalStatus,
              newStatus: 'CANCELLATION_PENDING_ADMIN',
              reason: 'Cancellation approved by manager.',
            }
          })
        ]);
      } else if (leaveRequest.status === 'CANCELLATION_PENDING_ADMIN' && isAdmin) {
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        let workSchedule = leaveRequest.employee.workSchedule || await db.workSchedule.findFirst({ where: { isDefault: true } });
        if (!workSchedule) throw new Error("No default work schedule found.");

        // Gather holidays that overlap the range and expand to dates
        const rangedHolidays = await db.holiday.findMany({
          where: {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } },
            ],
          },
        });
        const holidayDates = new Set<string>();
        for (const h of rangedHolidays) {
          const hStart = new Date(h.startDate);
          const hEnd = new Date(h.endDate);
          const d = new Date(hStart);
          while (d <= hEnd) {
            holidayDates.add(d.toISOString().split('T')[0]);
            d.setDate(d.getDate() + 1);
          }
        }

        let workingDaysToRestore = 0;
        let currentDate = new Date(start);
        const weekendMap = [!workSchedule.isSunday, !workSchedule.isMonday, !workSchedule.isTuesday, !workSchedule.isWednesday, !workSchedule.isThursday, !workSchedule.isFriday, !workSchedule.isSaturday];
        while (currentDate <= end) {
          const dayOfWeek = currentDate.getDay();
          const dateString = currentDate.toISOString().split('T')[0];
          if (!weekendMap[dayOfWeek] && !holidayDates.has(dateString)) {
            workingDaysToRestore++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        const balance = await db.leaveBalance.findFirst({
          where: { employeeId: leaveRequest.employeeId, leaveTypeId: leaveRequest.leaveTypeId, year: start.getFullYear() }
        });
        if (!balance) throw new Error("Could not find balance to restore days to.");

        await db.$transaction([
          db.leaveRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED', cancelledById: session.user.id, cancelledAt: new Date() }
          }),
          db.leaveBalance.update({
            where: { id: balance.id },
            data: { remaining: { increment: workingDaysToRestore } }
          }),
          db.leaveRequestAudit.create({
            data: {
              leaveRequestId: requestId,
              changedById: session.user.id,
              previousStatus: originalStatus,
              newStatus: 'CANCELLED',
              reason: 'Cancellation approved by admin. Balance restored.',
            }
          })
        ]);
      } else {
        return NextResponse.json({ message: "Forbidden or invalid action for current status" }, { status: 403 });
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CANCELLATION_APPROVAL_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
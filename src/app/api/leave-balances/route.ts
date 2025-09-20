import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";

// This function gets a list of all assigned balances for the admin page
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const balances = await db.leaveBalance.findMany({
      orderBy: {
        year: 'desc'
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
            unit: true,
          }
        }
      }
    });
    return NextResponse.json(balances, { status: 200 });
  } catch (error) {
    console.error("[GET_LEAVE_BALANCES_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// This function MANUALLY creates or updates a balance and marks it as an override
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { employeeId, leaveTypeId, total, year, month } = body;

    if (!employeeId || !leaveTypeId || total === undefined || !year) {
      return new NextResponse("Missing required fields", { status: 400 });
    }
    
    const leaveType = await db.leaveType.findUnique({ where: { id: leaveTypeId } });
    const isMonthly = leaveType?.cadence === 'MONTHLY';
    const yearInt = parseInt(year, 10);
    const monthInt = isMonthly ? parseInt(month, 10) : null;
    const totalFloat = parseFloat(total);

    const existingBalance = await db.leaveBalance.findFirst({
      where: {
        employeeId: employeeId,
        leaveTypeId: leaveTypeId,
        year: yearInt,
        month: monthInt,
      }
    });

    let newBalance;

    if (existingBalance) {
      // If it exists, update it and mark as a manual override
      newBalance = await db.leaveBalance.update({
        where: { id: existingBalance.id },
        data: {
          total: totalFloat,
          remaining: totalFloat, // Reset remaining when total is manually updated
          isManualOverride: true,
        }
      });
    } else {
      // If it does not exist, create it and mark as a manual override
      newBalance = await db.leaveBalance.create({
        data: {
          employeeId: employeeId,
          leaveTypeId: leaveTypeId,
          year: yearInt,
          month: monthInt,
          total: totalFloat,
          remaining: totalFloat,
          isManualOverride: true,
        }
      });
    }

    return NextResponse.json(newBalance, { status: 201 });

  } catch (error) {
    console.error("[LEAVE_BALANCE_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
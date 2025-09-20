// File: src/app/api/leave-balances/bulk-update/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    // Renamed to be clearer, but same variable from your frontend
    const { leaveTypeId, year, newTotal, protectManualChanges } = body; 

    if (!leaveTypeId || !year || newTotal === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const yearInt = parseInt(year, 10);
    const newTotalFloat = parseFloat(newTotal);

    // 1. Get all employees
    const allEmployeeIds = (await db.employeeProfile.findMany({ select: { id: true } })).map(e => e.id);

    // 2. Get all relevant balances for this year and leave type
    const balancesToUpdate = await db.leaveBalance.findMany({
      where: {
        leaveTypeId: leaveTypeId,
        year: yearInt,
        // ALWAYS protect locked balances
        isLocked: false, 
        // Conditionally protect manually set balances
        ...(protectManualChanges && { isManualOverride: false }),
      },
    });

    const updatePromises = balancesToUpdate.map(balance => {
      const diff = newTotalFloat - balance.total;
      return db.leaveBalance.update({
        where: { id: balance.id },
        data: {
          total: newTotalFloat,
          remaining: balance.remaining + diff,
          isManualOverride: false,
        },
      });
    });

    // 3. Find employees who DON'T have a balance yet for this year
    const employeesWithoutBalance = allEmployeeIds.filter(empId => 
      !balancesToUpdate.some(b => b.employeeId === empId)
    );
    
    const createPromises = employeesWithoutBalance.map(empId => {
      return db.leaveBalance.create({
        data: {
          employeeId: empId,
          leaveTypeId: leaveTypeId,
          year: yearInt,
          total: newTotalFloat,
          remaining: newTotalFloat,
        },
      });
    });

    // 4. Execute all updates and creations in a single transaction
    const [updateResult, createResult] = await db.$transaction([
      ...updatePromises,
      ...createPromises
    ]);

    const count = updatePromises.length + createPromises.length;
    return NextResponse.json({ message: `${count} employee balances were updated.` }, { status: 200 });

  } catch (error) {
    console.error("[BULK_UPDATE_BALANCES_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
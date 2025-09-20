// File: src/app/api/my-balances/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  console.log(`[my-balances] Fetching balances for user: ${session.user.email}`);

  const employeeProfile = await db.employeeProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!employeeProfile) {
    console.log("[my-balances] No employee profile found for this user.");
    return NextResponse.json([]);
  }

  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const leaveTypes = await db.leaveType.findMany();
    console.log(`[my-balances] Found ${leaveTypes.length} leave types in the database.`);

    if (leaveTypes.length === 0) {
        console.log("[my-balances] No leave types found. Cannot create balances.");
    }

    for (const lt of leaveTypes) {
      const periodYear = lt.cadence === 'ANNUAL' ? currentYear : currentYear;
      const periodMonth = lt.cadence === 'MONTHLY' ? currentMonth : null;

      console.log(`[my-balances] -> Checking balance for type: '${lt.name}' for period: ${periodYear}-${periodMonth || 'N/A'}`);
      
      const existingBalance = await db.leaveBalance.findFirst({
        where: {
          employeeId: employeeProfile.id,
          leaveTypeId: lt.id,
          year: periodYear,
          month: periodMonth,
        },
      });

      if (!existingBalance) {
        console.log(`[my-balances] -> No balance found for '${lt.name}'. Creating one now...`);
        await db.leaveBalance.create({
          data: {
            employeeId: employeeProfile.id,
            leaveTypeId: lt.id,
            year: periodYear,
            month: periodMonth,
            total: lt.defaultAllowance,
            remaining: lt.defaultAllowance,
          },
        });
        console.log(`[my-balances] -> Successfully created balance for '${lt.name}'.`);
      } else {
        console.log(`[my-balances] -> Balance for '${lt.name}' already exists.`);
      }
    }

    console.log("[my-balances] Finished balance creation loop. Fetching all balances to return...");
    const allBalances = await db.leaveBalance.findMany({
        where: { employeeId: employeeProfile.id },
        include: {
            leaveType: true,
        },
        orderBy: {
            leaveType: {
                name: 'asc'
            }
        }
    });
    
    console.log(`[my-balances] Returning ${allBalances.length} total balances for the user.`);
    return NextResponse.json(allBalances, { status: 200 });

  } catch (error) {
    console.error("[MY_BALANCES_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
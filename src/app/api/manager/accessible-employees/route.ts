// src/app/api/manager/accessible-employees/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * Returns the list of employees the current user (manager) can access:
 * - If the user manages others: self + direct reports
 * - If not a manager: just self
 * - Admin/Super Admin: all employees
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const role = session.user.role;

  try {
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      // HR: all employees
      const all = await db.employeeProfile.findMany({
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
      return NextResponse.json(all);
    }

    // Resolve current employee profile
    const me = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!me) {
      return new NextResponse("User profile not found", { status: 400 });
    }

    // Find direct reports
    const directReports = await db.employeeProfile.findMany({
      where: { managerId: me.id },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    // If manager, return self + direct reports; if not, return only self
    const result =
      directReports.length > 0 ? [me, ...directReports] : [me];

    return NextResponse.json(result);
  } catch (error) {
    console.error("[MANAGER_ACCESSIBLE_EMPLOYEES_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
// File: src/app/api/employees/[id]/reactivate/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

// PATCH function to reactivate a user
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    // We find the user by the EmployeeProfile ID, then update the related User record
    const profile = await db.employeeProfile.findUnique({ where: { id: params.id }});
    if (!profile) {
        return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const updatedUser = await db.user.update({
      where: { id: profile.userId },
      data: { isActive: true }, // Set the user back to active
    });

    return NextResponse.json({ message: "User reactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("[REACTIVATE_USER_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
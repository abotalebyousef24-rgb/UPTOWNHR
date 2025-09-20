import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ isManager: false });
  }

  try {
    const userProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!userProfile) {
      return NextResponse.json({ isManager: false });
    }

    const directReportsCount = await db.employeeProfile.count({
      where: { managerId: userProfile.id },
    });

    return NextResponse.json({ isManager: directReportsCount > 0 });

  } catch (error) {
    console.error("[IS_MANAGER_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
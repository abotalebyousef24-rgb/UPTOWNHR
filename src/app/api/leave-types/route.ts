import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { LeaveUnit, LeaveCadence } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const leaveTypes = await db.leaveType.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    return NextResponse.json(leaveTypes, { status: 200 });
  } catch (error) {
    console.error("[GET_LEAVE_TYPES_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, defaultAllowance, unit, cadence } = body;

    if (!name || !defaultAllowance || !unit || !cadence) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    const newLeaveType = await db.leaveType.create({
      data: {
        name,
        defaultAllowance: parseFloat(defaultAllowance),
        unit: unit as LeaveUnit,
        cadence: cadence as LeaveCadence,
      }
    });

    return NextResponse.json(newLeaveType, { status: 201 });
  } catch (error: any) { // Specify 'any' to check for error.code
    console.error("[CREATE_LEAVE_TYPE_ERROR]", error);
    
    // Check for the specific "unique constraint" error from Prisma
    if (error.code === 'P2002') {
        return new NextResponse("A leave type with this name already exists", { status: 409 });
    }

    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
// File: src/app/api/employees/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // 'active' or 'inactive'
    
    const isActive = status === 'inactive' ? false : true;

    const employees = await db.employeeProfile.findMany({
      where: {
        user: { isActive: isActive }
      },
      orderBy: { firstName: 'asc' },
      include: {
        user: { select: { email: true, role: true } },
        manager: { select: { firstName: true, lastName: true } }
      }
    });
    
    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    console.error("[GET_EMPLOYEES_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// This function creates a new employee
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, firstName, lastName, position, startDate, managerId } = body;

    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 });
    }

    if (managerId) {
      const mgrExists = await db.employeeProfile.findUnique({ where: { id: managerId }, select: { id: true }});
      if (!mgrExists) {
        return NextResponse.json({ message: "Selected manager does not exist" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profileData: any = {
      firstName,
      lastName,
      position,
      startDate: new Date(startDate),
    };

    if (managerId) {
      profileData.manager = {
        connect: { id: managerId }
      };
    }

    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        isActive: true, // New employees are active by default
        profile: {
          create: profileData,
        },
      },
      include: {
        profile: true,
      },
    });
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("[EMPLOYEE_CREATION_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const employee = await db.employeeProfile.findUnique({
      where: { id: params.id }, 
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        manager: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return new NextResponse("Employee not found", { status: 404 });
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error("[GET_EMPLOYEE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function wouldCreateCycle(employeeId: string, proposedManagerId: string): Promise<boolean> {
  // Walk up the chain from proposedManagerId; if we encounter employeeId, it would create a cycle
  let currentId: string | null = proposedManagerId;
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) break; // safety
    visited.add(currentId);
    if (currentId === employeeId) return true;
    const mgr = await db.employeeProfile.findUnique({
      where: { id: currentId },
      select: { managerId: true }
    });
    currentId = mgr?.managerId ?? null;
  }
  return false;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, firstName, lastName, position, startDate, managerId } = body;

    // First, find the employee profile using the ID from the URL.
    const profile = await db.employeeProfile.findUnique({
      where: { id: params.id },
    });

    if (!profile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }

    // Validate manager assignment: cannot set self as manager and cannot create cycles
    if (managerId) {
      if (managerId === params.id) {
        return new NextResponse("An employee cannot be their own manager.", { status: 400 });
      }
      const mgrExists = await db.employeeProfile.findUnique({ where: { id: managerId }, select: { id: true }});
      if (!mgrExists) {
        return new NextResponse("Selected manager does not exist.", { status: 400 });
      }
      if (await wouldCreateCycle(params.id, managerId)) {
        return new NextResponse("Invalid manager selection: would create a circular reporting line.", { status: 400 });
      }
    }

    // --- Start of Transaction ---
    await db.$transaction(async (tx) => {
      // Update 1: Update the EmployeeProfile table
      await tx.employeeProfile.update({
          where: { id: params.id },
          data: {
              firstName,
              lastName,
              position,
              startDate: startDate ? new Date(startDate) : null,
              managerId: managerId ?? null,
          }
      });

      // Update 2: Update the email on the related User table
      await tx.user.update({
        where: { id: profile.userId },
        data: { email },
      });
    });
    // --- End of Transaction ---

    return new NextResponse("Employee updated successfully", { status: 200 });
  } catch (error) {
    console.error("[EMPLOYEE_UPDATE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    // Fetch the employee profile including the associated user's role
    const profile = await db.employeeProfile.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // Security check: Prevent non-super admins from deactivating super admins
    if (profile.user.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: "Forbidden: Only SUPER_ADMIN can deactivate another SUPER_ADMIN" }, 
        { status: 403 }
      );
    }

    await db.user.update({
      where: { id: profile.userId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "User deactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DEACTIVATE_USER_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
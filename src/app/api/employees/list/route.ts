// src/app/api/employees/list/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    // Query EmployeeProfile directly and include user email
    const employees = await db.employeeProfile.findMany({
      where: {
        user: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Format the response to match what the frontend expects
    const formattedEmployees = employees.map(emp => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      user: {
        email: emp.user.email,
      },
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error('[GET_EMPLOYEES_LIST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
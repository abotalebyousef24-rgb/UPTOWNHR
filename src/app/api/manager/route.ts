import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/lib/db';

/**
 * GET handler to fetch all active employees to be used in selection dropdowns.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const employees = await db.user.findMany({
      where: {
        // We only want active employees in the list
        isActive: true,
      },
      select: {
          employeeProfile: {
              select: {
                  id: true,
                  firstName: true,
                  lastName: true,
              }
          }
      },
      orderBy: {
        email: 'asc',
      },
    });

    // We only return employees who have a valid employee profile
    const validEmployees = employees
        .filter(employee => employee.employeeProfile)
        .map(employee => ({
            id: employee.employeeProfile!.id,
            firstName: employee.employeeProfile!.firstName,
            // THE FIX: Corrected a typo from 'employee-profile' to 'employeeProfile'
            lastName: employee.employeeProfile!.lastName,
        }));

    return NextResponse.json(validEmployees);
  } catch (error) {
    console.error('[GET_ALL_EMPLOYEES_FOR_DROPDOWN]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
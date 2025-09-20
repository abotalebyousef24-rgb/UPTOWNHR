// File: src/lib/manager-actions.ts

import db from './prisma'; // Assuming your prisma client is exported from this path

/**
 * Checks if the manager approval step should be bypassed for a given employee.
 * Bypass occurs if the employee has no manager or if the manager is currently on an approved leave today.
 * @param employeeId The ID of the employee making the request.
 * @returns {Promise<{bypass: boolean, reason: string | null}>} - An object indicating if bypass should occur and why.
 */
export async function getBypassDetails(
    employeeId: string
): Promise<{bypass: boolean, reason: string | null}> {
  try {
    const employee = await db.employeeProfile.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    });

    if (!employee || !employee.managerId) {
      return { bypass: true, reason: 'No manager assigned.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison

    const managerOnLeave = await db.leaveRequest.findFirst({
      where: {
        employeeId: employee.managerId,
        status: 'APPROVED_BY_ADMIN',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    if (managerOnLeave) {
      return { bypass: true, reason: 'Manager is currently on leave.' };
    }

    return { bypass: false, reason: null };
  } catch (error) {
    console.error("Error in getBypassDetails:", error);
    return { bypass: false, reason: null }; // Default to not bypassing on error
  }
}
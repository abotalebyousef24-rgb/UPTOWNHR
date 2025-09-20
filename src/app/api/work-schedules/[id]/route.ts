// File: src/app/api/work-schedules/[id]/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH function to update an existing work schedule
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scheduleId = params.id;
    const body = await request.json();
    const { isDefault, ...updateData } = body;

    // Use a transaction to ensure data consistency, especially when changing the default
    const updatedSchedule = await prisma.$transaction(async (tx) => {
      // If this schedule is being set as the new default...
      if (isDefault) {
        // ...then find the old default and unset it.
        await tx.workSchedule.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      // Now, update the actual schedule record
      const schedule = await tx.workSchedule.update({
        where: { id: scheduleId },
        data: {
          ...updateData,
          isDefault: isDefault,
          // Ensure date strings are converted to Date objects if they exist
          ...(updateData.startTime && { startTime: new Date(updateData.startTime) }),
          ...(updateData.endTime && { endTime: new Date(updateData.endTime) }),
        },
      });
      return schedule;
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error(`Failed to update work schedule ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update work schedule' },
      { status: 500 }
    );
  }
}

// DELETE function to remove a work schedule
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scheduleId = params.id;

    // Important Safety Check: Prevent deleting the default schedule
    const scheduleToDelete = await prisma.workSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (scheduleToDelete?.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default work schedule. Please set another schedule as default first.' },
        { status: 400 } // Bad Request
      );
    }

    await prisma.workSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({ message: 'Work schedule deleted successfully' });
  } catch (error) {
    console.error(`Failed to delete work schedule ${params.id}:`, error);
    // Handle cases where the schedule might be in use by employees
    if (error.code === 'P2003') { // Prisma foreign key constraint failed
       return NextResponse.json(
        { error: 'Cannot delete schedule as it is currently assigned to one or more employees.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete work schedule' },
      { status: 500 }
    );
  }
}
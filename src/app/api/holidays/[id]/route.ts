// File: src/app/api/holidays/[id]/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/holidays/{id}:
 * patch:
 * summary: Updates an existing holiday
 * description: Modifies the details of a specific holiday by its ID.
 * tags: [Holidays]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: The ID of the holiday to update.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * startDate:
 * type: string
 * format: date-time
 * endDate:
 * type: string
 * format: date-time
 * type:
 * type: string
 * enum: [NATIONAL, COMPANY, TEAM, EMPLOYEE]
 * isLocked:
 * type: boolean
 * responses:
 * 200:
 * description: Holiday updated successfully.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Holiday'
 * 404:
 * description: Holiday not found.
 * 500:
 * description: Internal server error.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const holidayId = params.id;
    const body = await request.json();

    // Normalize fields
    const updateData: any = {
      ...(body.name && { name: body.name }),
      ...(body.type && { type: body.type }),
      ...(body.isLocked !== undefined && { isLocked: body.isLocked }),
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.endDate && { endDate: new Date(body.endDate) }),
    };

    if (body.startDate && body.endDate) {
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      if (end < start) {
        return NextResponse.json(
          { error: 'End date must be on or after start date' },
          { status: 400 }
        );
      }
    }

    if (body.type === 'EMPLOYEE') {
      updateData.employeeId = body.employeeId ?? null;
      updateData.repeatWeekly = Boolean(body.repeatWeekly);
    } else if (body.type) {
      // If switching to a non-EMPLOYEE type, clear employee-specific fields
      updateData.employeeId = null;
      updateData.repeatWeekly = false;
    }

    const updatedHoliday = await prisma.holiday.update({
      where: { id: holidayId },
      data: updateData,
    });

    return NextResponse.json(updatedHoliday);
  } catch (error) {
    console.error(`Failed to update holiday ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update holiday' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/holidays/{id}:
 * delete:
 * summary: Deletes a holiday
 * description: Removes a specific holiday from the database by its ID.
 * tags: [Holidays]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: The ID of the holiday to delete.
 * responses:
 * 200:
 * description: Holiday deleted successfully.
 * 404:
 * description: Holiday not found.
 * 500:
 * description: Internal server error.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const holidayId = params.id;

    await prisma.holiday.delete({
      where: { id: holidayId },
    });

    return NextResponse.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error(`Failed to delete holiday ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete holiday' },
      { status: 500 }
    );
  }
}
// File: src/app/api/work-schedules/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET function to retrieve all work schedules
export async function GET() {
  try {
    const schedules = await prisma.workSchedule.findMany({
      orderBy: {
        isDefault: 'desc', // Show the default schedule first
      },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Failed to retrieve work schedules:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve work schedules' },
      { status: 500 }
    );
  }
}

// POST function to create a new work schedule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, isDefault, startTime, endTime, ...days } = body;

    // Basic validation
    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startTime, endTime' },
        { status: 400 }
      );
    }

    // This is a transaction. It ensures that both database actions
    // (updating the old default and creating the new schedule)
    // either both succeed or both fail together. This keeps data consistent.
    const newSchedule = await prisma.$transaction(async (tx) => {
      // If the new schedule is set as default, we must unset any other default.
      if (isDefault) {
        await tx.workSchedule.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      // Now, create the new schedule
      const createdSchedule = await tx.workSchedule.create({
        data: {
          name,
          isDefault,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          isMonday: days.isMonday,
          isTuesday: days.isTuesday,
          isWednesday: days.isWednesday,
          isThursday: days.isThursday,
          isFriday: days.isFriday,
          isSaturday: days.isSaturday,
          isSunday: days.isSunday,
        },
      });
      return createdSchedule;
    });

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error('Failed to create work schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create work schedule' },
      { status: 500 }
    );
  }
}
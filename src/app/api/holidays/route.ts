// File: src/app/api/holidays/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/holidays:
 * get:
 * summary: Retrieves all holidays
 * description: Fetches a list of all holidays from the database.
 * tags: [Holidays]
 * responses:
 * 200:
 * description: A list of holidays.
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * $ref: '#/components/schemas/Holiday'
 * 500:
 * description: Internal server error.
 */
export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: {
        startDate: 'asc', // Order holidays by start date
      },
    });
    return NextResponse.json(holidays);
  } catch (error) {
    console.error('Failed to retrieve holidays:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve holidays' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/holidays:
 * post:
 * summary: Creates a new holiday
 * description: Adds a new holiday to the database.
 * tags: [Holidays]
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
 * createdBy:
 * type: string
 * responses:
 * 201:
 * description: Holiday created successfully.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Holiday'
 * 400:
 * description: Bad request, missing required fields.
 * 500:
 * description: Internal server error.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, startDate, endDate, type, createdBy, isLocked, employeeId, repeatWeekly } = body;

    // Basic validation to ensure required fields are present
    if (!name || !startDate || !endDate || !type || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    // If employee-specific, ensure employeeId is provided
    if (type === 'EMPLOYEE' && !employeeId) {
      return NextResponse.json(
        { error: 'Employee-specific holidays require an employeeId' },
        { status: 400 }
      );
    }

    const newHoliday = await prisma.holiday.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        type,
        createdBy,
        isLocked: isLocked ?? false,
        employeeId: type === 'EMPLOYEE' ? employeeId : null,
        repeatWeekly: type === 'EMPLOYEE' ? Boolean(repeatWeekly) : false,
      },
    });

    return NextResponse.json(newHoliday, { status: 201 });
  } catch (error) {
    console.error('Failed to create holiday:', error);
    return NextResponse.json(
      { error: 'Failed to create holiday' },
      { status: 500 }
    );
  }
}
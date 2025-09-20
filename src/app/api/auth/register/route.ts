import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return new NextResponse("User already exists", { status: 409 });
    }

    // Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user in the database
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Don't send the password back in the response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error("[REGISTRATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
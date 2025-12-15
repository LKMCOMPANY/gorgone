import { NextRequest, NextResponse } from "next/server";
import { verifyReportPassword } from "@/lib/data/reports";

/**
 * POST /api/reports/verify-password
 * Verify password for a shared report and set secure session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate input
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Verify password using secure database function
    const isValid = await verifyReportPassword(token, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    // Create response with session cookie
    const response = NextResponse.json({ success: true });

    // Set secure HTTPOnly cookie for this specific report
    // Cookie expires in 24 hours
    response.cookies.set(`report_access_${token}`, "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: `/r/${token}`,
    });

    return response;
  } catch (error) {
    console.error("Error verifying report password:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}


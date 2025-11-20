import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Test endpoint working",
  });
}

export async function POST() {
  return NextResponse.json({
    status: "ok",
    message: "POST working",
  });
}


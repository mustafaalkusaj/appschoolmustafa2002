import { NextResponse } from "next/server";

const GONE = NextResponse.json(
  { error: "This endpoint has been decommissioned." },
  { status: 410 },
);

export async function GET()    { return GONE; }
export async function POST()   { return GONE; }
export async function PUT()    { return GONE; }
export async function PATCH()  { return GONE; }
export async function DELETE() { return GONE; }

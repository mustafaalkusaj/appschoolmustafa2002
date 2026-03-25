import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    pong: Date.now(),
    timestamp: new Date().toISOString()
  });
}


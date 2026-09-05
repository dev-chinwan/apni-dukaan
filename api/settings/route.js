import { NextResponse } from 'next/server';
import { AppSettings } from '@/lib/catalog';

export async function GET() {
  const settings = await AppSettings.get();
  return NextResponse.json({ settings });
}

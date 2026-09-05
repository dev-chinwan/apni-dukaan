import { NextResponse } from 'next/server';
import { AppSettings } from '@/lib/catalog';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const settings = await AppSettings.get();
  return NextResponse.json({ settings });
}

export async function PATCH(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json();
  const settings = await AppSettings.update({
    deliveryFee: body.deliveryFee,
    freeDeliveryAbove: body.freeDeliveryAbove,
    supportMobile: body.supportMobile,
  });

  return NextResponse.json({ success: true, settings });
}

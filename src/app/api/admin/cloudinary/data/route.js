import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Users, Orders } from '@/lib/db';
import { Catalog, AppSettings } from '@/lib/catalog';
import { isCloudinaryEnabled, downloadJsonFromCloud } from '@/lib/cloudinaryStore';

async function requireAdmin(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  return null;
}

async function readLocalBundle() {
  const [users, orders, products, settings] = await Promise.all([
    Users.getAllRaw(),
    Orders.getAllRaw(),
    Catalog.getRawData(),
    AppSettings.getRawData(),
  ]);

  return { users, orders, products, settings };
}

function validateBundle(data) {
  if (!data || typeof data !== 'object') return 'Data must be an object';
  if (!Array.isArray(data.users)) return 'users must be an array';
  if (!Array.isArray(data.orders)) return 'orders must be an array';
  if (!data.products || typeof data.products !== 'object' || !Array.isArray(data.products.products)) {
    return 'products must be an object with products array';
  }
  if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) {
    return 'settings must be an object';
  }
  return null;
}

export async function GET(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') === 'cloud' ? 'cloud' : 'local';

  if (source === 'cloud') {
    if (!isCloudinaryEnabled()) {
      return NextResponse.json(
        { error: 'Cloudinary is disabled. Configure CLOUDINARY_* vars first.' },
        { status: 400 }
      );
    }

    const [users, orders, products, settings] = await Promise.all([
      downloadJsonFromCloud('users.json'),
      downloadJsonFromCloud('orders.json'),
      downloadJsonFromCloud('products.json'),
      downloadJsonFromCloud('settings.json'),
    ]);

    const data = { users, orders, products, settings };
    const validationError = validateBundle(data);
    if (validationError) {
      return NextResponse.json({ error: `Invalid cloud data: ${validationError}` }, { status: 400 });
    }

    return NextResponse.json({ source, data });
  }

  const data = await readLocalBundle();
  return NextResponse.json({ source, data });
}

export async function PUT(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const body = await req.json();
  const data = body?.data;

  const validationError = validateBundle(data);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    await Users.replaceAllRaw(data.users);
    await Orders.replaceAllRaw(data.orders);
    await Catalog.replaceRawData(data.products);
    await AppSettings.replaceRawData(data.settings);

    return NextResponse.json({
      success: true,
      counts: {
        users: data.users.length,
        orders: data.orders.length,
        products: data.products.products.length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Failed to save data bundle' }, { status: 400 });
  }
}

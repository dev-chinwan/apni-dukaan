import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Users, Orders } from '@/lib/db';
import { Catalog, AppSettings } from '@/lib/catalog';
import {
  isCloudinaryEnabled,
  syncArrayToCloud,
  syncObjectToCloud,
  downloadJsonFromCloud,
} from '@/lib/cloudinaryStore';

async function requireAdmin(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  return null;
}

async function localSnapshot() {
  const [users, orders, productsRaw, settingsRaw] = await Promise.all([
    Users.getAllRaw(),
    Orders.getAllRaw(),
    Catalog.getRawData(),
    AppSettings.getRawData(),
  ]);

  return {
    users,
    orders,
    products: productsRaw,
    settings: settingsRaw,
  };
}

export async function GET(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const snapshot = await localSnapshot();

  return NextResponse.json({
    cloudinaryEnabled: isCloudinaryEnabled(),
    counts: {
      users: snapshot.users.length,
      orders: snapshot.orders.length,
      products: Array.isArray(snapshot.products.products) ? snapshot.products.products.length : 0,
    },
  });
}

export async function POST(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  if (!isCloudinaryEnabled()) {
    return NextResponse.json(
      { error: 'Cloudinary sync is disabled. Configure CLOUDINARY_* env vars first.' },
      { status: 400 }
    );
  }

  const { action } = await req.json();

  if (action === 'push') {
    const snapshot = await localSnapshot();
    const [usersRes, ordersRes, productsRes, settingsRes] = await Promise.all([
      syncArrayToCloud('users.json', snapshot.users),
      syncArrayToCloud('orders.json', snapshot.orders),
      syncObjectToCloud('products.json', snapshot.products),
      syncObjectToCloud('settings.json', snapshot.settings),
    ]);

    const allOk = [usersRes, ordersRes, productsRes, settingsRes].every((r) => r.ok || r.skipped);

    return NextResponse.json(
      {
        success: allOk,
        action,
        results: {
          users: usersRes,
          orders: ordersRes,
          products: productsRes,
          settings: settingsRes,
        },
      },
      { status: allOk ? 200 : 502 }
    );
  }

  if (action === 'pull') {
    const [usersCloud, ordersCloud, productsCloud, settingsCloud] = await Promise.all([
      downloadJsonFromCloud('users.json'),
      downloadJsonFromCloud('orders.json'),
      downloadJsonFromCloud('products.json'),
      downloadJsonFromCloud('settings.json'),
    ]);

    if (!Array.isArray(usersCloud) || !Array.isArray(ordersCloud)) {
      return NextResponse.json({ error: 'Cloud users/orders JSON is missing or invalid' }, { status: 400 });
    }

    if (!productsCloud || typeof productsCloud !== 'object' || !Array.isArray(productsCloud.products)) {
      return NextResponse.json({ error: 'Cloud products JSON is missing or invalid' }, { status: 400 });
    }

    if (!settingsCloud || typeof settingsCloud !== 'object' || Array.isArray(settingsCloud)) {
      return NextResponse.json({ error: 'Cloud settings JSON is missing or invalid' }, { status: 400 });
    }

    await Users.replaceAllRaw(usersCloud);
    await Orders.replaceAllRaw(ordersCloud);
    await Catalog.replaceRawData(productsCloud);
    await AppSettings.replaceRawData(settingsCloud);

    return NextResponse.json({
      success: true,
      action,
      counts: {
        users: usersCloud.length,
        orders: ordersCloud.length,
        products: productsCloud.products.length,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid action. Use push or pull.' }, { status: 400 });
}

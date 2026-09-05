import { NextResponse } from 'next/server';
import { Catalog } from '@/lib/catalog';
import { getCurrentUser } from '@/lib/auth';

async function requireAdmin(req) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  return null;
}

export async function GET(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const products = await Catalog.listAll();
  const categories = await Catalog.categories(true);
  return NextResponse.json({ products, categories });
}

export async function PATCH(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const body = await req.json();
  const { id, updates } = body || {};

  if (!id || !updates || typeof updates !== 'object') {
    return NextResponse.json({ error: 'id and updates are required' }, { status: 400 });
  }

  let updated;
  try {
    updated = await Catalog.updateProduct(id, updates);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Invalid product update' }, { status: 400 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, product: updated });
}

export async function POST(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const body = await req.json();
  const { product } = body || {};
  if (!product || typeof product !== 'object') {
    return NextResponse.json({ error: 'product is required' }, { status: 400 });
  }

  try {
    const created = await Catalog.createProduct(product);
    return NextResponse.json({ success: true, product: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to create product' }, { status: 400 });
  }
}

export async function DELETE(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const { searchParams } = new URL(req.url);
  let id = searchParams.get('id');

  if (!id) {
    try {
      const body = await req.json();
      id = body?.id;
    } catch {
      id = null;
    }
  }

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const deleted = await Catalog.deleteProduct(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, product: deleted });
}

export async function PUT(req) {
  const denial = await requireAdmin(req);
  if (denial) return denial;

  const body = await req.json();
  const products = Array.isArray(body) ? body : body?.products;

  try {
    const updatedProducts = await Catalog.replaceAll(products);
    const categories = [...new Set(updatedProducts.map((p) => p.category))];
    return NextResponse.json({ success: true, products: updatedProducts, categories });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Invalid products JSON' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { Catalog } from '@/lib/catalog';

export async function GET() {
  const products = await Catalog.listInStock();
  const categories = ['All', ...(await Catalog.categories(false))];
  return NextResponse.json({ products, categories });
}

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { PRODUCTS, DELIVERY } from '@/config/products.config';
import { hydrateObjectFromCloud, syncObjectToCloud, isCloudinarySyncRequired } from '@/lib/cloudinaryStore';

const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

let _catalogDb;
let _settingsDb;
let _writeLocks = {};

async function withFileWriteLock(filename, writer) {
  const previous = _writeLocks[filename] || Promise.resolve();
  const current = previous.catch(() => {}).then(writer);
  _writeLocks[filename] = current.finally(() => {
    if (_writeLocks[filename] === current) delete _writeLocks[filename];
  });
  return current;
}

async function getObjectDb(filename, defaults) {
  const file = join(DATA_DIR, filename);
  const db = {
    data: { ...defaults },
    async write() {
      await writeFile(file, JSON.stringify(this.data, null, 2), 'utf8');
    },
  };

  let changed = false;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      db.data = parsed;
    }
  } catch {
    db.data = { ...defaults };
    changed = !existsSync(file);
  }

  if (changed) {
    await withFileWriteLock(filename, async () => {
      await db.write();
    });
  }
  return db;
}

async function getCatalogDb() {
  if (_catalogDb) return _catalogDb;
  _catalogDb = await getObjectDb('products.json', { products: [] });

  const cloudData = await hydrateObjectFromCloud('products.json', _catalogDb.data);
  if (cloudData && Array.isArray(cloudData.products)) {
    _catalogDb.data = cloudData;
  }

  if (!Array.isArray(_catalogDb.data.products) || _catalogDb.data.products.length === 0) {
    _catalogDb.data.products = PRODUCTS.map((p) => ({ ...p }));
    await withFileWriteLock('products.json', async () => {
      await _catalogDb.write();
    });
    await syncObjectToCloud('products.json', _catalogDb.data);
  }

  return _catalogDb;
}

async function getSettingsDb() {
  if (_settingsDb) return _settingsDb;
  _settingsDb = await getObjectDb('settings.json', {
    deliveryFee: DELIVERY.fee,
    freeDeliveryAbove: DELIVERY.freeAbove,
    currency: 'INR',
    supportMobile: '',
  });

  const cloudData = await hydrateObjectFromCloud('settings.json', _settingsDb.data);
  if (cloudData && typeof cloudData === 'object' && !Array.isArray(cloudData)) {
    const next = JSON.stringify(cloudData);
    const curr = JSON.stringify(_settingsDb.data || {});
    if (next !== curr) {
      _settingsDb.data = cloudData;
    }
  }

  return _settingsDb;
}

async function persistObjectDb(filename, db) {
  const result = await withFileWriteLock(filename, async () => {
    await db.write();
    return syncObjectToCloud(filename, db.data);
  });
  if (isCloudinarySyncRequired() && !result.ok && !result.skipped) {
    throw new Error(`Cloudinary sync failed for ${filename}`);
  }
}

function normalizeProduct(product) {
  return {
    id: String(product.id || '').trim(),
    name: String(product.name || '').trim(),
    emoji: String(product.emoji || '').trim() || '🛍️',
    price: Number(product.price || 0),
    unit: String(product.unit || 'piece').trim(),
    category: String(product.category || 'General').trim(),
    badge: product.badge ? String(product.badge).trim() : null,
    inStock: Boolean(product.inStock),
    sortOrder: Number(product.sortOrder || 9999),
  };
}

function validateProduct(product) {
  if (!product.id) throw new Error('Product id is required');
  if (!product.name) throw new Error(`Product ${product.id}: name is required`);
  if (!product.unit) throw new Error(`Product ${product.id}: unit is required`);
  if (!product.category) throw new Error(`Product ${product.id}: category is required`);
  if (!Number.isFinite(product.price) || product.price < 1) {
    throw new Error(`Product ${product.id}: price must be at least 1`);
  }
}

async function generateCatalogId() {
  const db = await getCatalogDb();
  let id = randomUUID();
  while (db.data.products.some((p) => p.id === id)) {
    id = randomUUID();
  }
  return id;
}

export const Catalog = {
  async listAll() {
    const db = await getCatalogDb();
    return [...db.data.products]
      .map((p) => normalizeProduct(p))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async listInStock() {
    const products = await this.listAll();
    return products.filter((p) => p.inStock);
  },

  async updateProduct(id, updates) {
    const db = await getCatalogDb();
    const idx = db.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const merged = normalizeProduct({
      ...db.data.products[idx],
      ...updates,
      id,
    });
    validateProduct(merged);

    db.data.products[idx] = merged;

    await persistObjectDb('products.json', db);
    return db.data.products[idx];
  },

  async createProduct(productData) {
    const db = await getCatalogDb();
    const incoming = productData || {};
    const autoId = incoming.id ? String(incoming.id).trim() : await generateCatalogId();
    const product = normalizeProduct({ ...incoming, id: autoId });
    validateProduct(product);

    if (db.data.products.some((p) => p.id === product.id)) {
      throw new Error('Product id already exists');
    }

    db.data.products.push(product);
    await persistObjectDb('products.json', db);
    return product;
  },

  async deleteProduct(id) {
    const db = await getCatalogDb();
    const idx = db.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const [deleted] = db.data.products.splice(idx, 1);
    await persistObjectDb('products.json', db);
    return deleted;
  },

  async replaceAll(products) {
    if (!Array.isArray(products)) throw new Error('products must be an array');

    const normalized = products.map((p) => normalizeProduct(p));
    const idSet = new Set();
    normalized.forEach((p) => {
      validateProduct(p);
      if (idSet.has(p.id)) {
        throw new Error(`Duplicate product id: ${p.id}`);
      }
      idSet.add(p.id);
    });

    const db = await getCatalogDb();
    db.data.products = normalized;
    await persistObjectDb('products.json', db);
    return this.listAll();
  },

  async categories(includeOutOfStock = false) {
    const products = includeOutOfStock ? await this.listAll() : await this.listInStock();
    return [...new Set(products.map((p) => p.category))];
  },

  async getRawData() {
    const db = await getCatalogDb();
    return {
      products: Array.isArray(db.data.products) ? [...db.data.products] : [],
    };
  },

  async replaceRawData(data) {
    const products = Array.isArray(data?.products) ? data.products : [];
    return this.replaceAll(products);
  },
};

export const AppSettings = {
  async get() {
    const db = await getSettingsDb();
    const deliveryFee = Number(db.data.deliveryFee || 0);
    const freeDeliveryAbove = Number(db.data.freeDeliveryAbove || 0);

    return {
      deliveryFee,
      freeDeliveryAbove,
      currency: db.data.currency || 'INR',
      supportMobile: db.data.supportMobile || '',
      delivery: {
        fee: deliveryFee,
        freeAbove: freeDeliveryAbove,
      },
    };
  },

  async update(updates) {
    const db = await getSettingsDb();
    db.data = {
      ...db.data,
      ...updates,
      deliveryFee: Number(updates.deliveryFee ?? db.data.deliveryFee ?? 0),
      freeDeliveryAbove: Number(updates.freeDeliveryAbove ?? db.data.freeDeliveryAbove ?? 0),
    };
    await persistObjectDb('settings.json', db);
    return this.get();
  },

  async getRawData() {
    const db = await getSettingsDb();
    return {
      deliveryFee: Number(db.data.deliveryFee || 0),
      freeDeliveryAbove: Number(db.data.freeDeliveryAbove || 0),
      currency: db.data.currency || 'INR',
      supportMobile: db.data.supportMobile || '',
    };
  },

  async replaceRawData(settings) {
    const db = await getSettingsDb();
    db.data = {
      deliveryFee: Number(settings?.deliveryFee || 0),
      freeDeliveryAbove: Number(settings?.freeDeliveryAbove || 0),
      currency: settings?.currency || 'INR',
      supportMobile: settings?.supportMobile || '',
    };
    await persistObjectDb('settings.json', db);
    return this.get();
  },
};

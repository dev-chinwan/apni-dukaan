/**
 * File-based database using plain JSON files.
 *
 * Files stored in /data/
 *   users.json   — registered users (customers & admins)
 *   orders.json  — all orders (auto-purged after 90 days)
 *   sessions.json — active JWT sessions (optional tracking)
 *
 * All writes are synchronous within a request to avoid race conditions
 * on a single-server deploy.
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { hydrateArrayFromCloud, syncArrayToCloud, isCloudinarySyncRequired } from '@/lib/cloudinaryStore';

// ── Ensure /data directory exists ─────────────────────────────────────────────
const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── In-memory adapters backed by JSON files ──────────────────────────────────
let _db = {};
let _hydrated = {};
let _writeLocks = {};

async function withFileWriteLock(filename, writer) {
  const previous = _writeLocks[filename] || Promise.resolve();
  const current = previous.catch(() => {}).then(writer);
  _writeLocks[filename] = current.finally(() => {
    if (_writeLocks[filename] === current) delete _writeLocks[filename];
  });
  return current;
}

async function getAdapter(filename) {
  if (_db[filename]) return _db[filename];

  const file = join(DATA_DIR, filename);
  const db = {
    data: [],
    async write() {
      await writeFile(file, JSON.stringify(this.data, null, 2), 'utf8');
    },
  };

  let changed = false;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    db.data = Array.isArray(parsed) ? parsed : [];
  } catch {
    db.data = [];
    changed = !existsSync(file);
  }

  // Prefer cloud snapshot when configured; keep local JSON as backup cache.
  if (!_hydrated[filename]) {
    const cloudData = await hydrateArrayFromCloud(filename, db.data);
    if (Array.isArray(cloudData)) {
      const next = JSON.stringify(cloudData);
      const curr = JSON.stringify(db.data || []);
      if (next !== curr) {
        db.data = cloudData;
        changed = true;
      }
    }
    _hydrated[filename] = true;
  }

  if (changed) {
    await withFileWriteLock(filename, async () => {
      await db.write();
    });
  }

  _db[filename] = db;
  return db;
}

async function persistArrayDb(filename, db) {
  const result = await withFileWriteLock(filename, async () => {
    await db.write();
    return syncArrayToCloud(filename, db.data);
  });
  if (isCloudinarySyncRequired() && !result.ok && !result.skipped) {
    throw new Error(`Cloudinary sync failed for ${filename}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function threeMothsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString();
}

// ══════════════════════════════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════════════════════════════
export const Users = {
  async findByMobile(mobile) {
    const db = await getAdapter('users.json');
    return db.data.find((u) => u.mobile === mobile) || null;
  },

  async findById(id) {
    const db = await getAdapter('users.json');
    return db.data.find((u) => u.id === id) || null;
  },

  async create(userData) {
    const db = await getAdapter('users.json');
    const user = {
      ...userData,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    db.data.push(user);
    await persistArrayDb('users.json', db);
    return user;
  },

  async findAll(role = null) {
    const db = await getAdapter('users.json');
    return role ? db.data.filter((u) => u.role === role) : db.data;
  },

  async update(id, updates) {
    const db  = await getAdapter('users.json');
    const idx = db.data.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    db.data[idx] = { ...db.data[idx], ...updates, updatedAt: new Date().toISOString() };
    await persistArrayDb('users.json', db);
    return db.data[idx];
  },

  async count(role = null) {
    const db = await getAdapter('users.json');
    return role ? db.data.filter((u) => u.role === role).length : db.data.length;
  },

  async getAllRaw() {
    const db = await getAdapter('users.json');
    return Array.isArray(db.data) ? [...db.data] : [];
  },

  async replaceAllRaw(rows) {
    const db = await getAdapter('users.json');
    db.data = Array.isArray(rows) ? rows : [];
    await persistArrayDb('users.json', db);
    return db.data;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════════════════════════
export const Orders = {
  async findById(orderId) {
    const db = await getAdapter('orders.json');
    return db.data.find((o) => o.orderId === orderId) || null;
  },

  async findByCustomer(userId, limit = 30) {
    const db = await getAdapter('orders.json');
    return db.data
      .filter((o) => o.customerId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  },

  async findAll({ status, search, page = 1, limit = 50 } = {}) {
    const db = await getAdapter('orders.json');
    let rows = [...db.data];

    if (status && status !== 'all') rows = rows.filter((o) => o.status === status);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerMobile.includes(q)
      );
    }

    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = rows.length;
    rows = rows.slice((page - 1) * limit, page * limit);
    return { rows, total };
  },

  async getAllRaw() {
    const db = await getAdapter('orders.json');
    return Array.isArray(db.data) ? [...db.data] : [];
  },

  async replaceAllRaw(rows) {
    const db = await getAdapter('orders.json');
    db.data = Array.isArray(rows) ? rows : [];
    await persistArrayDb('orders.json', db);
    return db.data;
  },

  async create(orderData) {
    const db    = await getAdapter('orders.json');
    const order = {
      ...orderData,
      createdAt:     new Date().toISOString(),
      statusHistory: [{ status: orderData.status, ts: new Date().toISOString() }],
    };
    db.data.push(order);
    await persistArrayDb('orders.json', db);
    return order;
  },

  async updateStatus(orderId, status, adminNote = '') {
    const db  = await getAdapter('orders.json');
    const idx = db.data.findIndex((o) => o.orderId === orderId);
    if (idx === -1) return null;

    db.data[idx].status = status;
    db.data[idx].updatedAt = new Date().toISOString();
    if (adminNote) db.data[idx].adminNote = adminNote;
    db.data[idx].statusHistory = [
      ...(db.data[idx].statusHistory || []),
      { status, ts: new Date().toISOString(), note: adminNote },
    ];

    await persistArrayDb('orders.json', db);
    return db.data[idx];
  },

  // Stats for admin dashboard
  async getStats() {
    const db   = await getAdapter('orders.json');
    const all  = db.data;
    const todayStr = new Date().toISOString().slice(0, 10);

    const today = all.filter((o) => o.createdAt.startsWith(todayStr));
    const statusBreakdown = {};
    all.forEach((o) => { statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1; });

    return {
      total:         all.length,
      todayCount:    today.length,
      totalRevenue:  all.reduce((s, o) => s + o.total, 0),
      todayRevenue:  today.reduce((s, o) => s + o.total, 0),
      pending:       all.filter((o) => ['placed', 'confirmed', 'packing', 'out'].includes(o.status)).length,
      statusBreakdown,
    };
  },

  // ── 3-Month auto-purge ────────────────────────────────────────────────────
  async purgeOldOrders() {
    const db       = await getAdapter('orders.json');
    const cutoff   = threeMothsAgo();
    const before   = db.data.length;

    db.data = db.data.filter(
      (o) => o.status !== 'delivered' || o.createdAt >= cutoff
    );

    const removed = before - db.data.length;
    if (removed > 0) {
      await persistArrayDb('orders.json', db);
      console.log(`[DB] Purged ${removed} orders older than 3 months`);
    }
    return removed;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
//  Run purge on startup (non-blocking)
// ══════════════════════════════════════════════════════════════════════════════
if (typeof window === 'undefined') {
  setTimeout(() => {
    Orders.purgeOldOrders().catch(() => {});
  }, 5000);
}

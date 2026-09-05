/**
 * File-based database using lowdb + JSON files.
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

// ── Ensure /data directory exists ─────────────────────────────────────────────
const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── Lazy-load lowdb (ESM-only package via dynamic import) ─────────────────────
let _db = {};

async function getAdapter(filename) {
  if (_db[filename]) return _db[filename];

  const { Low }      = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');

  const file    = join(DATA_DIR, filename);
  const adapter = new JSONFile(file);
  const db      = new Low(adapter, []);

  await db.read();
  if (!db.data) db.data = [];
  await db.write();

  _db[filename] = db;
  return db;
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
    const user = { ...userData, createdAt: new Date().toISOString() };
    db.data.push(user);
    await db.write();
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
    await db.write();
    return db.data[idx];
  },

  async count(role = null) {
    const db = await getAdapter('users.json');
    return role ? db.data.filter((u) => u.role === role).length : db.data.length;
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

  async create(orderData) {
    const db    = await getAdapter('orders.json');
    const order = {
      ...orderData,
      createdAt:     new Date().toISOString(),
      statusHistory: [{ status: orderData.status, ts: new Date().toISOString() }],
    };
    db.data.push(order);
    await db.write();
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

    await db.write();
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
      await db.write();
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

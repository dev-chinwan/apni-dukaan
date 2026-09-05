'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

const EMOJI_SUGGESTIONS = ['🥦', '🍅', '🥕', '🍎', '🍌', '🥛', '🥚', '🍞', '🍚', '🧃', '🛍️'];
const CATEGORY_SUGGESTIONS = ['Fruits', 'Vegetables', 'Dairy & Eggs', 'Bakery', 'Beverages', 'Snacks', 'Staples', 'Personal Care', 'General'];
const UNIT_SUGGESTIONS = ['kg', 'piece', 'dozen', 'pack', 'litre', '500g', '200g', '12 pcs', 'loaf', 'bunch'];
const BADGE_SUGGESTIONS = ['Seasonal', 'Organic', 'Fresh', 'Farm Fresh', 'Bestseller', 'Limited'];

function randomToken() {
  return Math.random().toString(36).slice(2, 8);
}

function makeClientProductId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${randomToken()}-${randomToken()}-${randomToken()}`;
}

function productToDraft(product) {
  return {
    ...product,
    badge: product.badge || '',
  };
}

function normalizeDraftPayload(draft) {
  return {
    id: String(draft.id || '').trim(),
    name: String(draft.name || '').trim(),
    emoji: String(draft.emoji || '').trim() || '🛍️',
    price: Number(draft.price),
    unit: String(draft.unit || '').trim(),
    category: String(draft.category || '').trim(),
    badge: String(draft.badge || '').trim() || null,
    inStock: Boolean(draft.inStock),
    sortOrder: Number(draft.sortOrder || 9999),
  };
}

export default function AdminGroceriesPage() {
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('manage');
  const [bulkJson, setBulkJson] = useState('');
  const [newProduct, setNewProduct] = useState({
    id: makeClientProductId(),
    name: '',
    emoji: '🛍️',
    price: 1,
    unit: 'piece',
    category: 'General',
    badge: '',
    inStock: true,
    sortOrder: 999,
  });

  const syncProducts = (items) => {
    setProducts(items);
    const nextDrafts = {};
    items.forEach((p) => {
      nextDrafts[p.id] = productToDraft(p);
    });
    setDrafts(nextDrafts);
    setBulkJson(JSON.stringify({ products: items }, null, 2));
  };

  const load = () => {
    setLoading(true);
    fetch('/api/admin/catalog')
      .then((r) => r.json())
      .then((d) => syncProducts(d.products || []))
      .catch(() => toast.error('Failed to load groceries'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const patchProduct = async (id, updates) => {
    setSavingId(id);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setProducts((prev) => prev.map((p) => (p.id === id ? data.product : p)));
      setDrafts((prev) => ({ ...prev, [id]: productToDraft(data.product) }));
      toast.success('Product updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update product');
    } finally {
      setSavingId('');
    }
  };

  const saveDraft = (id) => {
    const draft = drafts[id];
    if (!draft) return;
    patchProduct(id, normalizeDraftPayload(draft));
  };

  const deleteProduct = async (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    if (!window.confirm(`Delete product "${product.name}" (${id})?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/catalog?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      const nextProducts = products.filter((p) => p.id !== id);
      syncProducts(nextProducts);
      toast.success('Product deleted');
    } catch (e) {
      toast.error(e.message || 'Failed to delete product');
    } finally {
      setDeletingId('');
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    const payload = normalizeDraftPayload(newProduct);

    setSavingId('new');
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');

      const nextProducts = [...products, data.product].sort((a, b) => a.sortOrder - b.sortOrder);
      syncProducts(nextProducts);
      setNewProduct({
        id: makeClientProductId(),
        name: '',
        emoji: '🛍️',
        price: 1,
        unit: 'piece',
        category: payload.category || 'General',
        badge: '',
        inStock: true,
        sortOrder: (Number(payload.sortOrder) || 999) + 1,
      });
      toast.success('Product created');
      setTab('manage');
    } catch (e1) {
      toast.error(e1.message || 'Failed to create product');
    } finally {
      setSavingId('');
    }
  };

  const saveBulkJson = async () => {
    let parsed;
    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      toast.error('Invalid JSON');
      return;
    }

    const productsPayload = Array.isArray(parsed) ? parsed : parsed?.products;
    if (!Array.isArray(productsPayload)) {
      toast.error('JSON must be an array or an object with products array');
      return;
    }

    if (!window.confirm('Replace complete products JSON with this content?')) return;

    setBulkSaving(true);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsPayload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk update failed');

      syncProducts(data.products || []);
      toast.success('Products JSON updated');
      setTab('manage');
    } catch (e) {
      toast.error(e.message || 'Failed to save JSON');
    } finally {
      setBulkSaving(false);
    }
  };

  const setDraftValue = (id, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value,
      },
    }));
  };

  const setNewProductField = (key, value) => {
    setNewProduct((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50">
          Groceries <span className="text-[#4B7A5B] font-normal text-base">({products.length})</span>
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { key: 'manage', label: 'Manage Products' },
          { key: 'add', label: 'Add Product' },
          { key: 'bulk', label: 'Bulk JSON' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
              tab === item.key
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-[#1A3D2B] text-[#4B7A5B]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <form onSubmit={addProduct} className="card p-4 mb-4 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-widest text-[#4B7A5B] mb-1 block">Auto Product ID</label>
            <div className="input h-11 flex items-center justify-between">
              <span className="text-green-100 text-sm">{newProduct.id}</span>
              <button
                type="button"
                onClick={() => setNewProductField('id', makeClientProductId())}
                className="text-xs px-2 py-1 rounded border border-[#1A3D2B] text-[#4B7A5B]"
              >
                Regenerate
              </button>
            </div>
          </div>

          <input className="input" placeholder="name" value={newProduct.name}
            onChange={(e) => setNewProductField('name', e.target.value)} required />
          <input className="input" placeholder="emoji" value={newProduct.emoji}
            onChange={(e) => setNewProductField('emoji', e.target.value)} />
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {EMOJI_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNewProductField('emoji', item)}
                className="px-2 py-1 rounded-lg text-xs border border-[#1A3D2B] text-[#4B7A5B]"
              >
                {item}
              </button>
            ))}
          </div>

          <input className="input" type="number" min="1" placeholder="price" value={newProduct.price}
            onChange={(e) => setNewProductField('price', e.target.value)} required />
          <input className="input" placeholder="unit" value={newProduct.unit}
            onChange={(e) => setNewProductField('unit', e.target.value)} required />
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {UNIT_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNewProductField('unit', item)}
                className="px-2 py-1 rounded-lg text-xs border border-[#1A3D2B] text-[#4B7A5B]"
              >
                {item}
              </button>
            ))}
          </div>

          <input className="input" placeholder="category" value={newProduct.category}
            onChange={(e) => setNewProductField('category', e.target.value)} required />
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {CATEGORY_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNewProductField('category', item)}
                className="px-2 py-1 rounded-lg text-xs border border-[#1A3D2B] text-[#4B7A5B]"
              >
                {item}
              </button>
            ))}
          </div>

          <input className="input" placeholder="badge (optional)" value={newProduct.badge}
            onChange={(e) => setNewProductField('badge', e.target.value)} />
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {BADGE_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNewProductField('badge', item)}
                className="px-2 py-1 rounded-lg text-xs border border-[#1A3D2B] text-[#4B7A5B]"
              >
                {item}
              </button>
            ))}
          </div>

          <input className="input" type="number" min="0" placeholder="sort order" value={newProduct.sortOrder}
            onChange={(e) => setNewProductField('sortOrder', e.target.value)} />

          <label className="flex items-center gap-2 text-sm text-green-100">
            <input type="checkbox" checked={newProduct.inStock}
              onChange={(e) => setNewProductField('inStock', e.target.checked)} />
            In Stock
          </label>

          <button
            type="submit"
            disabled={savingId === 'new'}
            className="sm:col-span-2 py-3 rounded-xl font-bold text-[#061810] bg-amber-500 hover:bg-amber-400 disabled:opacity-50"
          >
            {savingId === 'new' ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      )}

      {tab === 'bulk' && (
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setBulkJson(JSON.stringify({ products }, null, 2))}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#1A3D2B] text-[#4B7A5B]"
            >
              Load Current JSON
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  setBulkJson(JSON.stringify(JSON.parse(bulkJson), null, 2));
                } catch {
                  toast.error('Invalid JSON');
                }
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#1A3D2B] text-[#4B7A5B]"
            >
              Format JSON
            </button>
            <button
              type="button"
              disabled={bulkSaving}
              onClick={saveBulkJson}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-[#061810] disabled:opacity-50"
            >
              {bulkSaving ? 'Saving...' : 'Save Bulk Update'}
            </button>
          </div>

          <p className="text-xs text-[#4B7A5B] mb-2">Use an array or an object with products array.</p>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            rows={16}
            className="input font-mono text-xs"
          />
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by product name, category, id..."
        className="input mb-4"
      />

      {loading && <div className="text-[#4B7A5B] text-sm py-8 text-center">Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-[#4B7A5B]">
          <div className="text-4xl mb-3">🥦</div>
          <p>No products found</p>
        </div>
      )}

      {tab === 'manage' && <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{drafts[p.id]?.emoji || p.emoji}</span>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className="input h-9" value={drafts[p.id]?.name || ''}
                    onChange={(e) => setDraftValue(p.id, 'name', e.target.value)} />
                  <input className="input h-9" value={drafts[p.id]?.emoji || ''}
                    onChange={(e) => setDraftValue(p.id, 'emoji', e.target.value)} />
                  <input className="input h-9" value={drafts[p.id]?.category || ''}
                    onChange={(e) => setDraftValue(p.id, 'category', e.target.value)} />
                  <input className="input h-9" value={drafts[p.id]?.unit || ''}
                    onChange={(e) => setDraftValue(p.id, 'unit', e.target.value)} />
                  <input className="input h-9" value={drafts[p.id]?.badge || ''}
                    onChange={(e) => setDraftValue(p.id, 'badge', e.target.value)} placeholder="badge" />
                  <div className="text-xs text-[#4B7A5B] flex items-center">{p.id}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={drafts[p.id]?.price ?? p.price}
                  className="input w-24 h-9"
                  onChange={(e) => setDraftValue(p.id, 'price', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  value={drafts[p.id]?.sortOrder ?? p.sortOrder}
                  className="input w-24 h-9"
                  onChange={(e) => setDraftValue(p.id, 'sortOrder', e.target.value)}
                />

                <label className="flex items-center gap-2 text-xs text-green-100">
                  <input
                    type="checkbox"
                    checked={Boolean(drafts[p.id]?.inStock)}
                    onChange={(e) => setDraftValue(p.id, 'inStock', e.target.checked)}
                  />
                  In Stock
                </label>

                <button
                  disabled={savingId === p.id}
                  onClick={() => saveDraft(p.id)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-leaf-500/20 text-leaf-400 border border-leaf-500/30 disabled:opacity-50"
                >
                  {savingId === p.id ? 'Saving...' : 'Save'}
                </button>

                <button
                  disabled={deletingId === p.id}
                  onClick={() => deleteProduct(p.id)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 disabled:opacity-50"
                >
                  {deletingId === p.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

function pretty(data) {
  return JSON.stringify(data, null, 2);
}

export default function AdminCloudDataPage() {
  const [source, setSource] = useState('local');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');

  const loadBundle = async (nextSource = source) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cloudinary/data?source=${nextSource}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load data');
      setSource(data.source || nextSource);
      setText(pretty(data.data || {}));
      toast.success(`Loaded ${data.source || nextSource} JSON bundle`);
    } catch (e) {
      toast.error(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBundle('local');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveBundle = async () => {
    setSaving(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON. Fix formatting before saving.');
      }

      const res = await fetch('/api/admin/cloudinary/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save data');

      toast.success(`Saved bundle. Users: ${data.counts.users}, Orders: ${data.counts.orders}, Products: ${data.counts.products}`);
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-2xl font-bold text-green-50">Cloud Data Manager</h1>
          <p className="text-xs text-[#4B7A5B] mt-1">Pull complete JSON bundle, bulk edit, and save. Save operation syncs local backup and Cloudinary.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => loadBundle('local')}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-green-200 border border-[#1A3D2B] disabled:opacity-50"
          >
            Load Local
          </button>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => loadBundle('cloud')}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-amber-400 border border-amber-500/40 bg-amber-500/10 disabled:opacity-50"
          >
            Pull Cloud
          </button>
          <button
            type="button"
            disabled={loading || saving}
            onClick={saveBundle}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-[#061810] bg-leaf-500 hover:bg-leaf-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Bulk Save'}
          </button>
        </div>
      </div>

      <div className="card p-4 mb-3">
        <div className="text-xs text-[#4B7A5B] mb-2">Active source: <span className="text-leaf-400 font-semibold uppercase">{source}</span></div>
        {loading ? (
          <div className="text-[#4B7A5B] text-sm py-10 text-center">Loading JSON bundle...</div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[65vh] rounded-xl bg-[#0A2318] border border-[#1A3D2B] p-3 text-xs text-green-100 font-mono outline-none focus:border-leaf-500/40"
            spellCheck={false}
          />
        )}
      </div>

      <p className="text-xs text-[#4B7A5B]">Expected JSON keys: users[] , orders[] , products.products[] , settings{}.</p>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function AdminMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [nameMr, setNameMr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: res } = await supabaseClient.from('restaurants').select('id').limit(1).single();
      if (!res) return;
      setRestaurantId(res.id);

      const [mRes, cRes] = await Promise.all([
        supabaseClient.from('menu_items').select('*').eq('restaurant_id', res.id).order('created_at', { ascending: false }),
        supabaseClient.from('categories').select('*').eq('restaurant_id', res.id)
      ]);

      if (mRes.data) setItems(mRes.data);
      if (cRes.data) {
        setCategories(cRes.data);
        if (cRes.data[0]) setCategoryId(cRes.data[0].id);
      }
    }
    loadData();
  }, []);

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabaseClient.from('menu_items').update({ is_available: !current }).eq('id', id);
    setItems(prev => prev.map(item => (item.id === id ? { ...item, is_available: !current } : item)));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !nameMr || !price) return;
    setUploading(true);

    try {
      const { data: newItem, error } = await supabaseClient
        .from('menu_items')
        .insert({
          restaurant_id: restaurantId,
          category_id: categoryId || null,
          name_mr: nameMr,
          name_hi: nameMr,
          name_en: nameEn || nameMr,
          price: parseFloat(price),
          is_veg: isVeg,
          is_available: true
        })
        .select()
        .single();

      if (newItem) {
        setItems(prev => [newItem, ...prev]);
        setNameMr('');
        setNameEn('');
        setPrice('');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black mb-1">🍲 मेनू व्यवस्थापन</h1>
      <p className="text-xs text-gray-500 mb-6">किंमत बदला, पदार्थ जोडा किंवा एका टॅपने बंद करा</p>

      <form onSubmit={handleAddItem} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
        <h2 className="font-extrabold text-sm mb-4">नवीन पदार्थ जोडा</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="पदार्थाचे नाव (मराठी) *"
            value={nameMr}
            onChange={e => setNameMr(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
          />
          <input
            type="text"
            placeholder="English Name"
            value={nameEn}
            onChange={e => setNameEn(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
          />
          <input
            type="number"
            required
            placeholder="किंमत (₹) *"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
          />
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name_mr}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between mt-4">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={isVeg}
              onChange={e => setIsVeg(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            व्हेज आहे?
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow transition disabled:opacity-50"
          >
            {uploading ? 'जोडत आहे...' : '+ पदार्थ जोडा'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">{item.name_mr} ({item.name_en})</h3>
                <span className="text-xs font-bold text-gray-500">₹{item.price}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleAvailability(item.id, item.is_available)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  item.is_available
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {item.is_available ? 'उपलब्ध आहे ✓' : 'आज उपलब्ध नाही ✕'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

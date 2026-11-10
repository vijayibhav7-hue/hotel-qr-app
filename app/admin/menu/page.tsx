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
  const [imageUrl, setImageUrl] = useState('');
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

  const handleDeleteItem = async (id: string) => {
    if (!confirm('हा पदार्थ मेनूमधून कायमचा हटवायचा आहे का?')) return;
    await supabaseClient.from('menu_items').delete().eq('id', id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !nameMr || !price) return;
    setUploading(true);

    try {
      const { data: newItem } = await supabaseClient
        .from('menu_items')
        .insert({
          restaurant_id: restaurantId,
          category_id: categoryId || null,
          name_mr: nameMr,
          name_hi: nameMr,
          name_en: nameEn || nameMr,
          price: parseFloat(price),
          image_url: imageUrl.trim() || null,
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
        setImageUrl('');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black mb-1">🍲 मेनू व्यवस्थापन</h1>
      <p className="text-xs text-gray-500 mb-6">फोटो, किंमत, नाव जोडा आणि "उपलब्ध नाही" एका टॅपने टॉगल करा</p>

      {/* नवीन पदार्थ फॉर्म */}
      <form onSubmit={handleAddItem} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8 space-y-4">
        <h2 className="font-extrabold text-sm text-gray-900 border-b pb-2">नवीन पदार्थ जोडा</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">पदार्थाचे नाव (मराठी) *</label>
            <input
              type="text"
              required
              placeholder="उदा. बटर डोसा"
              value={nameMr}
              onChange={e => setNameMr(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">नाव (English)</label>
            <input
              type="text"
              placeholder="e.g. Butter Dosa"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">किंमत (₹) *</label>
            <input
              type="number"
              required
              placeholder="उदा. 70"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">श्रेणी (Category)</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name_mr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* फोटो लिंक आणि प्रिव्ह्यू */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              📸 फोटो लिंक (Image URL) - उदा. Google / Unsplash लिंक
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-mono"
            />
          </div>

          {imageUrl && (
            <div className="flex items-center gap-2">
              <img src={imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-gray-200" />
              <span className="text-[10px] text-emerald-600 font-bold">फोटो प्रिव्ह्यू ✓</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={isVeg}
              onChange={e => setIsVeg(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            🟢 व्हेज आहे?
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow transition disabled:opacity-50 cursor-pointer"
          >
            {uploading ? 'जोडत आहे...' : '+ पदार्थ जोडा'}
          </button>
        </div>
      </form>

      {/* मेनू यादी */}
      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name_mr} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl">🍲</div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                  <h3 className="font-extrabold text-sm text-gray-900">{item.name_mr}</h3>
                  {item.name_en && <span className="text-xs text-gray-400">({item.name_en})</span>}
                </div>
                <span className="text-xs font-bold text-orange-600 mt-0.5 block">₹{item.price}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              <button
                onClick={() => handleDeleteItem(item.id)}
                className="text-gray-300 hover:text-red-500 p-2 text-sm cursor-pointer"
                title="हटवा"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

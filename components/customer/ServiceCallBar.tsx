'use client';

import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Language, translations } from '@/lib/translations';

interface Props {
  qrToken: string;
  tableId: string;
  lang: Language;
}

export default function ServiceCallBar({ qrToken, tableId, lang }: Props) {
  const t = translations[lang];
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({
    waiter: 0,
    water: 0,
    bill: 0
  });
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<string | null>(null);

  // काउंटडाउन टाइमर
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns(prev => {
        let changed = false;
        const updated = { ...prev };
        for (const key of ['waiter', 'water', 'bill']) {
          if (updated[key] > 0) {
            updated[key] -= 1;
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Supabase Realtime ने वेटरचा प्रतिसाद ऐकणे
  useEffect(() => {
    if (!tableId) return;
    const channel = supabaseClient
      .channel(`table-service-${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_calls', filter: `table_id=eq.${tableId}` },
        payload => {
          const updated = payload.new as any;
          if (updated.status === 'acknowledged') {
            setCallStatus(t.waiterOnWay);
          } else if (updated.status === 'completed') {
            setCallStatus(t.callResolved);
            setTimeout(() => setCallStatus(null), 4000);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [tableId, t]);

  const handleServiceCall = async (type: 'waiter' | 'water' | 'bill') => {
    if (cooldowns[type] > 0 || loadingType) return;
    setLoadingType(type);

    try {
      const res = await fetch('/api/service-call/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, type })
      });
      const data = await res.json();

      if (res.ok) {
        setCooldowns(prev => ({ ...prev, [type]: 120 }));
        setCallStatus(t.waiterOnWay);
      } else if (data.remainingSeconds) {
        setCooldowns(prev => ({ ...prev, [type]: data.remainingSeconds }));
      }
    } catch {
      // ignore network errors
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-2 shadow-2xl">
      {callStatus && (
        <div className="mb-2 bg-emerald-100 border border-emerald-400 text-emerald-800 text-xs font-semibold py-1 px-3 rounded-full text-center animate-pulse">
          {callStatus}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {/* वेटर बटण */}
        <button
          onClick={() => handleServiceCall('waiter')}
          disabled={cooldowns.waiter > 0 || loadingType === 'waiter'}
          className={`py-2 px-1 text-xs font-bold rounded-xl flex flex-col items-center justify-center transition-all ${
            cooldowns.waiter > 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-50 text-orange-600 border border-orange-200 active:scale-95'
          }`}
        >
          <span>{t.callWaiter}</span>
          {cooldowns.waiter > 0 && <span className="text-[10px] text-gray-500 mt-0.5">{cooldowns.waiter}s</span>}
        </button>

        {/* पाणी बटण */}
        <button
          onClick={() => handleServiceCall('water')}
          disabled={cooldowns.water > 0 || loadingType === 'water'}
          className={`py-2 px-1 text-xs font-bold rounded-xl flex flex-col items-center justify-center transition-all ${
            cooldowns.water > 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 border border-blue-200 active:scale-95'
          }`}
        >
          <span>{t.needWater}</span>
          {cooldowns.water > 0 && <span className="text-[10px] text-gray-500 mt-0.5">{cooldowns.water}s</span>}
        </button>

        {/* बिल बटण */}
        <button
          onClick={() => handleServiceCall('bill')}
          disabled={cooldowns.bill > 0 || loadingType === 'bill'}
          className={`py-2 px-1 text-xs font-bold rounded-xl flex flex-col items-center justify-center transition-all ${
            cooldowns.bill > 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 active:scale-95'
          }`}
        >
          <span>{t.needBill}</span>
          {cooldowns.bill > 0 && <span className="text-[10px] text-gray-500 mt-0.5">{cooldowns.bill}s</span>}
        </button>
      </div>
    </div>
  );
}

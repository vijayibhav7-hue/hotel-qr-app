import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const COOLDOWN_SECONDS = 120;

export async function POST(req: Request) {
  try {
    const { qrToken, type } = await req.json();

    if (!qrToken || !['waiter', 'water', 'bill'].includes(type)) {
      return NextResponse.json({ error: 'अवैध विनंती प्रकार.' }, { status: 400 });
    }

    // १. टेबल ओळखा
    const { data: table, error: tErr } = await supabaseAdmin
      .from('tables')
      .select('id, restaurant_id')
      .eq('qr_token', qrToken)
      .eq('is_active', true)
      .single();

    if (tErr || !table) {
      return NextResponse.json({ error: 'अवैध टेबल.' }, { status: 403 });
    }

    // २. Cooldown तपासा (मागील २ मिनिटांत याच प्रकारची विनंती झाली आहे का?)
    const cooldownLimitTime = new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString();

    const { data: recentCall } = await supabaseAdmin
      .from('service_calls')
      .select('id, requested_at, status')
      .eq('table_id', table.id)
      .eq('type', type)
      .gte('requested_at', cooldownLimitTime)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCall) {
      const elapsed = Math.floor((Date.now() - new Date(recentCall.requested_at).getTime()) / 1000);
      const remaining = Math.max(1, COOLDOWN_SECONDS - elapsed);
      return NextResponse.json({
        error: `कृपया पुन्हा विनंती करण्यासाठी ${remaining} सेकंद प्रतीक्षा करा.`,
        remainingSeconds: remaining,
        status: recentCall.status
      }, { status: 429 });
    }

    // ३. नवीन सेवा विनंती सेव्ह करा
    const { data: newCall, error: insertErr } = await supabaseAdmin
      .from('service_calls')
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        type,
        status: 'pending'
      })
      .select('*')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: 'कॉल नोंदवण्यात अयशस्वी.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      call: newCall,
      cooldownSeconds: COOLDOWN_SECONDS
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

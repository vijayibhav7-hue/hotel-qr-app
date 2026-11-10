import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { orderId, newStatus, staffName } = await req.json();

    const allowedStatuses = ['new', 'accepted', 'preparing', 'ready', 'served', 'rejected'];
    if (!orderId || !allowedStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'अवैध स्टेटस.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // जर कर्मचाऱ्याचे नाव असेल तर नोंद ठेवा
    if (staffName) {
      updatePayload.customer_notes = staffName;
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select('id, status, customer_notes')
      .single();

    if (error) {
      return NextResponse.json({ error: 'स्टेटस अपडेट करता आले नाही.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

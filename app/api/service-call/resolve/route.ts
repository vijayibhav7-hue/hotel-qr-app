import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { callId } = await req.json();

    if (!callId) {
      return NextResponse.json({ error: 'कॉल आयडी आवश्यक आहे.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('service_calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', callId)
      .select('id, status')
      .single();

    if (error) {
      return NextResponse.json({ error: 'कॉल पूर्ण करता आला नाही.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, call: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, restaurant: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, phone, address, upi_id, currency } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'हॉटेलचे नाव आवश्यक आहे.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update({
        name,
        phone,
        address,
        upi_id,
        currency: currency || '₹'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, restaurant: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

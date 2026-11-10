import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface OrderItemRequest {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export async function POST(req: Request) {
  try {
    const { qrToken, items, notes } = await req.json();

    if (!qrToken || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'अवैध डेटा.' }, { status: 400 });
    }

    // १. qr_token तपासा आणि टेबल शोधा
    const { data: table, error: tableErr } = await supabaseAdmin
      .from('tables')
      .select('id, restaurant_id, is_active')
      .eq('qr_token', qrToken)
      .eq('is_active', true)
      .single();

    if (tableErr || !table) {
      return NextResponse.json({ error: 'अवैध टेबल किंवा QR टोकन.' }, { status: 403 });
    }

    // २. मेनू डेटाबेसमधून खरी किंमत मिळवा
    const itemIds = items.map((i: OrderItemRequest) => i.menuItemId);
    const { data: menuDbItems, error: menuErr } = await supabaseAdmin
      .from('menu_items')
      .select('id, name_mr, price, is_available')
      .in('id', itemIds)
      .eq('restaurant_id', table.restaurant_id);

    if (menuErr || !menuDbItems || menuDbItems.length === 0) {
      return NextResponse.json({ error: 'मेनू आयटम्स लोड करण्यात त्रुटी.' }, { status: 400 });
    }

    const menuMap = new Map(menuDbItems.map(m => [m.id, m]));

    // ३. सर्व्हरवर एकूण किंमत मोजा
    let totalAmount = 0;
    const finalOrderItems = [];

    for (const item of items) {
      const dbItem = menuMap.get(item.menuItemId);
      if (!dbItem || !dbItem.is_available) {
        return NextResponse.json({ error: `हा पदार्थ सध्या उपलब्ध नाही: ${dbItem?.name_mr || ''}` }, { status: 400 });
      }

      const qty = Math.max(1, Math.min(item.quantity, 50));
      const unitPrice = Number(dbItem.price);
      const itemTotal = unitPrice * qty;
      totalAmount += itemTotal;

      finalOrderItems.push({
        menu_item_id: dbItem.id,
        item_name: dbItem.name_mr,
        quantity: qty,
        unit_price: unitPrice,
        total_price: itemTotal,
        notes: item.notes || null
      });
    }

    // ४. सक्रिय टेबल सेशन मिळवा किंवा तयार करा
    let { data: session } = await supabaseAdmin
      .from('table_sessions')
      .select('id')
      .eq('table_id', table.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!session) {
      const { data: newSession } = await supabaseAdmin
        .from('table_sessions')
        .insert({ table_id: table.id, restaurant_id: table.restaurant_id, status: 'active' })
        .select('id')
        .single();
      session = newSession;
    }

    // ५. ऑर्डर सेव्ह करा
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        session_id: session?.id,
        status: 'new',
        total_amount: totalAmount,
        customer_notes: notes || null
      })
      .select('id, order_number, total_amount')
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'ऑर्डर तयार करता आली नाही.' }, { status: 500 });
    }

    // ६. ऑर्डर आयटम्स सेव्ह करा
    const itemsToInsert = finalOrderItems.map(i => ({
      ...i,
      order_id: order.id
    }));

    await supabaseAdmin.from('order_items').insert(itemsToInsert);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'सर्व्हर त्रुटी' }, { status: 500 });
  }
}

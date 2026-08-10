const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const body = async (req) => { try { return await req.json(); } catch { return {}; } };
const int = v => Math.max(0, Math.round(Number(v) || 0));
const nowDate = () => new Date().toISOString().slice(0, 10);

async function audit(env, action, entityType, entityId, payload = {}) {
  await env.DB.prepare('INSERT INTO audit_log(action,entity_type,entity_id,payload) VALUES(?,?,?,?)')
    .bind(action, entityType, entityId ?? null, JSON.stringify(payload)).run();
}

async function customers(env, search = '') {
  const like = `%${search.trim()}%`;
  const q = `SELECT c.*,
    COALESCE((SELECT SUM(amount) FROM debts d WHERE d.customer_id=c.id AND d.status!='cancelled'),0) AS total_debt,
    COALESCE((SELECT SUM(amount) FROM payments p WHERE p.customer_id=c.id),0) AS total_paid
    FROM customers c
    WHERE (?='' OR c.name LIKE ? OR c.phone LIKE ?)
    ORDER BY (total_debt-total_paid) DESC, c.name COLLATE NOCASE ASC`;
  const r = await env.DB.prepare(q).bind(search.trim(), like, like).all();
  return (r.results || []).map(x => ({ ...x, balance: Number(x.total_debt) - Number(x.total_paid) }));
}

async function customerDetail(env, id) {
  const c = await env.DB.prepare('SELECT * FROM customers WHERE id=?').bind(id).first();
  if (!c) return null;
  const [debts, payments] = await Promise.all([
    env.DB.prepare("SELECT * FROM debts WHERE customer_id=? AND status!='cancelled' ORDER BY debt_date DESC,id DESC").bind(id).all(),
    env.DB.prepare('SELECT * FROM payments WHERE customer_id=? ORDER BY payment_date DESC,id DESC').bind(id).all()
  ]);
  const d = debts.results || [], p = payments.results || [];
  const totalDebt = d.reduce((s,x)=>s+Number(x.amount),0), totalPaid = p.reduce((s,x)=>s+Number(x.amount),0);
  return { ...c, totalDebt, totalPaid, balance: totalDebt-totalPaid, debts:d, payments:p };
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url), path = u.pathname;
    try {
      if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
      if (request.method === 'GET' && path === '/api/dashboard') {
        const cs = await customers(env, '');
        const totals = cs.reduce((a,c)=>({ debt:a.debt+Number(c.total_debt), paid:a.paid+Number(c.total_paid), balance:a.balance+Number(c.balance) }),{debt:0,paid:0,balance:0});
        return json({ totals, customerCount:cs.length, owingCount:cs.filter(c=>c.balance>0).length, customers:cs });
      }
      if (request.method === 'GET' && path === '/api/customers') return json(await customers(env, u.searchParams.get('q') || ''));
      if (request.method === 'POST' && path === '/api/customers') {
        const b = await body(request); if (!String(b.name||'').trim()) return json({error:'Tên khách hàng là bắt buộc'},400);
        const r = await env.DB.prepare('INSERT INTO customers(name,phone,note) VALUES(?,?,?)').bind(String(b.name).trim(),String(b.phone||'').trim(),String(b.note||'').trim()).run();
        await audit(env,'create','customer',r.meta.last_row_id,b); return json(await customerDetail(env,r.meta.last_row_id),201);
      }
      const customerMatch = path.match(/^\/api\/customers\/(\d+)$/);
      if (customerMatch && request.method === 'GET') { const d=await customerDetail(env,Number(customerMatch[1])); return d?json(d):json({error:'Không tìm thấy khách'},404); }
      if (customerMatch && request.method === 'PUT') {
        const id=Number(customerMatch[1]), b=await body(request); if(!String(b.name||'').trim()) return json({error:'Tên khách hàng là bắt buộc'},400);
        await env.DB.prepare("UPDATE customers SET name=?,phone=?,note=?,updated_at=datetime('now') WHERE id=?").bind(String(b.name).trim(),String(b.phone||'').trim(),String(b.note||'').trim(),id).run();
        await audit(env,'update','customer',id,b); return json(await customerDetail(env,id));
      }
      if (customerMatch && request.method === 'DELETE') {
        const id=Number(customerMatch[1]); await audit(env,'delete','customer',id,await customerDetail(env,id)); await env.DB.prepare('DELETE FROM customers WHERE id=?').bind(id).run(); return json({ok:true});
      }
      if (request.method === 'POST' && path === '/api/debts') {
        const b=await body(request), amount=int(b.amount); if(!b.customer_id||amount<=0) return json({error:'Khách hàng và số tiền phải hợp lệ'},400);
        const r=await env.DB.prepare('INSERT INTO debts(customer_id,amount,item_note,debt_date) VALUES(?,?,?,?)').bind(Number(b.customer_id),amount,String(b.item_note||'').trim(),String(b.debt_date||nowDate())).run();
        await audit(env,'create','debt',r.meta.last_row_id,b); return json(await customerDetail(env,Number(b.customer_id)),201);
      }
      const debtMatch=path.match(/^\/api\/debts\/(\d+)$/);
      if(debtMatch && request.method==='PUT'){
        const id=Number(debtMatch[1]), b=await body(request), old=await env.DB.prepare('SELECT * FROM debts WHERE id=?').bind(id).first(); if(!old) return json({error:'Không tìm thấy khoản nợ'},404);
        const amount=int(b.amount); if(amount<=0) return json({error:'Số tiền phải lớn hơn 0'},400);
        await env.DB.prepare("UPDATE debts SET amount=?,item_note=?,debt_date=?,updated_at=datetime('now') WHERE id=?").bind(amount,String(b.item_note||''),String(b.debt_date||old.debt_date),id).run();
        await audit(env,'update','debt',id,{before:old,after:b}); return json(await customerDetail(env,old.customer_id));
      }
      if(debtMatch && request.method==='DELETE'){
        const id=Number(debtMatch[1]), old=await env.DB.prepare('SELECT * FROM debts WHERE id=?').bind(id).first(); if(!old) return json({error:'Không tìm thấy khoản nợ'},404);
        await env.DB.prepare("UPDATE debts SET status='cancelled',updated_at=datetime('now') WHERE id=?").bind(id).run(); await audit(env,'cancel','debt',id,old); return json(await customerDetail(env,old.customer_id));
      }
      if(request.method==='POST' && path==='/api/payments'){
        const b=await body(request), amount=int(b.amount); if(!b.customer_id||amount<=0) return json({error:'Khách hàng và số tiền phải hợp lệ'},400);
        const r=await env.DB.prepare('INSERT INTO payments(customer_id,debt_id,amount,payment_date,note) VALUES(?,?,?,?,?)').bind(Number(b.customer_id),b.debt_id?Number(b.debt_id):null,amount,String(b.payment_date||nowDate()),String(b.note||'').trim()).run();
        await audit(env,'create','payment',r.meta.last_row_id,b); return json(await customerDetail(env,Number(b.customer_id)),201);
      }
      const payMatch=path.match(/^\/api\/payments\/(\d+)$/);
      if(payMatch && request.method==='DELETE'){
        const id=Number(payMatch[1]), old=await env.DB.prepare('SELECT * FROM payments WHERE id=?').bind(id).first(); if(!old) return json({error:'Không tìm thấy lần trả'},404);
        await env.DB.prepare('DELETE FROM payments WHERE id=?').bind(id).run(); await audit(env,'delete','payment',id,old); return json(await customerDetail(env,old.customer_id));
      }
      return json({error:'API không tồn tại'},404);
    } catch (e) { return json({ error: e.message || 'Lỗi máy chủ' }, 500); }
  }
};

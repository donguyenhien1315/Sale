const SUPABASE_URL = env("SUPABASE_URL","https://kqfqdxmhrsndrgyipybe.supabase.co");
const SUPABASE_KEY = env("SUPABASE_ANON_KEY","sb_publishable_vLPh3dz8y3jHDcXtg1JmgQ_nJF2WdUF");
function env(k,fallback=""){return globalThis.__ENV?.[k]||fallback}
const clone=x=>structuredClone(x);
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d");
const money=n=>Math.max(0,Math.round(Number(n)||0));
const qty=n=>Math.max(0,Number(n)||0);

async function rpc(name,payload){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`},body:JSON.stringify(payload)});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok)throw new Error(data?.message||String(data||"Lỗi Supabase"));return data;
}
function emptyStore(name="Cửa hàng chính"){return {meta:{name,createdAt:now(),version:4},config:{money:{under1000MeansThousands:true},ai:{preview:true},ui:{compactDebt:true}},products:[],customers:[],debts:[],sales:[],stockReceipts:[],audits:[],transactions:[],snapshots:[],aliases:[]}}
function ensureStore(s,name){const x=s&&typeof s==="object"?s:{};const e=emptyStore(name);for(const k of Object.keys(e))if(x[k]===undefined)x[k]=clone(e[k]);for(const k of ["products","customers","debts","sales","stockReceipts","audits","transactions","snapshots","aliases"])if(!Array.isArray(x[k]))x[k]=[];x.meta={...e.meta,...(x.meta||{})};x.config={...e.config,...(x.config||{})};return x}
function normalizeRoot(raw){
  if(raw?.__nextV4===true&&Array.isArray(raw.stores)){raw.stores=raw.stores.map(s=>({...s,data:ensureStore(s.data,s.name)}));if(!raw.stores.length){const id=uid();raw.stores=[{id,name:"Cửa hàng chính",data:emptyStore()}];raw.activeStoreId=id}if(!raw.stores.some(s=>s.id===raw.activeStoreId))raw.activeStoreId=raw.stores[0].id;return raw}
  const id=uid();let seed=raw?.__multiStore&&Array.isArray(raw.stores)?raw.stores.find(s=>s.id===raw.activeStoreId)?.data:raw;seed=ensureStore(seed||{},"Cửa hàng chính");
  return {__nextV4:true,revision:0,activeStoreId:id,stores:[{id,name:seed.meta?.name||"Cửa hàng chính",createdAt:now(),data:seed}],persist:{token:"",writtenAt:""}}
}
async function readRoot(){return normalizeRoot(await rpc("cantin_read_store_public",{}))}
async function writeRoot(root){
  root.revision=(Number(root.revision)||0)+1;const token=uid();root.persist={token,writtenAt:now()};
  await rpc("cantin_write_store_public",{p_data:root});
  for(let i=0;i<3;i++){const check=normalizeRoot(await rpc("cantin_read_store_public",{}));if(check.persist?.token===token)return check;await new Promise(r=>setTimeout(r,100*(i+1)))}
  throw new Error("Supabase chưa xác nhận lưu dữ liệu.");
}
function active(root){return root.stores.find(s=>s.id===root.activeStoreId)||root.stores[0]}
function tx(store,type,summary,changes=[]){const t={id:`TX-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,type,summary,changes,createdAt:now()};store.transactions.push(t);if(store.transactions.length>600)store.transactions=store.transactions.slice(-600);return t}
function snapshot(store,label){const data=clone(store);data.snapshots=[];store.snapshots.push({id:uid(),label,createdAt:now(),data});if(store.snapshots.length>30)store.snapshots=store.snapshots.slice(-30)}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function bad(m,status=400){throw Object.assign(new Error(m),{status})}

function findProduct(store,text){const q=norm(text);for(const a of store.aliases){if(q.includes(norm(a.alias))){const p=store.products.find(x=>x.id===a.productId);if(p)return p}}let best=null,score=0;for(const p of store.products.filter(x=>x.active!==false)){const n=norm(p.name);if(q.includes(n)&&n.length>score){best=p;score=n.length;continue}const words=n.split(/\s+/).filter(w=>w.length>=3),hits=words.filter(w=>q.includes(w));const s=hits.length*10+hits.join("").length;if(s>score){best=p;score=s}}return best}
function findCustomer(store,text){const q=norm(text);let best=null,score=0;for(const c of store.customers){const n=norm(c.name);if(q.includes(n)&&n.length>score){best=c;score=n.length}}return best}
function parseNum(text){const m=norm(text).replace(/\./g,"").match(/(\d+(?:[.,]\d+)?)/);return m?Number(m[1].replace(",",".")):null}
function parseCash(text){const m=String(text).toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(k|nghin|ngàn|ngan|tr|triệu|trieu)?/);if(!m)return null;let n=Number(m[1].replace(",",".")),u=m[2]||"";if(u==="k"||u.includes("ng"))n*=1000;else if(u==="tr"||u.includes("tri"))n*=1e6;else if(n>0&&n<1000)n*=1000;return Math.round(n)}
function customerDebt(store,id){return store.debts.filter(d=>d.customerId===id).reduce((a,d)=>a+(+d.balance||0),0)}
function payDebt(store,id,amount,note=""){let left=amount,applied=0;for(const d of store.debts.filter(d=>d.customerId===id&&d.balance>0).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){const x=Math.min(left,d.balance);if(x<=0)break;d.paid=(+d.paid||0)+x;d.balance=(+d.amount||0)-d.paid;d.payments=d.payments||[];d.payments.push({id:uid(),amount:x,note,createdAt:now()});left-=x;applied+=x}return applied}
function saleTotals(store,items){let total=0,cost=0,lines=[];for(const r of items){const p=store.products.find(x=>x.id===r.productId);if(!p)bad("Không tìm thấy sản phẩm");const q=qty(r.quantity);if(p.trackStock!==false&&q>p.stock)bad(`${p.name} chỉ còn ${p.stock}`);const sub=q*p.salePrice,co=q*p.costPrice;total+=sub;cost+=co;lines.push({productId:p.id,name:p.name,unit:p.unit,category:p.category,quantity:q,unitPrice:p.salePrice,costPrice:p.costPrice,subtotal:sub})}return {lines,total,cost,profit:total-cost}}
function applyAction(root,action,p){
  const st=active(root).data;
  if(action!=="snapshot.create"&&action!=="snapshot.restore"&&action!=="store.switch")snapshot(st,`Trước: ${action}`);
  switch(action){
    case "store.switch": if(!root.stores.some(s=>s.id===p.id))bad("Không tìm thấy cửa hàng");root.activeStoreId=p.id;break;
    case "store.create": {const id=uid(),name=String(p.name||"Cửa hàng mới").trim()||"Cửa hàng mới";root.stores.push({id,name,createdAt:now(),data:emptyStore(name)});root.activeStoreId=id;break}
    case "store.import": {const s=ensureStore(clone(p.store||{}),active(root).name);active(root).data=s;break}
    case "config.import": st.config={...(st.config||{}),...(p.config||{})};if(Array.isArray(p.aliases))st.aliases=clone(p.aliases);tx(st,action,"Nhập cấu hình ứng dụng");break;
    case "customer.create": {const name=String(p.name||"").trim();if(!name)bad("Tên khách trống");if(st.customers.some(c=>norm(c.name)===norm(name)))bad("Khách đã tồn tại");const c={id:uid(),name,createdAt:now(),active:true};st.customers.push(c);tx(st,action,`Thêm khách ${name}`);break}
    case "debt.add": {const c=st.customers.find(c=>c.id===p.customerId);if(!c)bad("Không tìm thấy khách");const amount=money(p.amount);if(!amount)bad("Số tiền không hợp lệ");const d={id:uid(),customerId:c.id,customer:c.name,amount,paid:0,balance:amount,note:String(p.note||""),createdAt:now(),payments:[]};st.debts.push(d);tx(st,action,`Ghi nợ ${c.name}: ${amount.toLocaleString("vi-VN")}đ`);break}
    case "debt.pay": {const c=st.customers.find(c=>c.id===p.customerId);if(!c)bad("Không tìm thấy khách");const a=Math.min(money(p.amount),customerDebt(st,c.id));if(!a)bad("Không có số nợ để trừ");payDebt(st,c.id,a,p.note||"");tx(st,action,`${c.name} trả ${a.toLocaleString("vi-VN")}đ`);break}
    case "debt.update": {const d=st.debts.find(d=>d.id===p.id);if(!d)bad("Không tìm thấy khoản nợ");const a=money(p.amount);if(a<d.paid)bad("Tổng nợ không thể thấp hơn đã trả");d.amount=a;d.balance=a-d.paid;d.note=String(p.note||"");tx(st,action,"Chỉnh khoản nợ");break}
    case "debt.delete": {const i=st.debts.findIndex(d=>d.id===p.id);if(i<0)bad("Không tìm thấy khoản nợ");st.debts.splice(i,1);tx(st,action,"Xóa khoản nợ");break}
    case "product.create": {const x={id:uid(),name:String(p.name||"").trim(),category:String(p.category||"Khác"),unit:String(p.unit||"cái"),packSize:qty(p.packSize)||1,costPrice:money(p.costPrice),salePrice:money(p.salePrice),stock:qty(p.stock),minStock:qty(p.minStock),trackStock:true,active:true};if(!x.name)bad("Tên sản phẩm trống");st.products.push(x);tx(st,action,`Thêm sản phẩm ${x.name}`);break}
    case "product.update": {const x=st.products.find(x=>x.id===p.id);if(!x)bad("Không tìm thấy sản phẩm");Object.assign(x,{name:String(p.name||x.name),category:String(p.category||x.category),unit:String(p.unit||x.unit),packSize:qty(p.packSize)||1,costPrice:money(p.costPrice),salePrice:money(p.salePrice),stock:qty(p.stock),minStock:qty(p.minStock)});tx(st,action,`Sửa sản phẩm ${x.name}`);break}
    case "product.delete": {const i=st.products.findIndex(x=>x.id===p.id);if(i<0)bad("Không tìm thấy sản phẩm");const name=st.products[i].name;st.products.splice(i,1);tx(st,action,`Xóa sản phẩm ${name}`);break}
    case "sale.create": {const t=saleTotals(st,p.items||[]);for(const l of t.lines){const pr=st.products.find(x=>x.id===l.productId);if(pr.trackStock!==false)pr.stock-=l.quantity}const sale={id:uid(),createdAt:p.createdAt||now(),items:t.lines,total:t.total,costTotal:t.cost,profit:t.profit,paymentMethod:p.paymentMethod||"cash",customerId:p.customerId||"",customer:"",note:String(p.note||"")};if(sale.paymentMethod==="debt"){const c=st.customers.find(c=>c.id===sale.customerId);if(!c)bad("Chưa chọn khách");sale.customer=c.name;st.debts.push({id:uid(),customerId:c.id,customer:c.name,amount:t.total,paid:0,balance:t.total,note:`Đơn hàng ${new Date(sale.createdAt).toLocaleDateString("vi-VN")}`,createdAt:sale.createdAt,payments:[],saleId:sale.id})}st.sales.push(sale);tx(st,action,`Bán hàng ${t.total.toLocaleString("vi-VN")}đ`);break}
    case "sale.delete": {const i=st.sales.findIndex(s=>s.id===p.id);if(i<0)bad("Không tìm thấy đơn");const s=st.sales[i];for(const l of s.items){const pr=st.products.find(x=>x.id===l.productId);if(pr?.trackStock!==false)pr.stock+=l.quantity}st.debts=st.debts.filter(d=>d.saleId!==s.id);st.sales.splice(i,1);tx(st,action,"Xóa đơn hàng");break}
    case "stockin.create": {const lines=[];for(const r of p.lines||[]){const pr=st.products.find(x=>x.id===r.productId);if(!pr)continue;const q=qty(r.cases)*(qty(pr.packSize)||1)+qty(r.units);if(!q)continue;const before=pr.stock;pr.stock+=q;lines.push({productId:pr.id,name:pr.name,cases:qty(r.cases),units:qty(r.units),quantity:q,before,after:pr.stock})}if(!lines.length)bad("Phiếu nhập trống");const rec={id:uid(),createdAt:p.createdAt||now(),note:String(p.note||""),lines};st.stockReceipts.push(rec);tx(st,action,`Nhập kho ${lines.reduce((a,l)=>a+l.quantity,0)} đơn vị`);break}
    case "stockin.delete": {const i=st.stockReceipts.findIndex(r=>r.id===p.id);if(i<0)bad("Không tìm thấy phiếu");for(const l of st.stockReceipts[i].lines){const pr=st.products.find(x=>x.id===l.productId);if(pr)pr.stock=Math.max(0,pr.stock-l.quantity)}st.stockReceipts.splice(i,1);tx(st,action,"Xóa phiếu nhập");break}
    case "audit.create": {const lines=[];for(const r of p.lines||[]){const pr=st.products.find(x=>x.id===r.productId);if(!pr)continue;const before=pr.stock,actual=qty(r.actual),sold=Math.max(0,before-actual);pr.stock=actual;lines.push({productId:pr.id,name:pr.name,before,actual,sold})}const a={id:uid(),createdAt:now(),note:String(p.note||""),lines};st.audits.push(a);tx(st,action,`Kiểm kho ${lines.length} mặt hàng`);break}
    case "audit.update": {const a=st.audits.find(a=>a.id===p.id);if(!a)bad("Không tìm thấy đơn kiểm kho");for(const old of a.lines){const pr=st.products.find(x=>x.id===old.productId);if(pr)pr.stock=old.before}const lines=[];for(const r of p.lines||[]){const pr=st.products.find(x=>x.id===r.productId);if(!pr)continue;const before=pr.stock,actual=qty(r.actual);pr.stock=actual;lines.push({productId:pr.id,name:pr.name,before,actual,sold:Math.max(0,before-actual)})}a.lines=lines;a.note=String(p.note||"");tx(st,action,"Chỉnh đơn kiểm kho");break}
    case "audit.delete": {const i=st.audits.findIndex(a=>a.id===p.id);if(i<0)bad("Không tìm thấy đơn");for(const l of st.audits[i].lines){const pr=st.products.find(x=>x.id===l.productId);if(pr)pr.stock=l.before}st.audits.splice(i,1);tx(st,action,"Xóa đơn kiểm kho");break}
    case "snapshot.create": snapshot(st,String(p.label||"Snapshot"));break;
    case "snapshot.restore": {const s=st.snapshots.find(x=>x.id===p.id);if(!s)bad("Không tìm thấy snapshot");const keep=st.snapshots;Object.keys(st).forEach(k=>delete st[k]);Object.assign(st,clone(s.data));st.snapshots=keep;break}
    case "ai.execute": executePlan(st,p.plan,p.message);break;
    default: bad("Action chưa hỗ trợ: "+action)
  }
}
function executePlan(st,plan,message){
  if(plan.kind==="inventory.set"){const pr=st.products.find(x=>x.id===plan.productId);if(!pr)bad("Không tìm thấy sản phẩm");const before=pr.stock;if(before===plan.after){tx(st,"ai.noop",`${pr.name} đã ở mức ${plan.after}`);return}pr.stock=plan.after;const sold=Math.max(0,before-plan.after);if(sold>0){const total=sold*pr.salePrice,cost=sold*pr.costPrice;st.sales.push({id:uid(),createdAt:now(),items:[{productId:pr.id,name:pr.name,unit:pr.unit,quantity:sold,unitPrice:pr.salePrice,costPrice:pr.costPrice,subtotal:total}],total,costTotal:cost,profit:total-cost,paymentMethod:"inventory",note:`AI: ${message}`})}st.audits.push({id:uid(),createdAt:now(),note:`AI: ${message}`,lines:[{productId:pr.id,name:pr.name,before,actual:plan.after,sold}]});tx(st,"ai.inventory",`AI kiểm kho ${pr.name}: ${before} → ${plan.after}`);return}
  if(plan.kind==="stockin"){const pr=st.products.find(x=>x.id===plan.productId);const before=pr.stock;pr.stock+=plan.quantity;st.stockReceipts.push({id:uid(),createdAt:now(),note:`AI: ${message}`,lines:[{productId:pr.id,name:pr.name,quantity:plan.quantity,before,after:pr.stock}]});tx(st,"ai.stockin",`AI nhập ${pr.name} +${plan.quantity}`);return}
  if(plan.kind==="debt.add"){const c=st.customers.find(x=>x.id===plan.customerId);st.debts.push({id:uid(),customerId:c.id,customer:c.name,amount:plan.amount,paid:0,balance:plan.amount,note:plan.note||message,createdAt:now(),payments:[]});tx(st,"ai.debt",`AI ghi nợ ${c.name}: ${plan.amount.toLocaleString("vi-VN")}đ`);return}
  if(plan.kind==="debt.pay"){const c=st.customers.find(x=>x.id===plan.customerId);const a=Math.min(plan.amount,customerDebt(st,c.id));payDebt(st,c.id,a,`AI: ${message}`);tx(st,"ai.payment",`AI ghi nhận ${c.name} trả ${a.toLocaleString("vi-VN")}đ`);return}
  bad("Plan AI chưa hỗ trợ")
}
function answerAI(st,msg){
  const q=norm(msg);
  if(q.includes("sap het")||q.includes("sắp hết")){const a=st.products.filter(p=>p.trackStock!==false&&p.stock<=p.minStock);return a.length?`Sắp hết / đã hết:\n${a.map(p=>`• ${p.name}: ${p.stock} ${p.unit}`).join("\n")}`:"Không có sản phẩm dưới mức tồn tối thiểu."}
  if(q.includes("no nhieu")||q.includes("nợ nhiều")||q.includes("no cao")||q.includes("nợ cao")){const a=st.customers.map(c=>({name:c.name,d:customerDebt(st,c.id)})).sort((a,b)=>b.d-a.d).slice(0,5);return a.map((x,i)=>`${i+1}. ${x.name}: ${x.d.toLocaleString("vi-VN")}đ`).join("\n")}
  if(q.includes("doanh thu hom nay")||q.includes("doanh thu hôm nay")){const day=new Date().toISOString().slice(0,10),v=st.sales.filter(s=>String(s.createdAt).slice(0,10)===day).reduce((a,s)=>a+s.total,0);return `Doanh thu hôm nay: ${v.toLocaleString("vi-VN")}đ`}
  const pr=findProduct(st,msg);if(pr&&q.includes("con bao nhieu"))return `${pr.name} còn ${pr.stock} ${pr.unit}.`;
  return null
}
function planAI(st,msg){
  const direct=answerAI(st,msg);if(direct)return {type:"answer",answer:direct};
  const q=norm(msg),pr=findProduct(st,msg),cu=findCustomer(st,msg);
  if(pr&&(q.includes("ban het")||q.includes("bán hết")||q.includes("het hang")||q.includes("hết hàng")||q.includes("het roi")||q.includes("hết rồi")))return {type:"plan",summary:`Kiểm kho ${pr.name}: ${pr.stock} → 0 ${pr.unit}`,plan:{kind:"inventory.set",productId:pr.id,after:0}};
  if(pr&&(q.includes("kiem kho")||q.includes("kiểm kho")||q.includes(" con ")||q.includes(" còn "))){const n=parseNum(msg);if(n!==null)return {type:"plan",summary:`Kiểm kho ${pr.name}: ${pr.stock} → ${n} ${pr.unit}`,plan:{kind:"inventory.set",productId:pr.id,after:n}}}
  if(pr&&(q.includes("nhap")||q.includes("nhập")||q.includes("ve them")||q.includes("về thêm"))){let n=parseNum(msg);if(n!==null){if(q.includes("thung")||q.includes("thùng")||q.includes("ket")||q.includes("két"))n*=pr.packSize||1;return {type:"plan",summary:`Nhập ${pr.name} +${n} ${pr.unit}`,plan:{kind:"stockin",productId:pr.id,quantity:n}}}}
  if(cu&&(q.includes("no ")||q.includes("nợ ")||q.includes("ghi no")||q.includes("ghi nợ"))){const a=parseCash(msg);if(a)return {type:"plan",summary:`Ghi nợ ${cu.name}: ${a.toLocaleString("vi-VN")}đ`,plan:{kind:"debt.add",customerId:cu.id,amount:a,note:msg}}}
  if(cu&&(q.includes("tra ")||q.includes("trả ")||q.includes("tra no")||q.includes("trả nợ"))){const a=parseCash(msg);if(a)return {type:"plan",summary:`${cu.name} trả ${a.toLocaleString("vi-VN")}đ`,plan:{kind:"debt.pay",customerId:cu.id,amount:a}}}
  return {type:"answer",answer:"Tôi chưa hiểu chắc câu này. Hãy nói rõ tên sản phẩm/khách hàng và số lượng hoặc số tiền."}
}

export async function onRequest(context){
  globalThis.__ENV=context.env||{};
  const url=new URL(context.request.url),path=url.pathname,req=context.request;
  try{
    if(path==="/api/bootstrap"&&req.method==="GET"){const root=await readRoot(),s=active(root);return json({revision:root.revision||0,storeId:s.id,store:s.data,stores:root.stores.map(x=>({id:x.id,name:x.name}))})}
    if(path==="/api/action"&&req.method==="POST"){const body=await req.json(),root=await readRoot();if(Number(body.revision)!==Number(root.revision||0))bad("Dữ liệu vừa thay đổi ở thiết bị khác. Hãy đồng bộ lại.",409);applyAction(root,body.action,body.payload||{});const saved=await writeRoot(root),s=active(saved);return json({ok:true,revision:saved.revision,storeId:s.id,store:s.data,stores:saved.stores.map(x=>({id:x.id,name:x.name}))})}
    if(path==="/api/ai/plan"&&req.method==="POST"){const body=await req.json(),root=await readRoot(),s=root.stores.find(x=>x.id===body.storeId)||active(root);return json(planAI(s.data,String(body.message||"")))}
    if(path==="/api/package/validate"&&req.method==="POST"){const body=await req.json();if(body.format!=="cantin-ai-node-json")bad("Không phải gói Cantin AI");if(!Array.isArray(body.files)||!body.files.length)bad("Gói không có file");return json({ok:true,version:body.version||"không rõ",fileCount:body.files.length})}
    return json({error:"Không tìm thấy API"},404)
  }catch(e){return json({error:e.message||"Lỗi máy chủ"},e.status||500)}
}
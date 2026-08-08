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
function emptyStore(name="Cửa hàng chính"){return {meta:{name,createdAt:now(),version:"5.2.1"},config:{money:{under1000MeansThousands:true},ai:{preview:true},ui:{compactDebt:true}},products:[],expenses:[],suppliers:[],payables:[],budgets:[],ingredients:[{"id": "ing-ca-phe-phin", "name": "Cà phê phin", "purchasePrice": 1085000, "packageQty": 7000, "unit": "g", "unitCost": 155, "stock": 0, "note": "240g pha được 500ml cà phê phin"}, {"id": "ing-ca-phe-may", "name": "Cà phê máy", "purchasePrice": 234000, "packageQty": 1000, "unit": "g", "unitCost": 234, "stock": 0, "note": "Tạm tính gói 1kg; sửa nếu khác"}, {"id": "ing-bot-kem-muoi", "name": "Bột kem muối", "purchasePrice": 80000, "packageQty": 500, "unit": "g", "unitCost": 160, "stock": 0, "note": "Người dùng cung cấp"}, {"id": "ing-sua-dac", "name": "Sữa đặc", "purchasePrice": 450000, "packageQty": 9120, "unit": "ml", "unitCost": 49.3421052632, "stock": 0, "note": "24 hộp x 380ml"}, {"id": "ing-sua-tuoi", "name": "Sữa tươi", "purchasePrice": 35000, "packageQty": 1000, "unit": "ml", "unitCost": 35, "stock": 0, "note": "1 lít giá 35.000"}, {"id": "ing-duong", "name": "Đường", "purchasePrice": 25000, "packageQty": 1000, "unit": "g", "unitCost": 25, "stock": 0, "note": "Tạm tính 25.000/kg; sửa theo thực tế"}],customers:[],debts:[],sales:[],stockReceipts:[],audits:[],transactions:[],snapshots:[],aliases:[]}}
function ensureStore(s,name){const x=s&&typeof s==="object"?s:{};const e=emptyStore(name);for(const k of Object.keys(e))if(x[k]===undefined)x[k]=clone(e[k]);for(const k of ["products","ingredients","customers","debts","sales","stockReceipts","audits","expenses","suppliers","payables","budgets","transactions","snapshots","aliases"])if(!Array.isArray(x[k]))x[k]=[];x.meta={...e.meta,...(x.meta||{})};x.config={...e.config,...(x.config||{})};if(!Array.isArray(x.ingredients)||!x.ingredients.length)x.ingredients=clone([{"id": "ing-ca-phe-phin", "name": "Cà phê phin", "purchasePrice": 1085000, "packageQty": 7000, "unit": "g", "unitCost": 155, "stock": 0, "note": "240g pha được 500ml cà phê phin"}, {"id": "ing-ca-phe-may", "name": "Cà phê máy", "purchasePrice": 234000, "packageQty": 1000, "unit": "g", "unitCost": 234, "stock": 0, "note": "Tạm tính gói 1kg; sửa nếu khác"}, {"id": "ing-bot-kem-muoi", "name": "Bột kem muối", "purchasePrice": 80000, "packageQty": 500, "unit": "g", "unitCost": 160, "stock": 0, "note": "Người dùng cung cấp"}, {"id": "ing-sua-dac", "name": "Sữa đặc", "purchasePrice": 450000, "packageQty": 9120, "unit": "ml", "unitCost": 49.3421052632, "stock": 0, "note": "24 hộp x 380ml"}, {"id": "ing-sua-tuoi", "name": "Sữa tươi", "purchasePrice": 35000, "packageQty": 1000, "unit": "ml", "unitCost": 35, "stock": 0, "note": "1 lít giá 35.000"}, {"id": "ing-duong", "name": "Đường", "purchasePrice": 25000, "packageQty": 1000, "unit": "g", "unitCost": 25, "stock": 0, "note": "Tạm tính 25.000/kg; sửa theo thực tế"}]);for(const i of x.ingredients)i.category=i.category||"Nguyên liệu cà phê";
for(const r of x.stockReceipts){
  if(!r.createdAt||Number.isNaN(Date.parse(r.createdAt))){
    r.createdAt=r.date&& !Number.isNaN(Date.parse(r.date))?new Date(r.date).toISOString():now();
  }
}
for(const p of x.products){
  const pack=Math.max(1,qty(p.packSize)||1);
  const legacyPack=money(p.purchasePrice||0);
  let packPrice=money(p.purchasePackPrice||0);
  if(!packPrice&&legacyPack>0)packPrice=legacyPack;
  if(!packPrice){
    const cp=money(p.costPrice||0),uc=money(p.unitCost||0);
    if(cp>0){
      const looksUnit=pack>1&&((uc>0&&Math.abs(cp-uc)<=Math.max(1,uc*.03))||(money(p.salePrice||0)>0&&cp<money(p.salePrice)*1.25));
      packPrice=looksUnit?cp*pack:cp;
    }else if(uc>0)packPrice=uc*pack;
  }
  if(packPrice>0){
    p.purchasePackPrice=packPrice;
    p.purchasePrice=packPrice;
    p.costPrice=packPrice;
    p.unitCost=packPrice/pack;
    p.priceModelVersion=2;
  }
}
return x}
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
function payDebt(store,id,amount,note="",createdAt=now()){let left=amount,applied=0;for(const d of store.debts.filter(d=>d.customerId===id&&d.balance>0).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){const x=Math.min(left,d.balance);if(x<=0)break;d.paid=(+d.paid||0)+x;d.balance=(+d.amount||0)-d.paid;d.payments=d.payments||[];d.payments.push({id:uid(),amount:x,note,createdAt});left-=x;applied+=x}return applied}
function saleTotals(store,items){let total=0,cost=0,lines=[];for(const r of items){const p=store.products.find(x=>x.id===r.productId);if(!p)bad("Không tìm thấy sản phẩm");const q=qty(r.quantity);if(p.trackStock!==false&&q>p.stock)bad(`${p.name} chỉ còn ${p.stock}`);const pack=Math.max(1,qty(p.packSize)||1);const packCost=money(p.purchasePackPrice||p.purchasePrice||p.costPrice||p.cost||0);const unitCost=packCost>0?packCost/pack:money(p.unitCost||0);const sub=q*p.salePrice,co=q*unitCost;total+=sub;cost+=co;lines.push({productId:p.id,name:p.name,unit:p.unit,category:p.category,quantity:q,unitPrice:p.salePrice,packCost,unitCost,costPrice:unitCost,subtotal:sub,cost:co})}return {lines,total,cost,profit:total-cost}}
function applyAction(root,action,p){
  const st=active(root).data;
  if(action!=="snapshot.create"&&action!=="snapshot.restore"&&action!=="store.switch")snapshot(st,`Trước: ${action}`);
  switch(action){
    case "store.switch": if(!root.stores.some(s=>s.id===p.id))bad("Không tìm thấy cửa hàng");root.activeStoreId=p.id;break;
    case "store.create": {const id=uid(),name=String(p.name||"Cửa hàng mới").trim()||"Cửa hàng mới";root.stores.push({id,name,createdAt:now(),data:emptyStore(name)});root.activeStoreId=id;break}
    case "store.import": {const s=ensureStore(clone(p.store||{}),active(root).name);active(root).data=s;break}
    case "config.import": st.config={...(st.config||{}),...(p.config||{})};if(Array.isArray(p.aliases))st.aliases=clone(p.aliases);tx(st,action,"Nhập cấu hình ứng dụng");break;
    case "customer.create": {const name=String(p.name||"").trim();if(!name)bad("Tên khách trống");if(st.customers.some(c=>norm(c.name)===norm(name)))bad("Khách đã tồn tại");const c={id:uid(),name,createdAt:now(),active:true};st.customers.push(c);tx(st,action,`Thêm khách ${name}`);break}
    case "debt.add": {const c=st.customers.find(c=>c.id===p.customerId);if(!c)bad("Không tìm thấy khách");const amount=money(p.amount);if(!amount)bad("Số tiền không hợp lệ");const d={id:uid(),customerId:c.id,customer:c.name,amount,paid:0,balance:amount,note:String(p.note||""),createdAt:p.createdAt||now(),payments:[]};st.debts.push(d);tx(st,action,`Ghi nợ ${c.name}: ${amount.toLocaleString("vi-VN")}đ`);break}
    case "debt.pay": {const c=st.customers.find(c=>c.id===p.customerId);if(!c)bad("Không tìm thấy khách");const a=Math.min(money(p.amount),customerDebt(st,c.id));if(!a)bad("Không có số nợ để trừ");payDebt(st,c.id,a,p.note||"",p.createdAt||now());tx(st,action,`${c.name} trả ${a.toLocaleString("vi-VN")}đ`);break}
    case "debt.update": {const d=st.debts.find(d=>d.id===p.id);if(!d)bad("Không tìm thấy khoản nợ");const a=money(p.amount);if(a<d.paid)bad("Tổng nợ không thể thấp hơn đã trả");d.amount=a;d.balance=a-d.paid;d.note=String(p.note||"");if(p.createdAt)d.createdAt=p.createdAt;tx(st,action,"Chỉnh khoản nợ");break}
    case "debt.delete": {const i=st.debts.findIndex(d=>d.id===p.id);if(i<0)bad("Không tìm thấy khoản nợ");st.debts.splice(i,1);tx(st,action,"Xóa khoản nợ");break}

    case "debt.payment.update": {const d=st.debts.find(d=>d.id===p.debtId);if(!d)bad("Không tìm thấy khoản nợ");const pay=(d.payments||[]).find(x=>x.id===p.paymentId);if(!pay)bad("Không tìm thấy lần trả");const old=money(pay.amount),next=money(p.amount);const newPaid=(+d.paid||0)-old+next;if(newPaid>d.amount)bad("Tổng tiền đã trả không thể lớn hơn khoản nợ");pay.amount=next;pay.note=String(p.note||"");if(p.createdAt)pay.createdAt=p.createdAt;d.paid=newPaid;d.balance=d.amount-newPaid;tx(st,action,"Chỉnh chi tiết lần trả nợ");break}
    case "debt.payment.delete": {const d=st.debts.find(d=>d.id===p.debtId);if(!d)bad("Không tìm thấy khoản nợ");const i=(d.payments||[]).findIndex(x=>x.id===p.paymentId);if(i<0)bad("Không tìm thấy lần trả");const removed=d.payments.splice(i,1)[0];d.paid=Math.max(0,(+d.paid||0)-(+removed.amount||0));d.balance=d.amount-d.paid;tx(st,action,"Xóa chi tiết lần trả nợ");break}
    case "ingredient.create": {const x={id:uid(),name:String(p.name||"").trim(),category:String(p.category||"Nguyên liệu cà phê"),unit:String(p.unit||"g").trim()||"g",purchasePrice:money(p.purchasePrice),packageQty:qty(p.packageQty)||1,unitCost:0,stock:qty(p.stock),note:String(p.note||"")};if(!x.name)bad("Tên nguyên liệu trống");x.unitCost=x.purchasePrice/x.packageQty;st.ingredients.push(x);tx(st,action,`Thêm nguyên liệu ${x.name}`);break}
    case "ingredient.update": {const x=st.ingredients.find(x=>x.id===p.id);if(!x)bad("Không tìm thấy nguyên liệu");x.name=String(p.name||x.name).trim();x.category=String(p.category||x.category||"Nguyên liệu cà phê");x.unit=String(p.unit||x.unit).trim();x.purchasePrice=money(p.purchasePrice);x.packageQty=qty(p.packageQty)||1;x.unitCost=x.purchasePrice/x.packageQty;x.stock=qty(p.stock);x.note=String(p.note||"");tx(st,action,`Sửa nguyên liệu ${x.name}`);break}
    case "ingredient.delete": {const i=st.ingredients.findIndex(x=>x.id===p.id);if(i<0)bad("Không tìm thấy nguyên liệu");const name=st.ingredients[i].name;st.ingredients.splice(i,1);tx(st,action,`Xóa nguyên liệu ${name}`);break}
    case "supplier.create": {const x={id:uid(),name:String(p.name||"").trim(),phone:String(p.phone||"")};if(!x.name)bad("Tên nhà cung cấp trống");st.suppliers.push(x);tx(st,action,`Thêm nhà cung cấp ${x.name}`);break}
    case "supplier.pay": {let remain=money(p.amount);if(remain<=0)bad("Số tiền không hợp lệ");const s=st.suppliers.find(x=>x.id===p.supplierId);if(!s)bad("Không tìm thấy nhà cung cấp");const ps=st.payables.filter(x=>x.supplierId===s.id&&x.status!=="paid").sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));for(const x of ps){if(remain<=0)break;const use=Math.min(remain,money(x.balance));x.balance-=use;remain-=use;if(x.balance<=0){x.balance=0;x.status="paid"}}const paid=money(p.amount)-remain;if(paid<=0)bad("Không có khoản phải trả");st.expenses.push({id:uid(),type:"supplier_payment",method:String(p.method||"cash"),amount:paid,note:`Thanh toán nhà cung cấp ${s.name}`,includeInProfit:false,createdAt:now()});tx(st,action,`Thanh toán nhà cung cấp ${s.name}: ${paid}`);break}
    case "budget.create": {const x={id:uid(),name:String(p.name||"").trim(),type:String(p.type||"manual"),limit:money(p.limit)};if(!x.name||x.limit<=0)bad("Ngân sách không hợp lệ");st.budgets.push(x);tx(st,action,`Thêm ngân sách ${x.name}`);break}
    case "budget.delete": {const i=st.budgets.findIndex(x=>x.id===p.id);if(i<0)bad("Không tìm thấy ngân sách");st.budgets.splice(i,1);tx(st,action,"Xóa ngân sách");break}
    case "expense.create": {const x={id:uid(),type:String(p.type||"manual"),method:String(p.method||"cash"),amount:money(p.amount),note:String(p.note||""),includeInProfit:true,createdAt:p.createdAt||now()};if(x.amount<=0)bad("Số tiền chi không hợp lệ");st.expenses.push(x);tx(st,action,`Thêm khoản chi ${x.amount}`);break}
    case "expense.update": {const x=st.expenses.find(x=>x.id===p.id&&x.type!=="stockin");if(!x)bad("Không tìm thấy khoản chi");x.type=String(p.type||x.type||"manual");x.method=String(p.method||x.method||"cash");x.amount=money(p.amount);x.note=String(p.note||"");x.includeInProfit=true;if(p.createdAt)x.createdAt=p.createdAt;tx(st,action,"Chỉnh khoản chi");break}
    case "expense.delete": {const i=st.expenses.findIndex(x=>x.id===p.id&&x.type!=="stockin");if(i<0)bad("Không tìm thấy khoản chi");st.expenses.splice(i,1);tx(st,action,"Xóa khoản chi");break}
    case "product.stock.set": {
      const x=st.products.find(x=>x.id===p.id);if(!x)bad("Không tìm thấy sản phẩm");
      const before=qty(x.stock),after=qty(p.stock);x.stock=after;
      tx(st,action,`Điều chỉnh tồn độc lập ${x.name}: ${before} → ${after} ${x.unit||""}`,[{productId:x.id,before,after,note:String(p.note||"")}]);
      break
    }
    case "product.create": {const x={id:uid(),name:String(p.name||"").trim(),category:String(p.category||"Khác"),unit:String(p.unit||"cái"),packSize:qty(p.packSize)||1,costPrice:money(p.costPrice),purchasePrice:money(p.costPrice),purchasePackPrice:money(p.costPrice),unitCost:(money(p.costPrice)/(qty(p.packSize)||1)),salePrice:money(p.salePrice),stock:qty(p.stock),minStock:qty(p.minStock),trackStock:true,active:true};if(!x.name)bad("Tên sản phẩm trống");st.products.push(x);tx(st,action,`Thêm sản phẩm ${x.name}`);break}
    case "product.update": {const x=st.products.find(x=>x.id===p.id);if(!x)bad("Không tìm thấy sản phẩm");Object.assign(x,{name:String(p.name||x.name),category:String(p.category||x.category),unit:String(p.unit||x.unit),packSize:qty(p.packSize)||1,costPrice:money(p.costPrice),purchasePrice:money(p.costPrice),purchasePackPrice:money(p.costPrice),unitCost:(money(p.costPrice)/(qty(p.packSize)||1)),salePrice:money(p.salePrice),stock:qty(p.stock),minStock:qty(p.minStock)});tx(st,action,`Sửa sản phẩm ${x.name}`);break}
    case "product.delete": {const i=st.products.findIndex(x=>x.id===p.id);if(i<0)bad("Không tìm thấy sản phẩm");const name=st.products[i].name;st.products.splice(i,1);tx(st,action,`Xóa sản phẩm ${name}`);break}
    case "sale.create": {const t=saleTotals(st,p.items||[]);for(const l of t.lines){const pr=st.products.find(x=>x.id===l.productId);if(pr.trackStock!==false)pr.stock-=l.quantity}const sale={id:uid(),createdAt:p.createdAt||now(),items:t.lines,total:t.total,costTotal:t.cost,profit:t.profit,paymentMethod:p.paymentMethod||"cash",customerId:p.customerId||"",customer:"",note:String(p.note||"")};if(sale.paymentMethod==="debt"){const c=st.customers.find(c=>c.id===sale.customerId);if(!c)bad("Chưa chọn khách");sale.customer=c.name;st.debts.push({id:uid(),customerId:c.id,customer:c.name,amount:t.total,paid:0,balance:t.total,note:`Đơn hàng ${new Date(sale.createdAt).toLocaleDateString("vi-VN")}`,createdAt:sale.createdAt,payments:[],saleId:sale.id})}st.sales.push(sale);tx(st,action,`Bán hàng ${t.total.toLocaleString("vi-VN")}đ`);break}
    case "sale.delete": {const i=st.sales.findIndex(s=>s.id===p.id);if(i<0)bad("Không tìm thấy đơn");const s=st.sales[i];for(const l of s.items){const pr=st.products.find(x=>x.id===l.productId);if(pr?.trackStock!==false)pr.stock+=l.quantity}st.debts=st.debts.filter(d=>d.saleId!==s.id);st.sales.splice(i,1);tx(st,action,"Xóa đơn hàng");break}
    case "stockin.create": {
      const r={id:uid(),createdAt:p.createdAt||now(),note:String(p.note||""),lines:[],totalCost:0};
      for(const l of (p.lines||[])){
        const pr=st.products.find(x=>x.id===l.productId);if(!pr)continue;
        const pack=Math.max(1,qty(l.packSize||pr.packSize)||1);
        const cases=qty(l.cases),units=qty(l.units);
        const q=qty(l.qty||((cases*pack)+units));if(q<=0)continue;
        const packCost=money(l.packCost||l.caseCost||pr.purchasePackPrice||pr.purchasePrice||pr.costPrice||pr.cost||0);
        const unitCost=packCost>0?packCost/pack:money(l.unitCost||pr.unitCost||0);
        const lineCost=money(l.cost||((cases*packCost)+(units*unitCost)));
        pr.stock=qty(pr.stock)+q;
        if(packCost>0){pr.costPrice=packCost;pr.purchasePrice=packCost;pr.purchasePackPrice=packCost;pr.unitCost=unitCost;pr.priceModelVersion=2;}
        r.lines.push({productId:pr.id,qty:q,cases,units,packSize:pack,packCost,unitCost,cost:lineCost});
        r.totalCost+=lineCost;
      }
      if(!r.lines.length)bad("Phiếu nhập không có mặt hàng");
      r.supplierId=String(p.supplierId||"");r.paymentStatus=String(p.paymentStatus||"paid");r.method=String(p.method||"cash");
      st.stockReceipts.push(r);
      if(r.totalCost>0){
        if(r.paymentStatus==="unpaid")st.payables.push({id:uid(),supplierId:r.supplierId,sourceId:r.id,amount:r.totalCost,balance:r.totalCost,status:"unpaid",createdAt:r.createdAt,note:r.note});
        else st.expenses.push({id:uid(),type:"stockin",method:r.method,sourceId:r.id,amount:r.totalCost,note:`Nhập kho${r.note?": "+r.note:""}`,includeInProfit:false,paymentStatus:"paid",createdAt:r.createdAt});
      }
      tx(st,action,`Nhập kho ${r.lines.length} mặt hàng · chi ${r.totalCost}`);
      break}
    case "stockin.update": {
      const r=st.stockReceipts.find(x=>x.id===p.id);if(!r)bad("Không tìm thấy phiếu nhập");
      const oldLines=clone(r.lines||[]);
      // Undo old stock effect
      for(const l of oldLines){const pr=st.products.find(x=>x.id===l.productId);if(pr)pr.stock=Math.max(0,qty(pr.stock)-qty(l.qty));}
      // Remove linked finance records
      st.expenses=st.expenses.filter(e=>!(e.type==="stockin"&&e.sourceId===r.id));
      st.payables=st.payables.filter(x=>x.sourceId!==r.id);
      // Apply new lines
      const newLines=[];let totalCost=0;
      for(const l of (p.lines||[])){
        const pr=st.products.find(x=>x.id===l.productId);if(!pr)continue;
        const pack=Math.max(1,qty(l.packSize||pr.packSize)||1),cases=qty(l.cases),units=qty(l.units),q=qty(l.qty||cases*pack+units);if(q<=0)continue;
        const packCost=money(l.packCost||pr.purchasePackPrice||pr.purchasePrice||pr.costPrice||0),unitCost=packCost>0?packCost/pack:money(l.unitCost||pr.unitCost||0),cost=money(l.cost||cases*packCost+units*unitCost);
        pr.stock=qty(pr.stock)+q;
        if(packCost>0){pr.costPrice=packCost;pr.purchasePrice=packCost;pr.purchasePackPrice=packCost;pr.unitCost=unitCost;pr.priceModelVersion=2;}
        newLines.push({productId:pr.id,qty:q,cases,units,packSize:pack,packCost,unitCost,cost});totalCost+=cost;
      }
      if(!newLines.length)bad("Phiếu nhập không có mặt hàng");
      r.lines=newLines;r.totalCost=totalCost;r.createdAt=p.createdAt||r.createdAt||now();r.note=String(p.note||"");r.supplierId=String(p.supplierId||"");r.paymentStatus=String(p.paymentStatus||"paid");r.method=String(p.method||"cash");
      if(totalCost>0){
        if(r.paymentStatus==="unpaid")st.payables.push({id:uid(),supplierId:r.supplierId,sourceId:r.id,amount:totalCost,balance:totalCost,status:"unpaid",createdAt:r.createdAt,note:r.note});
        else st.expenses.push({id:uid(),type:"stockin",method:r.method,sourceId:r.id,amount:totalCost,note:`Nhập kho${r.note?": "+r.note:""}`,includeInProfit:false,paymentStatus:"paid",createdAt:r.createdAt});
      }
      tx(st,action,`Chỉnh phiếu nhập ${newLines.length} mặt hàng · ${totalCost}`);
      break}
    case "stockin.delete": {
      const i=st.stockReceipts.findIndex(x=>x.id===p.id);if(i<0)bad("Không tìm thấy phiếu nhập");
      const r=st.stockReceipts[i];
      for(const l of (r.lines||[])){const pr=st.products.find(x=>x.id===l.productId);if(pr)pr.stock=Math.max(0,qty(pr.stock)-qty(l.qty));}
      st.stockReceipts.splice(i,1);
      st.expenses=st.expenses.filter(e=>!(e.type==="stockin"&&e.sourceId===r.id));st.payables=st.payables.filter(x=>x.sourceId!==r.id);
      tx(st,action,"Xóa phiếu nhập và khoản CHI liên kết");
      break}
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
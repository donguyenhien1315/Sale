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
async function readRootRaw(){
  const v=await rpc("cantin_read_store_public",{});
  if(Array.isArray(v)&&v.length===1){
    const row=v[0];
    if(row&&typeof row==="object"){
      const keys=Object.keys(row);
      if(keys.length===1&&row[keys[0]]&&typeof row[keys[0]]==="object")return row[keys[0]];
    }
  }
  return v;
}

function emptyStore(name="Cửa hàng chính"){return {meta:{name,createdAt:now(),version:"4.10"},config:{money:{under1000MeansThousands:true},ai:{preview:true},ui:{compactDebt:true}},products:[],ingredients:[{"id": "ing-ca-phe-phin", "name": "Cà phê phin", "purchasePrice": 1085000, "packageQty": 7000, "unit": "g", "unitCost": 155, "stock": 0, "note": "240g pha được 500ml cà phê phin"}, {"id": "ing-ca-phe-may", "name": "Cà phê máy", "purchasePrice": 234000, "packageQty": 1000, "unit": "g", "unitCost": 234, "stock": 0, "note": "Tạm tính gói 1kg; sửa nếu khác"}, {"id": "ing-bot-kem-muoi", "name": "Bột kem muối", "purchasePrice": 80000, "packageQty": 500, "unit": "g", "unitCost": 160, "stock": 0, "note": "Người dùng cung cấp"}, {"id": "ing-sua-dac", "name": "Sữa đặc", "purchasePrice": 450000, "packageQty": 9120, "unit": "ml", "unitCost": 49.3421052632, "stock": 0, "note": "24 hộp x 380ml"}, {"id": "ing-sua-tuoi", "name": "Sữa tươi", "purchasePrice": 35000, "packageQty": 1000, "unit": "ml", "unitCost": 35, "stock": 0, "note": "1 lít giá 35.000"}, {"id": "ing-duong", "name": "Đường", "purchasePrice": 25000, "packageQty": 1000, "unit": "g", "unitCost": 25, "stock": 0, "note": "Tạm tính 25.000/kg; sửa theo thực tế"}],customers:[],debts:[],sales:[],stockReceipts:[],audits:[],transactions:[],snapshots:[],aliases:[]}}
function ensureStore(s,name){const x=s&&typeof s==="object"?s:{};const e=emptyStore(name);for(const k of Object.keys(e))if(x[k]===undefined)x[k]=clone(e[k]);for(const k of ["products","ingredients","customers","debts","sales","stockReceipts","audits","transactions","snapshots","aliases"])if(!Array.isArray(x[k]))x[k]=[];x.meta={...e.meta,...(x.meta||{})};x.config={...e.config,...(x.config||{})};if(!Array.isArray(x.ingredients)||!x.ingredients.length)x.ingredients=clone([{"id": "ing-ca-phe-phin", "name": "Cà phê phin", "purchasePrice": 1085000, "packageQty": 7000, "unit": "g", "unitCost": 155, "stock": 0, "note": "240g pha được 500ml cà phê phin"}, {"id": "ing-ca-phe-may", "name": "Cà phê máy", "purchasePrice": 234000, "packageQty": 1000, "unit": "g", "unitCost": 234, "stock": 0, "note": "Tạm tính gói 1kg; sửa nếu khác"}, {"id": "ing-bot-kem-muoi", "name": "Bột kem muối", "purchasePrice": 80000, "packageQty": 500, "unit": "g", "unitCost": 160, "stock": 0, "note": "Người dùng cung cấp"}, {"id": "ing-sua-dac", "name": "Sữa đặc", "purchasePrice": 450000, "packageQty": 9120, "unit": "ml", "unitCost": 49.3421052632, "stock": 0, "note": "24 hộp x 380ml"}, {"id": "ing-sua-tuoi", "name": "Sữa tươi", "purchasePrice": 35000, "packageQty": 1000, "unit": "ml", "unitCost": 35, "stock": 0, "note": "1 lít giá 35.000"}, {"id": "ing-duong", "name": "Đường", "purchasePrice": 25000, "packageQty": 1000, "unit": "g", "unitCost": 25, "stock": 0, "note": "Tạm tính 25.000/kg; sửa theo thực tế"}]);for(const i of x.ingredients)i.category=i.category||"Nguyên liệu cà phê";return x}

function dataWeight(root){
  try{
    return (root.stores||[]).reduce((sum,s)=>{
      const d=s.data||{};
      return sum+(d.products?.length||0)+(d.customers?.length||0)+(d.debts?.length||0)+(d.sales?.length||0)+(d.audits?.length||0)+(d.stockReceipts?.length||0);
    },0)
  }catch{return 0}
}

function normalizeLegacyStore(input,name="Cửa hàng chính"){
  const src=clone(input||{});
  const out=ensureStore(src);
  out.meta={...(out.meta||{}),name:out.meta?.name||name,version:"4.10"};
  // Preserve legacy arrays instead of dropping them.
  if((!Array.isArray(out.audits)||!out.audits.length)&&Array.isArray(src.weeklyAudits)){
    out.audits=src.weeklyAudits.map(a=>({
      id:a.id||uid(),
      createdAt:a.createdAt||now(),
      note:a.note||"Kiểm kho cũ",
      source:a.source||"legacy_weekly_audit",
      lines:(a.lines||[]).map(l=>({
        productId:l.productId||"",
        name:l.name||"",
        unit:l.unit||"",
        before:Number(l.stockBefore ?? l.openingStock ?? l.recordedQty ?? 0),
        actual:Number(l.endingStock ?? l.recordedQty ?? 0),
        delta:Number((l.endingStock ?? l.recordedQty ?? 0)-(l.stockBefore ?? l.openingStock ?? l.recordedQty ?? 0))
      }))
    }));
  }
  if(!Array.isArray(out.stockAdjustments)&&Array.isArray(src.stockAdjustments))out.stockAdjustments=clone(src.stockAdjustments);
  if(!Array.isArray(out.weeklyAudits)&&Array.isArray(src.weeklyAudits))out.weeklyAudits=clone(src.weeklyAudits);
  if(!Array.isArray(out.weeklyTemplate)&&Array.isArray(src.weeklyTemplate))out.weeklyTemplate=clone(src.weeklyTemplate);
  return out;
}
function normalizeRoot(raw){
  // Already v4 root: preserve every store.
  if(raw&&raw.__nextV4&&Array.isArray(raw.stores)&&raw.stores.length){
    const stores=raw.stores.map((s,i)=>({
      id:s.id||uid(),
      name:s.name||s.data?.meta?.name||`Cửa hàng ${i+1}`,
      createdAt:s.createdAt||now(),
      data:normalizeLegacyStore(s.data||{},s.name||`Cửa hàng ${i+1}`)
    }));
    const activeStoreId=stores.some(s=>s.id===raw.activeStoreId)?raw.activeStoreId:stores[0].id;
    return {...raw,__nextV4:true,revision:Number(raw.revision)||0,activeStoreId,stores};
  }

  // Legacy multi-store v2/v3: preserve ALL stores, not only active store.
  if(raw&&raw.__multiStore&&Array.isArray(raw.stores)&&raw.stores.length){
    const stores=raw.stores.map((s,i)=>({
      id:s.id||uid(),
      name:s.name||s.data?.meta?.name||`Cửa hàng ${i+1}`,
      createdAt:s.createdAt||now(),
      data:normalizeLegacyStore(s.data||{},s.name||`Cửa hàng ${i+1}`)
    }));
    const activeStoreId=stores.some(s=>s.id===raw.activeStoreId)?raw.activeStoreId:stores[0].id;
    return {__nextV4:true,revision:Number(raw.revision)||0,activeStoreId,stores};
  }

  // Plain legacy single-store object.
  if(raw&&typeof raw==="object"){
    const data=normalizeLegacyStore(raw,raw.meta?.name||"Cửa hàng chính");
    const id=raw.id||"store-main";
    return {__nextV4:true,revision:0,activeStoreId:id,stores:[{id,name:data.meta?.name||"Cửa hàng chính",createdAt:raw.meta?.createdAt||now(),data}]};
  }

  // Only when there is truly no data at all, create blank store.
  const data=ensureStore({}); const id="store-main";
  return {__nextV4:true,revision:0,activeStoreId:id,stores:[{id,name:"Cửa hàng chính",createdAt:now(),data}]};
}
async function readRoot(){return normalizeRoot(await rpc("cantin_read_store_public",{}))}
async function writeRoot(root){
  const currentRaw=await readRootRaw().catch(()=>null);
  const current=currentRaw?normalizeRoot(currentRaw):null;

  // Prevent an accidental blank overwrite, but do not block normal edits.
  if(current&&dataWeight(current)>10&&dataWeight(root)===0){
    throw new Error("Đã chặn ghi dữ liệu trắng đè lên dữ liệu hiện có.");
  }

  // IMPORTANT: do not embed the whole previous database into the next database.
  // Per-action store snapshots already exist and are enough for rollback.
  delete root.backups;

  root.revision=(Number(root.revision)||0)+1;
  const token=uid();
  root.persist={token,writtenAt:now(),version:"4.10"};

  await rpc("cantin_write_store_public",{p_data:root});

  for(let i=0;i<4;i++){
    const check=normalizeRoot(await readRootRaw());
    if(check.persist?.token===token){
      return check;
    }
    await new Promise(r=>setTimeout(r,120*(i+1)));
  }
  throw new Error("Supabase chưa xác nhận lưu dữ liệu. Không có dữ liệu nào được báo thành công giả.");
}
function active(root){return root.stores.find(s=>s.id===root.activeStoreId)||root.stores[0]}
function tx(store,type,summary,changes=[]){const t={id:`TX-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,type,summary,changes,createdAt:now()};store.transactions.push(t);if(store.transactions.length>600)store.transactions=store.transactions.slice(-600);return t}
function snapshot(store,label){const data=clone(store);data.snapshots=[];store.snapshots.push({id:uid(),label,createdAt:now(),data});if(store.snapshots.length>30)store.snapshots=store.snapshots.slice(-30)}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function bad(m,status=400){throw Object.assign(new Error(m),{status})}


function levenshtein(a,b){
  a=norm(a);b=norm(b);const m=a.length,n=b.length,dp=Array.from({length:m+1},(_,i)=>[i]);
  for(let j=1;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[m][n]
}
function similarity(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;return 1-levenshtein(a,b)/Math.max(a.length,b.length)}
function aliasMap(store){
  const m=new Map();
  for(const a of store.aliases||[])if(a.alias&&a.productId)m.set(norm(a.alias),a.productId);
  return m
}
function productCandidates(store,text){
  const q=norm(text),aliases=aliasMap(store),out=[];
  for(const [al,id] of aliases){if(q.includes(al)){const p=store.products.find(x=>x.id===id);if(p)out.push({p,score:200+al.length,why:"alias"})}}
  for(const p of store.products.filter(x=>x.active!==false)){
    const n=norm(p.name);let score=0;
    if(q.includes(n))score=150+n.length;
    else{
      const words=n.split(/\s+/).filter(w=>w.length>=2),hits=words.filter(w=>q.includes(w));
      score=hits.length*18+hits.join("").length;
      const tokens=q.split(/\s+/);
      for(const t of tokens)if(t.length>=3)score=Math.max(score,Math.round(similarity(t,n)*35));
    }
    if(score>8)out.push({p,score,why:"name"})
  }
  return out.sort((a,b)=>b.score-a.score)
}
function findProduct(store,text,contextProductId=""){
  const c=productCandidates(store,text);
  if(c.length&&(!c[1]||c[0].score>=c[1].score+6))return c[0].p;
  if(!c.length&&contextProductId)return store.products.find(x=>x.id===contextProductId)||null;
  return c[0]?.p||null
}
function findCustomer(store,text,contextCustomerId=""){
  const q=norm(text);let best=null,score=0;
  for(const c of store.customers){
    const n=norm(c.name);let s=q.includes(n)?100+n.length:0;
    for(const t of q.split(/\s+/))if(t.length>=3)s=Math.max(s,Math.round(similarity(t,n)*30));
    if(s>score){best=c;score=s}
  }
  if(score>=16)return best;
  if(contextCustomerId)return store.customers.find(x=>x.id===contextCustomerId)||null;
  return null
}
function parseNum(text){const m=norm(text).replace(/\./g,"").match(/(\d+(?:[.,]\d+)?)/);return m?Number(m[1].replace(",",".")):null}
function parseCashDetailed(text){
  const m=String(text).toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(k|nghin|nghìn|ngàn|ngan|tr|triệu|trieu)?/);
  if(!m)return {amount:null,ambiguous:false};
  let n=Number(m[1].replace(",",".")),u=m[2]||"",ambiguous=false;
  if(u==="k"||u.includes("ng"))n*=1000;
  else if(u==="tr"||u.includes("tri"))n*=1e6;
  else if(n>0&&n<1000){ambiguous=true;n*=1000}
  return {amount:Math.round(n),ambiguous,raw:m[1]}
}
function parseCash(text){return parseCashDetailed(text).amount}
function customerDebt(store,id){return store.debts.filter(d=>d.customerId===id).reduce((a,d)=>a+(+d.balance||0),0)}
function payDebt(store,id,amount,note="",createdAt=now()){
  let left=amount,applied=0;
  for(const d of store.debts.filter(d=>d.customerId===id&&d.balance>0).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){
    const x=Math.min(left,d.balance);if(x<=0)break;
    d.paid=(+d.paid||0)+x;d.balance=(+d.amount||0)-d.paid;d.payments=d.payments||[];
    d.payments.push({id:uid(),amount:x,note,createdAt});left-=x;applied+=x
  }
  return applied
}
function saleTotals(store,items){
  let total=0,cost=0,lines=[];
  for(const r of items){
    const p=store.products.find(x=>x.id===r.productId);if(!p)bad("Không tìm thấy sản phẩm");
    const q=qty(r.quantity);if(!q)continue;
    if(p.trackStock!==false&&q>p.stock)bad(`${p.name} chỉ còn ${p.stock}`);
    const sub=q*p.salePrice,co=q*p.costPrice;total+=sub;cost+=co;
    lines.push({productId:p.id,name:p.name,unit:p.unit,category:p.category,quantity:q,unitPrice:p.salePrice,costPrice:p.costPrice,subtotal:sub})
  }
  return {lines,total,cost,profit:total-cost}
}
function startOfDaysAgo(days){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-days);return d}
function recentSales(store,days=7){const from=startOfDaysAgo(days-1);return store.sales.filter(s=>new Date(s.createdAt)>=from)}
function saleStats(store,days=7){
  const sales=recentSales(store,days),by=new Map();let revenue=0,profit=0;
  for(const s of sales){revenue+=+s.total||0;profit+=+s.profit||0;for(const l of s.items||[]){const x=by.get(l.productId)||{name:l.name,qty:0,revenue:0,profit:0};x.qty+=+l.quantity||0;x.revenue+=+l.subtotal||0;x.profit+=(+l.quantity||0)*((+l.unitPrice||0)-(+l.costPrice||0));by.set(l.productId,x)}}
  return {sales,revenue,profit,items:[...by.values()].sort((a,b)=>b.qty-a.qty)}
}
function formatMoney(n){return Math.round(n||0).toLocaleString("vi-VN")+"đ"}
function anomalyList(st){
  const out=[];
  for(const d of st.debts.filter(d=>d.balance>0&&d.balance<1000))out.push(`Khoản nợ rất nhỏ ${formatMoney(d.balance)} của ${d.customer||st.customers.find(c=>c.id===d.customerId)?.name||"khách"} — có thể nhập thiếu “k”.`);
  for(const p of st.products){
    if((+p.stock||0)<0)out.push(`${p.name} đang tồn âm ${p.stock}.`);
    if((+p.salePrice||0)>0&&(+p.costPrice||0)>(+p.salePrice||0))out.push(`${p.name}: giá bán ${formatMoney(p.salePrice)} thấp hơn giá vốn ${formatMoney(p.costPrice)}.`);
  }
  const recent=st.stockReceipts.slice(-30);
  for(const r of recent)for(const l of r.lines||[]){const p=st.products.find(x=>x.id===l.productId);if(p&&l.quantity>(p.packSize||1)*10)out.push(`Phiếu nhập ${p.name} +${l.quantity} ${p.unit||""} khá lớn, nên kiểm tra.`)}
  for(const a of st.audits.slice(-30))for(const l of a.lines||[])if(Number(l.before)===Number(l.actual))out.push(`Kiểm kho ${l.name}: không thay đổi (${l.actual}); nếu thao tác lặp lại có thể bỏ qua.`);
  return out.slice(0,12)
}
function forecastLines(st){
  const stats=saleStats(st,14),map=new Map(stats.items.map(x=>[norm(x.name),x]));
  const out=[];
  for(const p of st.products.filter(x=>x.trackStock!==false&&x.active!==false)){
    const s=map.get(norm(p.name)),daily=(s?.qty||0)/14;
    if(daily<=0)continue;
    const days=(+p.stock||0)/daily;
    const suggested=Math.max(0,Math.ceil((daily*7-(+p.stock||0))/(p.packSize||1)))*(p.packSize||1);
    if(days<=7||p.stock<=p.minStock)out.push({p,daily,days,suggested})
  }
  return out.sort((a,b)=>a.days-b.days)
}
function recipeUsage(st,days=7){
  const sales=recentSales(st,days),tot={phin_g:0,machine_g:0,condensed_ml:0,fresh_ml:0,salt_g:0,sugar_g:0};
  for(const s of sales)for(const l of s.items||[]){
    const p=st.products.find(x=>x.id===l.productId)||l,name=norm(p.name),formula=norm(p.formula||p.source||"");
    const q=+l.quantity||0;
    const get=(unit,key)=>{const re=new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${unit}\\s*[^+;,]*${key}`,"i"),m=formula.match(re);return m?Number(m[1].replace(",",".")):0};
    let phinMl=get("ml","ca phe phin"),machineMl=get("ml","ca phe may");
    let condensed=get("ml","sua dac"),fresh=get("ml","sua tuoi"),salt=get("g","kem muoi"),sugar=get("g","duong");
    if(!phinMl&&!machineMl&&!condensed&&!fresh&&!salt&&!sugar){
      if(name.includes("ca phe sua")){phinMl=40;condensed=20}
      else if(name.includes("bac xiu")){phinMl=30;fresh=40;condensed=20}
      else if(name.includes("ca phe den")){phinMl=40;sugar=3}
      else if(name.includes("ca phe muoi")){phinMl=40;salt=25}
      else if(name.includes("ca phe may"))machineMl=40
    }
    tot.phin_g+=phinMl*(240/500)*q;tot.machine_g+=machineMl*(18/40)*q;tot.condensed_ml+=condensed*q;tot.fresh_ml+=fresh*q;tot.salt_g+=salt*q;tot.sugar_g+=sugar*q
  }
  return tot
}
function allMentionedProducts(st,msg){
  const q=norm(msg),hits=[];
  for(const p of st.products.filter(x=>x.active!==false)){
    const names=[norm(p.name),...(st.aliases||[]).filter(a=>a.productId===p.id).map(a=>norm(a.alias))].filter(Boolean);
    let pos=-1,label="";
    for(const n of names){const i=q.indexOf(n);if(i>=0&&(pos<0||i<pos)){pos=i;label=n}}
    if(pos>=0)hits.push({p,pos,label})
  }
  hits.sort((a,b)=>a.pos-b.pos);
  const out=[];
  for(let i=0;i<hits.length;i++){
    const h=hits[i],from=i?hits[i-1].pos+hits[i-1].label.length:0,pre=q.slice(Math.max(from,h.pos-24),h.pos);
    const nums=[...pre.matchAll(/(\d+(?:[.,]\d+)?)/g)],n=nums.length?Number(nums.at(-1)[1].replace(",",".")):1;
    out.push({productId:h.p.id,name:h.p.name,quantity:n||1})
  }
  return out
}
function ambiguousProduct(st,msg){
  const c=productCandidates(st,msg);if(c.length>=2&&c[0].score<c[1].score+6&&c[0].p.id!==c[1].p.id)return c.slice(0,4).map(x=>x.p);
  return []
}
function executePlan(st,plan,message){
  if(plan.kind==="batch"){for(const x of plan.steps||[])executePlan(st,x,message);return}
  if(plan.kind==="alias.add"){
    const p=st.products.find(x=>x.id===plan.productId);if(!p)bad("Không tìm thấy sản phẩm");
    st.aliases=st.aliases||[];st.aliases=st.aliases.filter(a=>norm(a.alias)!==norm(plan.alias));
    st.aliases.push({id:uid(),alias:plan.alias,productId:p.id,createdAt:now()});tx(st,"ai.alias",`AI học alias “${plan.alias}” = ${p.name}`);return
  }
  if(plan.kind==="sale.create"){
    const t=saleTotals(st,plan.items||[]);if(!t.lines.length)bad("Đơn hàng trống");
    for(const l of t.lines){const p=st.products.find(x=>x.id===l.productId);if(p.trackStock!==false)p.stock-=l.quantity}
    const sale={id:uid(),createdAt:now(),items:t.lines,total:t.total,costTotal:t.cost,profit:t.profit,paymentMethod:plan.paymentMethod||"cash",customerId:plan.customerId||"",customer:"",note:`AI: ${message}`};
    if(sale.paymentMethod==="debt"){
      const c=st.customers.find(x=>x.id===sale.customerId);if(!c)bad("Không tìm thấy khách để ghi nợ");
      sale.customer=c.name;st.debts.push({id:uid(),customerId:c.id,customer:c.name,amount:t.total,paid:0,balance:t.total,note:`Đơn AI: ${t.lines.map(x=>`${x.quantity} ${x.name}`).join(", ")}`,createdAt:sale.createdAt,payments:[],saleId:sale.id})
    }
    st.sales.push(sale);tx(st,"ai.sale",`AI tạo đơn ${t.lines.length} món · ${formatMoney(t.total)}${sale.paymentMethod==="debt"?" · ghi nợ":""}`);return
  }
  if(plan.kind==="inventory.set"){
    const pr=st.products.find(x=>x.id===plan.productId);if(!pr)bad("Không tìm thấy sản phẩm");const before=pr.stock;
    if(before===plan.after){tx(st,"ai.noop",`${pr.name} đã ở mức ${plan.after}`);return}
    pr.stock=plan.after;const sold=Math.max(0,before-plan.after);
    if(sold>0&&plan.recordSale!==false){
      const total=sold*pr.salePrice,cost=sold*pr.costPrice;
      st.sales.push({id:uid(),createdAt:now(),items:[{productId:pr.id,name:pr.name,unit:pr.unit,category:pr.category,quantity:sold,unitPrice:pr.salePrice,costPrice:pr.costPrice,subtotal:total}],total,costTotal:cost,profit:total-cost,paymentMethod:"inventory",note:`AI: ${message}`})
    }
    st.audits.push({id:uid(),createdAt:now(),note:`AI: ${message}`,lines:[{productId:pr.id,name:pr.name,before,actual:plan.after,sold}]});
    tx(st,"ai.inventory",`AI kiểm kho ${pr.name}: ${before} → ${plan.after}`);return
  }
  if(plan.kind==="stockin"){
    const pr=st.products.find(x=>x.id===plan.productId);if(!pr)bad("Không tìm thấy sản phẩm");
    const before=pr.stock;pr.stock+=plan.quantity;
    st.stockReceipts.push({id:uid(),createdAt:now(),note:`AI: ${message}`,lines:[{productId:pr.id,name:pr.name,quantity:plan.quantity,before,after:pr.stock}]});
    tx(st,"ai.stockin",`AI nhập ${pr.name} +${plan.quantity}`);return
  }
  if(plan.kind==="debt.add"){
    const c=st.customers.find(x=>x.id===plan.customerId);if(!c)bad("Không tìm thấy khách");
    st.debts.push({id:uid(),customerId:c.id,customer:c.name,amount:plan.amount,paid:0,balance:plan.amount,note:plan.note||message,createdAt:now(),payments:[]});
    tx(st,"ai.debt",`AI ghi nợ ${c.name}: ${formatMoney(plan.amount)}`);return
  }
  if(plan.kind==="debt.pay"){
    const c=st.customers.find(x=>x.id===plan.customerId);if(!c)bad("Không tìm thấy khách");
    const a=Math.min(plan.amount,customerDebt(st,c.id));payDebt(st,c.id,a,`AI: ${message}`);tx(st,"ai.payment",`AI ghi nhận ${c.name} trả ${formatMoney(a)}`);return
  }
  bad("Plan AI chưa hỗ trợ")
}
function answerAI(st,msg,context={}){
  const q=norm(msg),cu=findCustomer(st,msg,context.customerId),pr=findProduct(st,msg,context.productId);
  const today=new Date().toISOString().slice(0,10);

  if(q.includes("bat thuong")||q.includes("bất thường")||q.includes("kiem tra loi")||q.includes("sai so")){
    const a=anomalyList(st);return a.length?`Tôi thấy ${a.length} điểm cần kiểm tra:\n${a.map(x=>"• "+x).join("\n")}`:"Chưa thấy bất thường rõ ràng trong dữ liệu hiện tại."
  }
  if(q.includes("goi y nhap")||q.includes("cần nhập")||q.includes("can nhap")||q.includes("nhap som")||q.includes("dự báo")||q.includes("du bao")){
    const a=forecastLines(st);return a.length?`Gợi ý nhập hàng theo tốc độ bán 14 ngày:\n${a.slice(0,10).map(x=>`• ${x.p.name}: còn ${x.p.stock} ${x.p.unit}, ~${x.daily.toFixed(1)}/ngày, đủ khoảng ${x.days.toFixed(1)} ngày${x.suggested?`, gợi ý nhập ≥ ${x.suggested} ${x.p.unit}`:""}`).join("\n")}`:"Chưa đủ lịch sử bán để dự báo hoặc tồn kho đang ổn."
  }
  if((q.includes("nguyen lieu")||q.includes("nguyên liệu"))&&(q.includes("ca phe")||q.includes("cà phê"))){
    const u=recipeUsage(st,7);return `Ước tính nguyên liệu cà phê đã dùng trong 7 ngày:\n• Cà phê phin: ${u.phin_g.toFixed(0)} g\n• Cà phê máy: ${u.machine_g.toFixed(0)} g\n• Sữa đặc: ${u.condensed_ml.toFixed(0)} ml\n• Sữa tươi: ${u.fresh_ml.toFixed(0)} ml\n• Bột kem muối: ${u.salt_g.toFixed(0)} g\n• Đường: ${u.sugar_g.toFixed(0)} g\n(Ước tính theo công thức sản phẩm và số ly bán.)`
  }
  if(q.includes("hom nay kinh doanh")||q.includes("hôm nay kinh doanh")||q.includes("tong ket hom nay")||q.includes("tổng kết hôm nay")){
    const s=st.sales.filter(x=>String(x.createdAt).slice(0,10)===today),rev=s.reduce((a,x)=>a+(+x.total||0),0),profit=s.reduce((a,x)=>a+(+x.profit||0),0),qtys=s.reduce((a,x)=>a+(x.items||[]).reduce((z,l)=>z+(+l.quantity||0),0),0);
    return `Hôm nay: ${s.length} đơn · ${qtys} sản phẩm · doanh thu ${formatMoney(rev)} · lợi nhuận ${formatMoney(profit)} · tổng công nợ hiện tại ${formatMoney(st.debts.reduce((a,d)=>a+(+d.balance||0),0))}.`
  }
  if(q.includes("7 ngay")||q.includes("7 ngày")||q.includes("ban chay")||q.includes("bán chạy")||q.includes("loi cao")||q.includes("lời cao")){
    const s=saleStats(st,7);
    if(q.includes("loi cao")||q.includes("lời cao"))return s.items.length?`Lợi nhuận theo mặt hàng 7 ngày:\n${[...s.items].sort((a,b)=>b.profit-a.profit).slice(0,8).map((x,i)=>`${i+1}. ${x.name}: ${formatMoney(x.profit)}`).join("\n")}`:"Chưa có dữ liệu bán 7 ngày.";
    return s.items.length?`Bán chạy 7 ngày:\n${s.items.slice(0,8).map((x,i)=>`${i+1}. ${x.name}: ${x.qty} · ${formatMoney(x.revenue)}`).join("\n")}\nTổng doanh thu: ${formatMoney(s.revenue)} · lợi nhuận: ${formatMoney(s.profit)}`:"Chưa có dữ liệu bán 7 ngày."
  }
  if(q.includes("ban cham")||q.includes("bán chậm")||q.includes("ton nhieu")||q.includes("tồn nhiều")){
    const sold=new Map(saleStats(st,14).items.map(x=>[norm(x.name),x.qty]));
    const a=st.products.filter(p=>p.stock>0).map(p=>({p,qty:sold.get(norm(p.name))||0})).sort((a,b)=>(b.p.stock/(b.qty+1))-(a.p.stock/(a.qty+1))).slice(0,8);
    return a.length?`Tồn nhiều / bán chậm trong 14 ngày:\n${a.map(x=>`• ${x.p.name}: tồn ${x.p.stock}, bán ${x.qty}`).join("\n")}`:"Không có dữ liệu phù hợp."
  }
  if(q.includes("sap het")||q.includes("sắp hết")){const a=st.products.filter(p=>p.trackStock!==false&&p.stock<=p.minStock);return a.length?`Sắp hết / đã hết:\n${a.map(p=>`• ${p.name}: ${p.stock} ${p.unit}`).join("\n")}`:"Không có sản phẩm dưới mức tồn tối thiểu."}
  if(q.includes("no nhieu")||q.includes("nợ nhiều")||q.includes("no cao")||q.includes("nợ cao")){const a=st.customers.map(c=>({name:c.name,d:customerDebt(st,c.id)})).filter(x=>x.d>0).sort((a,b)=>b.d-a.d).slice(0,8);return a.length?a.map((x,i)=>`${i+1}. ${x.name}: ${formatMoney(x.d)}`).join("\n"):"Không có công nợ."}
  if(q.includes("ai tra no hom nay")||q.includes("ai trả nợ hôm nay")||q.includes("tra no hom nay")){
    const rows=[];for(const d of st.debts)for(const p of d.payments||[])if(String(p.createdAt).slice(0,10)===today)rows.push({name:d.customer||st.customers.find(c=>c.id===d.customerId)?.name||"",amount:p.amount});
    return rows.length?`Trả nợ hôm nay:\n${rows.map(x=>`• ${x.name}: ${formatMoney(x.amount)}`).join("\n")}`:"Hôm nay chưa có lần trả nợ."
  }
  if(cu&&(q.includes("no tu ngay")||q.includes("nợ từ ngày")||q.includes("lich su no")||q.includes("lịch sử nợ")||q.includes("dang no")||q.includes("đang nợ"))){
    const ds=st.debts.filter(d=>d.customerId===cu.id),bal=customerDebt(st,cu.id);return `${cu.name} còn nợ ${formatMoney(bal)}.\n${ds.slice(-10).reverse().map(d=>`• ${new Date(d.createdAt).toLocaleDateString("vi-VN")}: ${formatMoney(d.amount)} · còn ${formatMoney(d.balance)} · ${d.note||""}`).join("\n")}`
  }
  if(q.includes("doanh thu hom nay")||q.includes("doanh thu hôm nay")||q.includes("loi hom nay")||q.includes("lời hôm nay")){const s=st.sales.filter(x=>String(x.createdAt).slice(0,10)===today),rev=s.reduce((a,x)=>a+(+x.total||0),0),profit=s.reduce((a,x)=>a+(+x.profit||0),0);return `Hôm nay doanh thu ${formatMoney(rev)}, lợi nhuận ${formatMoney(profit)}.`}
  if(pr&&(q.includes("con bao nhieu")||q.includes("còn bao nhiêu")||q.includes("ton bao nhieu")))return `${pr.name} còn ${pr.stock} ${pr.unit}.`
  return null
}
function planAI(st,msg,context={}){
  const direct=answerAI(st,msg,context);if(direct)return {type:"answer",answer:direct,context};
  const q=norm(msg),amb=ambiguousProduct(st,msg),cu=findCustomer(st,msg,context.customerId),pr=findProduct(st,msg,context.productId);

  if(amb.length)return {type:"clarify",question:`Tôi chưa chắc anh đang nói mặt hàng nào. Chọn một mặt hàng:`,choices:amb.map(p=>({label:p.name,message:msg.replace(/(kem|nuoc|nước|ca phe|cà phê)/i,p.name)})),context};

  const aliasMatch=msg.match(/(?:gọi|goi|từ nay gọi|tu nay goi)\s+(.+?)\s+(?:là|la)\s+([^\s,;]+)/i);
  if(aliasMatch){
    const p=findProduct(st,aliasMatch[1]);if(!p)return {type:"clarify",question:"Tôi chưa xác định được sản phẩm cần đặt alias.",choices:[],context};
    return {type:"plan",summary:`Ghi nhớ “${aliasMatch[2]}” = ${p.name}`,plan:{kind:"alias.add",productId:p.id,alias:aliasMatch[2]},context:{...context,productId:p.id}}
  }

  // Multi-item sale: "Đang lấy 2 Pocari, 1 Bò húc và ghi nợ"
  const items=allMentionedProducts(st,msg);
  if(items.length&&(q.includes("lay ")||q.includes("lấy ")||q.includes("mua ")||q.includes("ban cho")||q.includes("bán cho")||q.includes("tao don")||q.includes("tạo đơn"))){
    if(!cu&&q.includes("no"))return {type:"clarify",question:"Đơn này ghi nợ nhưng tôi chưa xác định được khách hàng. Hãy nói rõ tên khách.",choices:[],context};
    const paymentMethod=(q.includes("ghi no")||q.includes("ghi nợ")||q.includes(" no"))?"debt":(q.includes("chuyen khoan")||q.includes("chuyển khoản"))?"transfer":"cash";
    const total=items.reduce((a,l)=>a+(st.products.find(p=>p.id===l.productId)?.salePrice||0)*l.quantity,0);
    return {type:"plan",summary:`Tạo đơn ${items.map(x=>`${x.quantity} ${x.name}`).join(", ")} · ${formatMoney(total)}${paymentMethod==="debt"&&cu?` · ghi nợ ${cu.name}`:""}`,plan:{kind:"sale.create",items,customerId:cu?.id||"",paymentMethod},context:{productId:items.at(-1)?.productId||"",customerId:cu?.id||context.customerId||""}}
  }

  if(pr&&(q.includes("ban het")||q.includes("bán hết")||q.includes("het hang")||q.includes("hết hàng")||q.includes("het roi")||q.includes("hết rồi")||q.includes("cho ve 0")||q.includes("về 0")))return {type:"plan",summary:`Kiểm kho ${pr.name}: ${pr.stock} → 0 ${pr.unit}`,plan:{kind:"inventory.set",productId:pr.id,after:0},context:{...context,productId:pr.id}};
  if(pr&&(q.includes("kiem kho")||q.includes("kiểm kho")||q.includes(" con ")||q.includes(" còn "))){const n=parseNum(msg);if(n!==null)return {type:"plan",summary:`Kiểm kho ${pr.name}: ${pr.stock} → ${n} ${pr.unit}`,plan:{kind:"inventory.set",productId:pr.id,after:n},context:{...context,productId:pr.id}}}
  if(items.length>1&&(q.includes("nhap")||q.includes("nhập")||q.includes("ve them")||q.includes("về thêm"))){
    const steps=items.map(x=>({kind:"stockin",productId:x.productId,quantity:x.quantity}));
    return {type:"plan",summary:`Nhập kho nhiều mặt hàng: ${items.map(x=>`${x.quantity} ${x.name}`).join(", ")}`,plan:{kind:"batch",steps},context:{...context,productId:items.at(-1)?.productId||""}}
  }
  if(pr&&(q.includes("nhap")||q.includes("nhập")||q.includes("ve them")||q.includes("về thêm"))){
    const numbers=[...norm(msg).matchAll(/(\d+(?:[.,]\d+)?)\s*(thung|thùng|ket|két|chai|lon|goi|gói|cai|cái|le|lẻ)?/g)];
    if(numbers.length){
      let total=0;for(const m of numbers){let n=Number(m[1].replace(",",".")),u=m[2]||"";if(u.includes("thung")||u.includes("thùng")||u.includes("ket")||u.includes("két"))n*=pr.packSize||1;total+=n}
      return {type:"plan",summary:`Nhập ${pr.name} +${total} ${pr.unit}`,plan:{kind:"stockin",productId:pr.id,quantity:total},context:{...context,productId:pr.id}}
    }
  }
  if(cu&&(q.includes("tra het")||q.includes("trả hết"))){
    const a=customerDebt(st,cu.id);if(a)return {type:"plan",summary:`${cu.name} trả hết ${formatMoney(a)}`,plan:{kind:"debt.pay",customerId:cu.id,amount:a},context:{...context,customerId:cu.id}}
  }
  if(cu&&(q.includes("no ")||q.includes("nợ ")||q.includes("ghi no")||q.includes("ghi nợ"))){
    const c=parseCashDetailed(msg);if(c.amount){
      if(c.ambiguous)return {type:"clarify",question:`Anh muốn ghi nợ ${formatMoney(c.amount)} cho ${cu.name} đúng không?`,choices:[{label:`Đúng, ${formatMoney(c.amount)}`,message:`${cu.name} ghi nợ ${c.amount}đ ${msg}`},{label:"Nhập lại",message:`${cu.name} ghi nợ `}],context:{...context,customerId:cu.id}};
      return {type:"plan",summary:`Ghi nợ ${cu.name}: ${formatMoney(c.amount)}`,plan:{kind:"debt.add",customerId:cu.id,amount:c.amount,note:msg},context:{...context,customerId:cu.id}}
    }
  }
  if(cu&&(q.includes("tra ")||q.includes("trả ")||q.includes("tra no")||q.includes("trả nợ"))){
    const c=parseCashDetailed(msg);if(c.amount){
      if(c.ambiguous)return {type:"clarify",question:`Anh muốn ghi nhận ${cu.name} trả ${formatMoney(c.amount)} đúng không?`,choices:[{label:`Đúng, ${formatMoney(c.amount)}`,message:`${cu.name} trả nợ ${c.amount}đ`},{label:"Nhập lại",message:`${cu.name} trả nợ `}],context:{...context,customerId:cu.id}};
      return {type:"plan",summary:`${cu.name} trả ${formatMoney(c.amount)}`,plan:{kind:"debt.pay",customerId:cu.id,amount:c.amount},context:{...context,customerId:cu.id}}
    }
  }

  return {type:"clarify",question:"Tôi chưa hiểu chắc. Anh có thể nói rõ tên mặt hàng/khách hàng và số lượng hoặc số tiền. Tôi sẽ không tự ghi khi chưa chắc.",choices:[],context}
}

export async function onRequest(context){
  globalThis.__ENV=context.env||{};
  const url=new URL(context.request.url),path=url.pathname,req=context.request;
  try{
    if(path==="/api/bootstrap"&&req.method==="GET"){const root=await readRoot(),s=active(root);return json({revision:root.revision||0,storeId:s.id,store:s.data,stores:root.stores.map(x=>({id:x.id,name:x.name}))})}
    if(path==="/api/action"&&req.method==="POST"){const body=await req.json(),root=await readRoot();if(Number(body.revision)!==Number(root.revision||0))bad("Dữ liệu vừa thay đổi ở thiết bị khác. Hãy đồng bộ lại.",409);applyAction(root,body.action,body.payload||{});const saved=await writeRoot(root),s=active(saved);return json({ok:true,revision:saved.revision,storeId:s.id,store:s.data,stores:saved.stores.map(x=>({id:x.id,name:x.name}))})}
    if(path==="/api/ai/plan"&&req.method==="POST"){const body=await req.json(),root=await readRoot(),s=root.stores.find(x=>x.id===body.storeId)||active(root);return json(planAI(s.data,String(body.message||""),body.context||{}))}
    if(path==="/api/package/validate"&&req.method==="POST"){const body=await req.json();if(body.format!=="cantin-ai-node-json")bad("Không phải gói Cantin AI");if(!Array.isArray(body.files)||!body.files.length)bad("Gói không có file");return json({ok:true,version:body.version||"không rõ",fileCount:body.files.length})}
    return json({error:"Không tìm thấy API"},404)
  }catch(e){return json({error:e.message||"Lỗi máy chủ"},e.status||500)}
}
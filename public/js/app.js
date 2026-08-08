
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={revision:0,storeId:"",store:null,stores:[],cart:[],editingSaleId:"",editingReceiptId:"",editingAuditId:""};
const money=n=>(Number(n)||0).toLocaleString("vi-VN")+" ₫";
const num=n=>(Number(n)||0).toLocaleString("vi-VN");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d");
const dtLocal=(iso=new Date().toISOString())=>{const d=new Date(iso),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now();

async function api(path,opts={}){
  const method=(opts.method||"GET").toUpperCase();
  const u=method==="GET"?`${path}${path.includes("?")?"&":"?"}_=${Date.now()}`:path;
  const res=await fetch(u,{...opts,method,cache:"no-store",headers:{"Content-Type":"application/json",...(opts.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||"Có lỗi xảy ra");
  return data;
}
function toast(msg,error=false){const t=$("#toast");t.textContent=msg;t.className=`toast show${error?" error":""}`;clearTimeout(t._x);t._x=setTimeout(()=>t.className="toast",2600)}
function showModal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
$("#closeModal").onclick=closeModal;

async function boot(){
  const bootEl=$("#boot");
  try{
    if(bootEl){bootEl.textContent="Đang đọc dữ liệu v5.1.9…";bootEl.classList.remove("hidden")}
    const data=await api("/api/bootstrap");
    const incoming=data?.store||{};
    const counts={
      products:Array.isArray(incoming.products)?incoming.products.length:0,
      customers:Array.isArray(incoming.customers)?incoming.customers.length:0,
      debts:Array.isArray(incoming.debts)?incoming.debts.length:0
    };
    if(counts.products===0&&counts.customers===0&&counts.debts===0){
      throw new Error("Supabase đang trả về cửa hàng rỗng. Recovery đã chặn để tránh ghi đè dữ liệu.");
    }
    state.revision=data.revision;
    state.storeId=data.storeId;
    state.store=incoming;
    state.stores=data.stores||[];
    renderAll();
    if(bootEl)bootEl.classList.add("hidden");
    toast(`Đã đọc dữ liệu: ${counts.products} mặt hàng · ${counts.customers} khách · ${counts.debts} khoản nợ`);
  }catch(e){
    if(bootEl){bootEl.textContent="Recovery: "+e.message;bootEl.classList.remove("hidden")}
    toast(e.message,true);
    console.error("RECOVERY BOOT ERROR",e);
  }
}
function renderAll(){
  $("#storeName").textContent=state.store.meta?.name||"Cửa hàng";
  $("#storeSelect").innerHTML=state.stores.map(s=>`<option value="${s.id}" ${s.id===state.storeId?"selected":""}>${esc(s.name)}</option>`).join("");
  $("#saleDate").value=$("#saleDate").value||dtLocal();$("#stockinDate").value=$("#stockinDate").value||dtLocal();
  renderDashboard();renderExpenses();renderFinanceReport();renderIngredients();renderProducts();renderSales();renderCustomers();renderStockin();renderAudit();renderTransactions();renderSnapshots();renderStores();renderQuickProducts();renderCart();
}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===page));
  $$(".nav").forEach(b=>b.onclick=()=>goPage(b.dataset.target));
  window.scrollTo({top:0,behavior:"smooth"});
}
$$(".nav,.nav-target").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.target)));

async function mutate(action,payload={}){
  const r=await api("/api/action",{method:"POST",body:JSON.stringify({revision:state.revision,action,payload})});
  state.revision=r.revision;state.store=r.store;state.stores=r.stores;state.storeId=r.storeId;
  renderAll();return r;
}
$("#syncBtn").onclick=boot;$("#storeSelect").onchange=async e=>{try{await mutate("store.switch",{id:e.target.value});toast("Đã chuyển cửa hàng")}catch(e){toast(e.message,true)}};

function todayKey(){const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function dashboardData(){
  const day=todayKey(), sales=state.store.sales.filter(s=>String(s.createdAt).slice(0,10)===day);
  const rev=sales.reduce((a,s)=>a+(+s.total||0),0),profit=sales.reduce((a,s)=>a+(+s.profit||0),0);
  const debt=state.store.debts.reduce((a,d)=>a+(+d.balance||0),0);
  const low=state.store.products.filter(p=>p.active!==false&&p.trackStock!==false&&(+p.stock||0)<= (+p.minStock||0));
  return {rev,profit,debt,low};
}


function updateFab(target){const fab=$("#contextFab");if(!fab)return;fab.classList.remove("hidden");const cfg={debts:()=>$("#addCustomerBtn")?.click(),audit:()=>$('.inventory-subtabs [data-subtab="audit-stockin"]')?.click(),products:()=>$("#addProductBtn")?.click(),ingredients:()=>$("#addIngredientBtn")?.click(),expenses:()=>$("#addExpenseBtn")?.click()};if(cfg[target])fab.onclick=cfg[target];else{fab.classList.add("hidden");fab.onclick=null}}
function goPage(target){
  if(target==="customers")target="debts";
  $$(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===target));
  $$(".bottom-nav .nav").forEach(n=>{
    const mapped=target==="products"||target==="ingredients"?"audit":target==="expenses"?"dashboard":target==="data"||target==="activity"?"assistant":target;
    n.classList.toggle("active",n.dataset.target===mapped);
  });
  window.scrollTo({top:0,behavior:"smooth"});
  if(target==="expenses"){renderExpenses();renderFinanceReport();}
  if(target==="debts")renderCustomers();
  if(target==="audit")renderAudit();
  if(target==="products")renderProducts();
  if(target==="ingredients")renderIngredients();updateFab(target);
}
function renderFinanceReport(){const range=financeRange(),f=financeForRange(state.store,range),debt=(state.store.debts||[]).reduce((s,d)=>s+(Number(d.balance)||0),0);[["#reportRevenue",f.revenue],["#reportCashIn",f.cashIn],["#reportCogs",f.cogs],["#reportOpex",f.opEx],["#reportGross",f.gross],["#reportNet",f.net],["#reportCashFlow",f.cashFlow],["#reportDebt",debt]].forEach(([id,v])=>{if($(id))$(id).textContent=money(v)});if($("#revenueBreakdown")){const sales=f.sales,cash=sales.filter(s=>String(s.paymentMethod||s.payment||"cash").toLowerCase()==="cash").reduce((a,s)=>a+saleRevenue(s),0),transfer=sales.filter(s=>String(s.paymentMethod||s.payment||"").toLowerCase()==="transfer").reduce((a,s)=>a+saleRevenue(s),0),debtSales=sales.filter(s=>["debt","credit"].includes(String(s.paymentMethod||s.payment||"").toLowerCase())).reduce((a,s)=>a+saleRevenue(s),0),paidDebt=debtPaymentsCash(state.store).filter(x=>inRange(x.createdAt,range)).reduce((a,x)=>a+x.amount,0);$("#revenueBreakdown").innerHTML=`<div><span>Tiền mặt bán hàng</span><strong>${money(cash)}</strong></div><div><span>Chuyển khoản bán hàng</span><strong>${money(transfer)}</strong></div><div><span>Bán ghi nợ</span><strong>${money(debtSales)}</strong></div><div><span>Thu nợ</span><strong>${money(paidDebt)}</strong></div>`}const cats=categoryProfit(state.store,range);if($("#profitByCategory"))$("#profitByCategory").innerHTML=cats.length?cats.map((x,i)=>`<button class="profit-category" data-i="${i}"><span>${esc(x.category)}</span><strong>${money(x.profit)}</strong><small>DT ${money(x.revenue)}</small></button>`).join(""):'<div class="hint">Chưa có dữ liệu bán hàng.</div>';if($("#profitByProduct"))$("#profitByProduct").innerHTML="";$$(".profit-category").forEach(b=>b.onclick=()=>{const x=cats[Number(b.dataset.i)];$("#profitByProduct").innerHTML=[...x.products.values()].sort((a,b)=>b.profit-a.profit).map(p=>`<div class="finance-breakdown-row"><span>${esc(p.name)}</span><strong>${money(p.profit)}</strong></div>`).join("")});renderSuppliers();renderBudgets()}


function safeDateText(v,withTime=true){
  if(!v)return "Chưa có ngày";
  let d=new Date(v);
  if(Number.isNaN(d.getTime())){
    const s=String(v).trim();
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m)d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  }
  if(Number.isNaN(d.getTime()))return "Ngày không hợp lệ";
  return withTime?d.toLocaleString("vi-VN"):d.toLocaleDateString("vi-VN");
}

function dateKeyOf(v){return String(v||"").slice(0,10)}
function monthKeyOf(v){return String(v||"").slice(0,7)}
function saleRevenue(s){return Number(s.total||s.revenue||0)}
function saleCost(s){
  if(Number.isFinite(Number(s.costTotal)))return Number(s.costTotal)||0;
  return (s.lines||s.items||[]).reduce((sum,l)=>{
    const q=Number(l.qty||l.quantity||0);
    const c=Number(l.cost||l.unitCost||l.costPrice||0);
    return sum+q*c;
  },0);
}
function saleCashCollected(s){
  const total=saleRevenue(s);
  const method=String(s.paymentMethod||s.payment||"cash").toLowerCase();
  if(method==="debt"||method==="credit")return 0;
  return total;
}
function debtPaymentsCash(store){
  const out=[];
  for(const d of (store.debts||[])) for(const p of (d.payments||[])) out.push({createdAt:p.createdAt,amount:Number(p.amount)||0});
  return out;
}
function operatingExpenses(store){
  return (store.expenses||[]).filter(e=>e.type!=="stockin" && e.includeInProfit!==false);
}

function parseLocalDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function isoKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function financeRange(){const preset=$("#financeRangePreset")?.value||"today",now=new Date();let from=todayKey(),to=todayKey();if(preset==="yesterday"){const d=new Date(now);d.setDate(d.getDate()-1);from=to=isoKey(d)}if(preset==="7d"){const d=new Date(now);d.setDate(d.getDate()-6);from=isoKey(d)}if(preset==="month"){from=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`}if(preset==="custom"){from=$("#financeFrom")?.value||from;to=$("#financeTo")?.value||to}return {from,to}}
function inRange(v,r){const k=dateKeyOf(v);return k>=r.from&&k<=r.to}
function financeForRange(store,r){const sales=(store.sales||[]).filter(s=>inRange(s.createdAt,r));const revenue=sales.reduce((a,s)=>a+saleRevenue(s),0),cogs=sales.reduce((a,s)=>a+saleCost(s),0),salesCash=sales.reduce((a,s)=>a+saleCashCollected(s),0),debtCash=debtPaymentsCash(store).filter(x=>inRange(x.createdAt,r)).reduce((a,x)=>a+x.amount,0),allExp=(store.expenses||[]).filter(e=>inRange(e.createdAt,r)),cashOut=allExp.filter(e=>e.paymentStatus!=="unpaid").reduce((a,e)=>a+(Number(e.amount)||0),0),opEx=allExp.filter(e=>e.type!=="stockin"&&e.includeInProfit!==false).reduce((a,e)=>a+(Number(e.amount)||0),0),gross=revenue-cogs,net=gross-opEx;return {sales,revenue,cogs,cashIn:salesCash+debtCash,cashOut,opEx,gross,net,cashFlow:salesCash+debtCash-cashOut}}
function categoryProfit(store,r){const map=new Map();for(const s of (store.sales||[]).filter(x=>inRange(x.createdAt,r)))for(const l of (s.lines||s.items||[])){const p=store.products.find(x=>x.id===l.productId)||{},cat=p.category||"Khác",q=Number(l.qty||l.quantity||0),rev=(Number(l.price)||0)*q,cost=Number(l.cost)||((Number(l.unitCost)||0)*q),x=map.get(cat)||{category:cat,revenue:0,cost:0,profit:0,products:new Map()};x.revenue+=rev;x.cost+=cost;x.profit+=rev-cost;const pn=l.name||p.name||"Mặt hàng",px=x.products.get(pn)||{name:pn,revenue:0,cost:0,profit:0};px.revenue+=rev;px.cost+=cost;px.profit+=rev-cost;x.products.set(pn,px);map.set(cat,x)}return [...map.values()].sort((a,b)=>b.profit-a.profit)}

function financeForDate(store,key){
  const sales=(store.sales||[]).filter(s=>dateKeyOf(s.createdAt)===key);
  const revenue=sales.reduce((s,x)=>s+saleRevenue(x),0);
  const cogs=sales.reduce((s,x)=>s+saleCost(x),0);
  const salesCash=sales.reduce((s,x)=>s+saleCashCollected(x),0);
  const debtCash=debtPaymentsCash(store).filter(x=>dateKeyOf(x.createdAt)===key).reduce((s,x)=>s+x.amount,0);
  const allExp=(store.expenses||[]).filter(e=>dateKeyOf(e.createdAt)===key);
  const cashOut=allExp.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const opEx=operatingExpenses(store).filter(e=>dateKeyOf(e.createdAt)===key).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const gross=revenue-cogs;
  const net=gross-opEx;
  return {revenue,cogs,salesCash,debtCash,cashIn:salesCash+debtCash,cashOut,gross,net,cashFlow:(salesCash+debtCash)-cashOut};
}

function renderWeekChart(){const box=$("#weekChart");if(!box)return;const rows=[],now=new Date();for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const key=isoKey(d),f=financeForDate(state.store,key);rows.push({label:`${d.getDate()}/${d.getMonth()+1}`,revenue:f.revenue,expense:f.cashOut,profit:f.net})}const max=Math.max(1,...rows.flatMap(x=>[x.revenue,x.expense,Math.max(0,x.profit)]));box.innerHTML=rows.map(x=>`<div class="week-col"><div class="week-bars"><i class="bar revenue" style="height:${Math.max(2,x.revenue/max*70)}px"></i><i class="bar expense" style="height:${Math.max(2,x.expense/max*70)}px"></i><i class="bar profit" style="height:${Math.max(2,Math.max(0,x.profit)/max*70)}px"></i></div><small>${x.label}</small></div>`).join("")}



function renderFinanceDashboard(){
  const f=financeForDate(state.store,todayKey());
  if($("#financeRevenueToday"))$("#financeRevenueToday").textContent=money(f.revenue);
  if($("#cashInToday"))$("#cashInToday").textContent=money(f.cashIn);
  if($("#expenseTodayDash"))$("#expenseTodayDash").textContent=money(f.cashOut);
  if($("#grossProfitToday"))$("#grossProfitToday").textContent=money(f.gross);
  if($("#netProfitToday"))$("#netProfitToday").textContent=money(f.net);
  if($("#cashFlowToday"))$("#cashFlowToday").textContent=money(f.cashFlow);
  const debt=(state.store.debts||[]).reduce((s,d)=>s+(Number(d.balance)||0),0);
  const low=(state.store.products||[]).filter(p=>p.trackStock!==false&&(Number(p.stock)||0)<=(Number(p.minStock)||0)).length;
  if($("#miniDebtValue"))$("#miniDebtValue").textContent=money(debt);
  if($("#miniLowValue"))$("#miniLowValue").textContent=low;
  renderWeekChart();
}

function renderDashboard(){renderFinanceDashboard();
  const d=dashboardData();$("#todayRevenue").textContent=money(d.rev);$("#todayProfit").textContent=money(d.profit);$("#totalDebt").textContent=money(d.debt);$("#lowStockCount").textContent=d.low.length;
  const insights=[];
  d.low.slice(0,8).forEach(p=>insights.push({t:p.stock<=0?`${p.name} đã hết`:`${p.name} sắp hết`,d:`Tồn ${num(p.stock)} ${p.unit||""} · tối thiểu ${num(p.minStock)}`,target:"products"}));
  const weird=state.store.debts.filter(x=>x.balance>0&&x.balance<1000);weird.forEach(x=>{const c=state.store.customers.find(c=>c.id===x.customerId);insights.push({t:`Kiểm tra khoản nợ nhỏ: ${c?.name||""}`,d:`${money(x.balance)} · ${x.note||""}`,target:"debts"})});
  $("#insights").className=`list${insights.length?"":" empty"}`;$("#insights").innerHTML=insights.length?insights.map(x=>`<div class="list-row"><div><strong>${esc(x.t)}</strong><small>${esc(x.d)}</small></div><button class="ghost nav-target" data-target="${x.target}">Mở</button></div>`).join(""):"Không có cảnh báo đáng chú ý.";
  $("#insights").querySelectorAll(".nav-target").forEach(b=>b.onclick=()=>navigate(b.dataset.target));
  const tx=[...state.store.transactions].reverse().slice(0,2);$("#recentTx").className=`list${tx.length?"":" empty"}`;$("#recentTx").innerHTML=tx.length?tx.map(t=>`<div class="list-row"><div><strong>${esc(t.summary)}</strong><small>${new Date(t.createdAt).toLocaleString("vi-VN")}</small></div></div>`).join(""):"Chưa có thao tác.";
}
$("#refreshInsights").onclick=renderDashboard;



const categoryState={sale:"",stockin:"",audit:""};
function renderCategoryButtons(chipsId,key,items,rerender){
  const chips=$(chipsId); if(!chips)return "";
  const categories=[...new Set(items.map(p=>String(p.category||"Khác").trim()||"Khác"))].sort((a,b)=>a.localeCompare(b,"vi"));
  if(categoryState[key] && !categories.includes(categoryState[key]))categoryState[key]="";
  const all=[{v:"",n:"Tất cả"},...categories.map(c=>({v:c,n:c}))];
  chips.innerHTML=all.map(x=>`<button class="category-chip ${categoryState[key]===x.v?"active":""}" data-category="${esc(x.v)}">${esc(x.n)}${x.v?` <span>${items.filter(p=>String(p.category||"Khác")===x.v).length}</span>`:` <span>${items.length}</span>`}</button>`).join("");
  chips.querySelectorAll(".category-chip").forEach(b=>b.onclick=()=>{categoryState[key]=b.dataset.category;rerender();});
  return categoryState[key];
}

function productCategories(){
  return [...new Set(state.store.products.map(p=>String(p.category||"Khác").trim()||"Khác"))].sort((a,b)=>a.localeCompare(b,"vi"));
}


function syncCategoryFilter(selectId,chipsId,items,categoryGetter){
  const sel=$(selectId),chips=$(chipsId); if(!sel)return "";
  const categories=[...new Set(items.map(categoryGetter).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  const current=sel.value;
  sel.innerHTML=`<option value="">Tất cả danh mục</option>`+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if(categories.includes(current))sel.value=current;
  if(chips){
    chips.innerHTML=[{v:"",n:"Tất cả"},...categories.map(c=>({v:c,n:c}))].map(x=>`<button class="category-chip ${sel.value===x.v?"active":""}" data-category="${esc(x.v)}">${esc(x.n)}</button>`).join("");
    chips.querySelectorAll(".category-chip").forEach(b=>b.onclick=()=>{sel.value=b.dataset.category;sel.dispatchEvent(new Event("change"));});
  }
  return sel.value;
}

function renderQuickProducts(){
  const q=norm($("#saleSearch").value);
  const category=renderCategoryButtons("#saleCategoryChips","sale",state.store.products,renderQuickProducts);
  const list=state.store.products.filter(p=>p.active!==false&&(!q||norm(p.name+" "+p.category).includes(q))&&(!category||String(p.category||"Khác")===category));
  $("#quickProducts").innerHTML=list.length?list.map(p=>`<button class="product-tile" data-id="${p.id}"><span class="category-badge">${esc(p.category||"Khác")}</span><strong>${esc(p.name)}</strong><small>Tồn ${num(p.stock)} ${esc(p.unit||"")}</small><div class="price">${money(p.salePrice)}</div></button>`).join(""):`<div class="hint">Không có mặt hàng phù hợp.</div>`;
  $("#quickProducts").querySelectorAll(".product-tile").forEach(b=>b.onclick=()=>addCart(b.dataset.id));
}
$("#saleSearch").oninput=renderQuickProducts;
function addCart(id){const p=state.store.products.find(x=>x.id===id);if(!p)return;let row=state.cart.find(x=>x.productId===id);if(row)row.quantity++;else state.cart.push({productId:id,quantity:1});renderCart()}
function renderCart(){
  const box=$("#cart");box.className=`list${state.cart.length?"":" empty"}`;
  box.innerHTML=state.cart.length?state.cart.map(r=>{const p=state.store.products.find(x=>x.id===r.productId);return `<div class="list-row cart-row" data-id="${r.productId}"><div><strong>${esc(p?.name||"")}</strong><small>${money((p?.salePrice||0)*r.quantity)}</small></div><div class="qty"><button data-a="-">−</button><input value="${r.quantity}" inputmode="numeric"><button data-a="+">+</button><button data-a="x">×</button></div></div>`}).join(""):"Chưa chọn sản phẩm.";
  box.querySelectorAll(".cart-row").forEach(row=>{const id=row.dataset.id,input=row.querySelector("input");input.onchange=()=>{const r=state.cart.find(x=>x.productId===id);r.quantity=Math.max(1,parseInt(input.value)||1);renderCart()};row.querySelectorAll("button").forEach(b=>b.onclick=()=>{const r=state.cart.find(x=>x.productId===id);if(b.dataset.a==="+")r.quantity++;if(b.dataset.a==="-")r.quantity=Math.max(1,r.quantity-1);if(b.dataset.a==="x")state.cart=state.cart.filter(x=>x.productId!==id);renderCart()})});
}
$("#clearCart").onclick=()=>{state.cart=[];renderCart()};$("#paymentMethod").onchange=e=>$("#saleCustomerWrap").classList.toggle("hidden",e.target.value!=="debt");
$("#checkout").onclick=async()=>{if(!state.cart.length)return toast("Chưa có sản phẩm",true);try{await mutate("sale.create",{createdAt:new Date($("#saleDate").value).toISOString(),paymentMethod:$("#paymentMethod").value,customerId:$("#saleCustomer").value,note:$("#saleNote").value,items:state.cart});state.cart=[];renderCart();toast("Đã lưu đơn hàng")}catch(e){toast(e.message,true)}};
function renderSales(){
  const arr=[...state.store.sales].reverse().slice(0,100);$("#salesHistory").className=`list${arr.length?"":" empty"}`;$("#salesHistory").innerHTML=arr.length?arr.map(s=>`<div class="list-row" data-id="${s.id}"><div><strong>${money(s.total)}</strong><small>${new Date(s.createdAt).toLocaleString("vi-VN")} · ${esc(s.items.map(i=>i.name+" x"+i.quantity).join(", "))}</small></div><button class="ghost danger-text delete-sale">Xóa</button></div>`).join(""):"Chưa có đơn.";
  $("#salesHistory").querySelectorAll(".delete-sale").forEach(b=>b.onclick=async()=>{if(confirm("Xóa đơn này và hoàn lại kho?"))try{await mutate("sale.delete",{id:b.closest(".list-row").dataset.id});toast("Đã xóa đơn")}catch(e){toast(e.message,true)}});
}
function parseMoney(v,base=0){let s=String(v||"").trim().toLowerCase().replace(/\s/g,"");const op=s[0],isop="+-*/×÷".includes(op);const cv=x=>{let k=String(x).toLowerCase(),mul=1;if(k.endsWith("k")){mul=1000;k=k.slice(0,-1)}else if(k.endsWith("tr")){mul=1e6;k=k.slice(0,-2)}k=k.replace(/\./g,"").replace(",",".");let n=Number(k)||0;if(!mul||mul===1){if(n>0&&n<1000)mul=1000}return Math.round(n*mul)};if(isop){const n=cv(s.slice(1));return op==="+"?base+n:op==="-"?base-n:(op==="*"||op==="×")?base*n:(op==="/"||op==="÷")?(n?base/n:base):base}return cv(s)}

function customerDebt(id){return state.store.debts.filter(d=>d.customerId===id).reduce((a,d)=>a+(+d.balance||0),0)}

const debtPaidFilter={mode:"month"};
function monthBounds(monthValue){
  const [y,m]=monthValue.split("-").map(Number);
  const from=`${y}-${String(m).padStart(2,"0")}-01`;
  const last=new Date(y,m,0).getDate();
  const to=`${y}-${String(m).padStart(2,"0")}-${String(last).padStart(2,"0")}`;
  return {from,to};
}
function debtPaidRange(){
  const now=new Date();
  if(debtPaidFilter.mode==="last-month"){
    const d=new Date(now.getFullYear(),now.getMonth()-1,1);
    return monthBounds(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  if(debtPaidFilter.mode==="custom"){
    return {from:$("#debtPaidFrom")?.value||todayKey(),to:$("#debtPaidTo")?.value||todayKey()};
  }
  const mv=$("#debtPaidMonth")?.value||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  return monthBounds(mv);
}
function debtPaidRows(){
  const range=debtPaidRange(),rows=[];
  for(const d of (state.store.debts||[])){
    const c=(state.store.customers||[]).find(x=>x.id===d.customerId);
    for(const p of (d.payments||[])){
      const k=dateKeyOf(p.createdAt);
      if(k>=range.from&&k<=range.to)rows.push({customer:c?.name||"Khách",amount:Number(p.amount)||0,createdAt:p.createdAt,note:p.note||"",debtNote:d.note||""});
    }
  }
  return rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}

function initDebtPaidFilter(){
  const now=new Date(),v=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  if($("#debtPaidMonth")&&!$("#debtPaidMonth").value)$("#debtPaidMonth").value=v;
  if($("#debtPaidFrom")&&!$("#debtPaidFrom").value)$("#debtPaidFrom").value=todayKey();
  if($("#debtPaidTo")&&!$("#debtPaidTo").value)$("#debtPaidTo").value=todayKey();
  renderDebtPaidReport();
}

function renderDebtPaidReport(){
  const totalEl=$("#debtPaidTotal");if(!totalEl)return;
  const rows=debtPaidRows(),sum=rows.reduce((s,x)=>s+x.amount,0),range=debtPaidRange();
  totalEl.textContent=money(sum);
  if($("#debtPaidCount"))$("#debtPaidCount").textContent=rows.length;
  if($("#debtPaidTitle")){
    if(debtPaidFilter.mode==="custom")$("#debtPaidTitle").textContent=`${new Date(range.from+"T00:00:00").toLocaleDateString("vi-VN")} – ${new Date(range.to+"T00:00:00").toLocaleDateString("vi-VN")}`;
    else if(debtPaidFilter.mode==="last-month")$("#debtPaidTitle").textContent="Tháng trước";
    else $("#debtPaidTitle").textContent="Theo tháng";
  }
  const box=$("#debtPaidHistory");if(box){
    box.innerHTML=rows.length?rows.map(x=>`<div class="debt-paid-row"><div><strong>${esc(x.customer)}</strong><small>${new Date(x.createdAt).toLocaleDateString("vi-VN")} · ${esc(x.note||x.debtNote||"Thanh toán nợ")}</small></div><strong>${money(x.amount)}</strong></div>`).join(""):'<div class="hint">Không có lần trả nợ trong khoảng này.</div>';
  }
}
$$(".debt-period").forEach(b=>b.addEventListener("click",()=>{
  debtPaidFilter.mode=b.dataset.period;
  $$(".debt-period").forEach(x=>x.classList.toggle("active",x===b));
  $("#debtPaidCustom")?.classList.toggle("hidden",debtPaidFilter.mode!=="custom");
  $("#debtPaidMonthWrap")?.classList.toggle("hidden",debtPaidFilter.mode!=="month");
  renderDebtPaidReport();
}));
$("#debtPaidMonth")?.addEventListener("change",renderDebtPaidReport);
$("#debtPaidFrom")?.addEventListener("change",renderDebtPaidReport);
$("#debtPaidTo")?.addEventListener("change",renderDebtPaidReport);
$("#toggleDebtPaidHistory")?.addEventListener("click",()=>{
  const box=$("#debtPaidHistory");if(!box)return;
  box.classList.toggle("hidden");
  $("#toggleDebtPaidHistory").textContent=box.classList.contains("hidden")?"Xem chi tiết":"Ẩn chi tiết";
});

function renderCustomers(){initDebtPaidFilter();
  if(!$("#customers")||!$("#debtSearch")||!$("#debtSort"))return;
  state.store.customers=Array.isArray(state.store.customers)?state.store.customers:[];
  state.store.debts=Array.isArray(state.store.debts)?state.store.debts:[];
  const q=norm($("#debtSearch").value),sort=$("#debtSort").value;let arr=state.store.customers.filter(c=>!q||norm(c.name).includes(q)).map(c=>({...c,debtBalance:customerDebt(c.id)}));
  arr.sort((a,b)=>sort==="debt"?b.debtBalance-a.debtBalance:sort==="za"?b.name.localeCompare(a.name,"vi"):a.name.localeCompare(b.name,"vi"));
  $("#debtPageTotal").textContent=money(arr.reduce((a,c)=>a+c.debtBalance,0));$("#saleCustomer").innerHTML=`<option value="">Chọn khách</option>`+state.store.customers.map(c=>`<option value="${c.id}">${esc(c.name)}${customerDebt(c.id)?` — ${money(customerDebt(c.id))}`:""}</option>`).join("");
  $("#customers").innerHTML=arr.length?arr.map(c=>`<article class="customer-item" data-id="${c.id}"><div class="customer-summary"><strong>${esc(c.name)}</strong><strong>${money(c.debtBalance)} ›</strong></div><div class="customer-detail hidden"></div></article>`).join(""):'<div class="panel empty-state"><strong>Chưa có khách hàng</strong><p class="hint">Bấm + để thêm khách mới.</p></div>';
  $("#customers").querySelectorAll(".customer-summary").forEach(s=>s.onclick=()=>toggleCustomer(s.parentElement));
}
function toggleCustomer(card){
  const box=card.querySelector(".customer-detail"),id=card.dataset.id,c=state.store.customers.find(c=>c.id===id);
  if(!box.classList.contains("hidden"))return box.classList.add("hidden");
  const debts=[...state.store.debts.filter(d=>d.customerId===id)].reverse();
  box.innerHTML=`
    <div class="debt-compact-actions">
      <button class="primary addDebtOpen">+ Ghi nợ</button>
      <button class="file-btn payDebtOpen">Trả nợ</button>
    </div>
    <div class="debt-history-title"><strong>Lịch sử nợ</strong><span>${debts.length} khoản</span></div>
    <div class="debt-lines">${debts.map(d=>`
      <div class="debt-line debt-history-block" data-id="${d.id}">
        <div class="debt-main">
          <strong>${d.balance>0?`Còn ${money(d.balance)}`:"Đã trả"} <span class="debt-original">/ ${money(d.amount)}</span></strong>
          <small>${new Date(d.createdAt).toLocaleDateString("vi-VN")} · ${esc(d.note||"Không có ghi chú")}</small>
          ${(d.payments||[]).length?`<div class="payments-mini">${(d.payments||[]).map(p=>`<button class="payment-chip" data-debt="${d.id}" data-pay="${p.id}">${new Date(p.createdAt).toLocaleDateString("vi-VN")} · ${money(p.amount)}</button>`).join("")}</div>`:""}
        </div>
        <button class="ghost debtEdit">Sửa</button>
      </div>`).join("")||'<div class="hint">Chưa có lịch sử nợ.</div>'}
    </div>`;
  box.classList.remove("hidden");
  box.querySelector(".addDebtOpen").onclick=()=>showAddDebt(c);
  box.querySelector(".payDebtOpen").onclick=()=>showPayment(c);
  box.querySelectorAll(".debtEdit").forEach(b=>b.onclick=()=>showDebtEdit(state.store.debts.find(d=>d.id===b.closest(".debt-line").dataset.id)));
  box.querySelectorAll(".payment-chip").forEach(b=>b.onclick=()=>{const d=state.store.debts.find(x=>x.id===b.dataset.debt);const p=(d?.payments||[]).find(x=>x.id===b.dataset.pay);if(d&&p)showPaymentEdit(d,p);});
}

function showAddDebt(c){
  showModal(`<h3>Ghi nợ: ${esc(c.name)}</h3>
    <label>Ngày ghi nợ<input id="modalDebtDate" type="date" value="${todayKey()}"></label>
    <label>Số tiền<input id="modalDebtMoney" placeholder="VD 43k hoặc 150000" inputmode="decimal"></label>
    <label>Món nợ / ghi chú<input id="modalDebtNote" placeholder="VD 3 kem"></label>
    <button id="modalDebtSave" class="primary full">Lưu khoản nợ</button>`);
  $("#modalDebtSave").onclick=async()=>{
    const amount=parseMoney($("#modalDebtMoney").value);
    if(!amount)return toast("Số tiền không hợp lệ",true);
    try{
      await mutate("debt.add",{customerId:c.id,amount,note:$("#modalDebtNote").value,createdAt:$("#modalDebtDate").value+"T05:00:00.000Z"});
      closeModal();toast("Đã ghi nợ");
    }catch(e){toast(e.message,true)}
  };
}

function showPayment(c){const total=customerDebt(c.id);showModal(`<h3>${esc(c.name)} trả nợ</h3><p class="hint">Tổng còn nợ: <strong>${money(total)}</strong>. Số tiền được điền sẵn toàn bộ, có thể sửa nếu chỉ trả một phần.</p><label>Ngày trả<input id="payDate" type="date" value="${todayKey()}"></label><label>Số tiền<input id="payMoney" value="${total}" inputmode="numeric"></label><label>Ghi chú<input id="payNote"></label><button id="doPay" class="primary full">Xác nhận</button>`);$("#doPay").onclick=async()=>{const amount=parseMoney($("#payMoney").value,total);try{await mutate("debt.pay",{customerId:c.id,amount,note:$("#payNote").value,createdAt:$("#payDate").value+"T05:00:00.000Z"});closeModal();toast("Đã ghi nhận trả nợ")}catch(e){toast(e.message,true)}}}
function showDebtEdit(d){showModal(`<h3>Chỉnh khoản nợ</h3><label>Ngày ghi nợ<input id="editDebtDate" type="date" value="${String(d.createdAt).slice(0,10)}"></label><label>Số tiền<input id="editDebtMoney" value="${d.amount}"></label><label>Ghi chú / món nợ<input id="editDebtNote" value="${esc(d.note||"")}"></label><div class="row"><button id="saveDebtEdit" class="primary">Lưu</button><button id="deleteDebt" class="file-btn" style="background:#b42318">Xóa</button></div>`);$("#saveDebtEdit").onclick=async()=>{try{await mutate("debt.update",{id:d.id,amount:parseMoney($("#editDebtMoney").value,d.amount),note:$("#editDebtNote").value,createdAt:$("#editDebtDate").value+"T05:00:00.000Z"});closeModal();toast("Đã sửa khoản nợ")}catch(e){toast(e.message,true)}};$("#deleteDebt").onclick=async()=>{if(confirm("Xóa khoản nợ này?"))try{await mutate("debt.delete",{id:d.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}
function showPaymentEdit(d,p){showModal(`<h3>Chỉnh lần trả nợ</h3><p class="hint">${esc(d.customer||"")} · khoản nợ ${money(d.amount)}</p><label>Ngày trả<input id="editPayDate" type="date" value="${String(p.createdAt).slice(0,10)}"></label><label>Số tiền<input id="editPayMoney" value="${p.amount}" inputmode="numeric"></label><label>Ghi chú<input id="editPayNote" value="${esc(p.note||"")}"></label><div class="row"><button id="savePayEdit" class="primary">Lưu</button><button id="deletePay" class="file-btn" style="background:#b42318">Xóa lần trả</button></div>`);$("#savePayEdit").onclick=async()=>{try{await mutate("debt.payment.update",{debtId:d.id,paymentId:p.id,amount:parseMoney($("#editPayMoney").value,p.amount),note:$("#editPayNote").value,createdAt:$("#editPayDate").value+"T05:00:00.000Z"});closeModal();toast("Đã sửa lần trả nợ")}catch(e){toast(e.message,true)}};$("#deletePay").onclick=async()=>{if(confirm("Xóa lần trả nợ này? Số còn nợ sẽ tăng lại."))try{await mutate("debt.payment.delete",{debtId:d.id,paymentId:p.id});closeModal();toast("Đã xóa lần trả nợ")}catch(e){toast(e.message,true)}}}
$("#debtSearch").oninput=renderCustomers;$("#debtSort").onchange=renderCustomers;
$("#addCustomerBtn").onclick=()=>{showModal(`<h3>Thêm khách hàng</h3><label>Tên<input id="newCustomerName"></label><button id="saveCustomer" class="primary full">Lưu</button>`);$("#saveCustomer").onclick=async()=>{try{await mutate("customer.create",{name:$("#newCustomerName").value});closeModal();toast("Đã thêm khách")}catch(e){toast(e.message,true)}}};




function renderSupplierOptions(){const sel=$("#stockinSupplier");if(!sel)return;const cur=sel.value;sel.innerHTML='<option value="">Không chọn</option>'+(state.store.suppliers||[]).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");if((state.store.suppliers||[]).some(s=>s.id===cur))sel.value=cur}
function renderSuppliers(){renderSupplierOptions();const list=state.store.suppliers||[],payables=state.store.payables||[],total=payables.filter(p=>p.status!=="paid").reduce((s,p)=>s+(Number(p.balance)||0),0);if($("#supplierSummary"))$("#supplierSummary").innerHTML=`<span>${list.length} nhà cung cấp</span><span>Phải trả <strong>${money(total)}</strong></span>`;const box=$("#suppliersList");if(!box)return;box.innerHTML=list.length?list.map(s=>{const debt=payables.filter(p=>p.supplierId===s.id&&p.status!=="paid").reduce((a,p)=>a+(Number(p.balance)||0),0);return `<div class="list-row" data-id="${s.id}"><div><strong>${esc(s.name)}</strong><small>${esc(s.phone||"")} · phải trả ${money(debt)}</small></div><button class="ghost paySupplier">Thanh toán</button></div>`}).join(""):'<div class="hint">Chưa có nhà cung cấp.</div>';box.querySelectorAll(".paySupplier").forEach(b=>b.onclick=()=>showSupplierPayment((state.store.suppliers||[]).find(x=>x.id===b.closest(".list-row").dataset.id)))}
function showSupplierForm(){showModal(`<h3>Thêm nhà cung cấp</h3><label>Tên<input id="supName"></label><label>Điện thoại<input id="supPhone"></label><button id="saveSupplier" class="primary full">Lưu</button>`);$("#saveSupplier").onclick=async()=>{try{await mutate("supplier.create",{name:$("#supName").value,phone:$("#supPhone").value});closeModal();toast("Đã thêm nhà cung cấp")}catch(e){toast(e.message,true)}}}
function showSupplierPayment(s){const debt=(state.store.payables||[]).filter(p=>p.supplierId===s.id&&p.status!=="paid").reduce((a,p)=>a+(Number(p.balance)||0),0);showModal(`<h3>Thanh toán ${esc(s.name)}</h3><p class="hint">Đang phải trả ${money(debt)}</p><label>Số tiền<input id="supPayAmount" value="${debt}"></label><label>Phương thức<select id="supPayMethod"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label><button id="saveSupPay" class="primary full">Thanh toán</button>`);$("#saveSupPay").onclick=async()=>{try{await mutate("supplier.pay",{supplierId:s.id,amount:parseMoney($("#supPayAmount").value),method:$("#supPayMethod").value});closeModal();toast("Đã thanh toán")}catch(e){toast(e.message,true)}}}
function renderBudgets(){const box=$("#budgetsList");if(!box)return;const month=todayKey().slice(0,7),expenses=state.store.expenses||[],arr=state.store.budgets||[];box.innerHTML=arr.length?arr.map(b=>{const spent=expenses.filter(e=>monthKeyOf(e.createdAt)===month&&e.type===b.type).reduce((s,e)=>s+(Number(e.amount)||0),0),pct=b.limit?Math.round(spent/b.limit*100):0;return `<div class="budget-row" data-id="${b.id}"><div><strong>${esc(b.name)}</strong><small>${money(spent)} / ${money(b.limit)} · ${pct}%</small><div class="budget-progress"><i style="width:${Math.min(100,pct)}%"></i></div></div><button class="ghost deleteBudget">Xóa</button></div>`}).join(""):'<div class="hint">Chưa đặt ngân sách.</div>';box.querySelectorAll(".deleteBudget").forEach(b=>b.onclick=async()=>{if(confirm("Xóa ngân sách?"))try{await mutate("budget.delete",{id:b.closest(".budget-row").dataset.id});toast("Đã xóa")}catch(e){toast(e.message,true)}})}
function showBudgetForm(){showModal(`<h3>Thêm ngân sách tháng</h3><label>Tên<input id="budgetName"></label><label>Loại chi<select id="budgetType"><option value="transport">Vận chuyển</option><option value="electricity">Điện / nước</option><option value="supplies">Vật tư</option><option value="ingredient">Nguyên liệu cà phê</option><option value="manual">Chi khác</option></select></label><label>Giới hạn<input id="budgetLimit" placeholder="VD 1tr"></label><button id="saveBudget" class="primary full">Lưu</button>`);$("#saveBudget").onclick=async()=>{try{await mutate("budget.create",{name:$("#budgetName").value,type:$("#budgetType").value,limit:parseMoney($("#budgetLimit").value)});closeModal();toast("Đã thêm ngân sách")}catch(e){toast(e.message,true)}}}
$("#addSupplierBtn")?.addEventListener("click",showSupplierForm);$("#addBudgetBtn")?.addEventListener("click",showBudgetForm);

function renderExpenses(){
  const all=state.store.expenses||[];
  const q=norm($("#expenseSearch")?.value||""),type=$("#expenseType")?.value||"";
  const from=$("#expenseFrom")?.value||"",to=$("#expenseTo")?.value||"";
  const today=todayKey(),month=today.slice(0,7);
  const sum=a=>a.reduce((s,x)=>s+(Number(x.amount)||0),0);
  if($("#expenseToday"))$("#expenseToday").textContent=money(sum(all.filter(x=>dateKeyOf(x.createdAt)===today)));
  if($("#expenseMonth"))$("#expenseMonth").textContent=money(sum(all.filter(x=>monthKeyOf(x.createdAt)===month)));
  if($("#expenseStockin"))$("#expenseStockin").textContent=money(sum(all.filter(x=>x.type==="stockin")));
  const arr=[...all].filter(x=>{
    const d=dateKeyOf(x.createdAt);
    return (!q||norm((x.note||"")+" "+(x.title||"")).includes(q))&&(!type||x.type===type)&&(!from||d>=from)&&(!to||d<=to);
  }).reverse();
  const typeName=t=>({stockin:"Nhập kho",ingredient:"Nguyên liệu cà phê",electricity:"Điện / nước",transport:"Vận chuyển",supplies:"Vật tư",manual:"Chi khác"}[t]||t);
  const box=$("#expenseHistory");if(!box)return;
  box.className=`list${arr.length?"":" empty"}`;
  box.innerHTML=arr.length?arr.map(x=>`<div class="list-row" data-id="${x.id}">
    <div><strong>${money(x.amount)} · ${typeName(x.type)}</strong><small>${new Date(x.createdAt).toLocaleString("vi-VN")} · ${esc(x.note||"")}${x.type==="stockin"?" · không trừ thêm vào LN ròng":""}</small></div>
    ${x.type==="stockin"?'<span class="badge">Từ phiếu nhập</span>':'<button class="ghost editExpense">Sửa</button>'}
  </div>`).join(""):"Chưa có khoản chi.";
  box.querySelectorAll(".editExpense").forEach(b=>b.onclick=()=>showExpenseForm(all.find(x=>x.id===b.closest(".list-row").dataset.id)));
}
function showExpenseForm(x=null){
  showModal(`<h3>${x?"Chỉnh":"Thêm"} khoản chi</h3>
    <label>Ngày chi<input id="expenseDate" type="date" value="${String(x?.createdAt||todayKey()).slice(0,10)}"></label>
    <label>Loại chi<select id="expenseCategory">
      <option value="manual">Chi khác</option>
      <option value="ingredient">Nguyên liệu cà phê</option>
      <option value="electricity">Điện / nước</option>
      <option value="transport">Vận chuyển</option>
      <option value="supplies">Vật tư</option>
    </select></label>
    <label>Phương thức<select id="expenseMethod"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label>
    <label>Số tiền<input id="expenseAmount" value="${x?.amount||""}" inputmode="decimal" placeholder="VD 500k"></label>
    <label>Nội dung<input id="expenseNote" value="${esc(x?.note||"")}" placeholder="VD tiền điện, vận chuyển…"></label>
    <div class="row"><button id="saveExpense" class="primary">Lưu</button>${x?'<button id="deleteExpense" class="file-btn" style="background:#b42318">Xóa</button>':""}</div>`);
  if(x){$("#expenseCategory").value=x.type||"manual";$("#expenseMethod").value=x.method||"cash";}
  $("#saveExpense").onclick=async()=>{
    const amount=parseMoney($("#expenseAmount").value);if(!amount)return toast("Số tiền không hợp lệ",true);
    try{await mutate(x?"expense.update":"expense.create",{id:x?.id,type:$("#expenseCategory").value,method:$("#expenseMethod").value,amount,note:$("#expenseNote").value,createdAt:$("#expenseDate").value+"T05:00:00.000Z"});closeModal();toast("Đã lưu khoản chi")}catch(e){toast(e.message,true)}
  };
  if(x)$("#deleteExpense").onclick=async()=>{if(confirm("Xóa khoản chi này?"))try{await mutate("expense.delete",{id:x.id});closeModal();toast("Đã xóa khoản chi")}catch(e){toast(e.message,true)}};
}
$("#addExpenseBtn")?.addEventListener("click",()=>showExpenseForm());
$("#expenseSearch")?.addEventListener("input",renderExpenses);
$("#expenseType")?.addEventListener("change",renderExpenses);

function renderIngredients(){
  const q=norm($("#ingredientSearch")?.value||"");
  const all=state.store.ingredients||[];
  const category=syncCategoryFilter("#ingredientCategory","#ingredientCategoryChips",all,x=>String(x.category||"Nguyên liệu cà phê"));
  const arr=all.filter(x=>(!q||norm(x.name+" "+x.note).includes(q))&&(!category||String(x.category||"Nguyên liệu cà phê")===category));
  const box=$("#ingredients");if(!box)return;
  box.className=`list${arr.length?"":" empty"}`;
  box.innerHTML=arr.length?arr.map(x=>`<div class="list-row ingredient-row" data-id="${x.id}"><div><span class="category-badge">${esc(x.category||"Nguyên liệu cà phê")}</span><strong>${esc(x.name)}</strong><small>Giá nhập ${money(x.purchasePrice)} / ${num(x.packageQty)} ${esc(x.unit)} · ${x.unitCost?money(x.unitCost)+"/"+esc(x.unit):""} · tồn ${num(x.stock||0)} ${esc(x.unit)}</small><small>${esc(x.note||"")}</small></div><button class="ghost editIngredient">Sửa</button></div>`).join(""):"Chưa có nguyên liệu.";
  box.querySelectorAll(".editIngredient").forEach(b=>b.onclick=()=>showIngredientForm((state.store.ingredients||[]).find(x=>x.id===b.closest(".ingredient-row").dataset.id)));
}
$("#ingredientSearch")?.addEventListener("input",renderIngredients);$("#ingredientCategory")?.addEventListener("change",renderIngredients);
$("#addIngredientBtn")?.addEventListener("click",()=>showIngredientForm(null));
function showIngredientForm(x){
  showModal(`<h3>${x?"Chỉnh":"Thêm"} nguyên liệu</h3>
  <div class="form-grid">
    <label>Tên nguyên liệu<input id="ingName" value="${esc(x?.name||"")}"></label>
    <label>Nhóm<select id="ingCategory"><option>Nguyên liệu cà phê</option><option>Nguyên liệu khác</option>${x?.category&&!["Nguyên liệu cà phê","Nguyên liệu khác"].includes(x.category)?`<option selected>${esc(x.category)}</option>`:""}</select></label>
    <label>Đơn vị<input id="ingUnit" value="${esc(x?.unit||"g")}"></label>
    <label>Giá nhập<input id="ingPurchase" value="${x?.purchasePrice||0}" inputmode="numeric"></label>
    <label>Khối lượng / dung tích gói<input id="ingPackage" value="${x?.packageQty||1}" inputmode="decimal"></label>
    <label>Tồn hiện tại<input id="ingStock" value="${x?.stock||0}" inputmode="decimal"></label>
    <label class="wide">Ghi chú<input id="ingNote" value="${esc(x?.note||"")}"></label>
  </div>
  <p class="hint">Đơn giá/đơn vị sẽ tự tính = Giá nhập ÷ Khối lượng/dung tích.</p>
  <div class="row"><button id="saveIngredient" class="primary">Lưu</button>${x?'<button id="deleteIngredient" class="file-btn" style="background:#b42318">Xóa</button>':""}</div>`);
  $("#saveIngredient").onclick=async()=>{const payload={id:x?.id,name:$("#ingName").value,category:$("#ingCategory").value,unit:$("#ingUnit").value,purchasePrice:parseMoney($("#ingPurchase").value,x?.purchasePrice||0),packageQty:Number($("#ingPackage").value)||1,stock:Number($("#ingStock").value)||0,note:$("#ingNote").value};try{await mutate(x?"ingredient.update":"ingredient.create",payload);closeModal();toast("Đã lưu nguyên liệu")}catch(e){toast(e.message,true)}};
  if(x)$("#deleteIngredient").onclick=async()=>{if(confirm("Xóa nguyên liệu này?"))try{await mutate("ingredient.delete",{id:x.id});closeModal();toast("Đã xóa nguyên liệu")}catch(e){toast(e.message,true)}};
}

function renderProductCategories(){
  const categories=[...new Set(state.store.products.map(p=>String(p.category||"Khác").trim()||"Khác"))].sort((a,b)=>a.localeCompare(b,"vi"));
  const sel=$("#productCategory");if(!sel)return;
  const current=sel.value;
  sel.innerHTML=`<option value="">Tất cả danh mục</option>`+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if(categories.includes(current))sel.value=current;
  const chips=$("#productCategoryChips");if(chips){
    const selected=sel.value;
    chips.innerHTML=[{v:"",n:"Tất cả"},...categories.map(c=>({v:c,n:c}))].map(x=>`<button class="category-chip ${selected===x.v?"active":""}" data-category="${esc(x.v)}">${esc(x.n)} <span>${x.v?state.store.products.filter(p=>(p.category||"Khác")===x.v).length:state.store.products.length}</span></button>`).join("");
    chips.querySelectorAll(".category-chip").forEach(b=>b.onclick=()=>{sel.value=b.dataset.category;renderProducts()});
  }
}
function renderProducts(){
  renderProductCategories();
  const q=norm($("#productSearch").value),sort=$("#productSort")?.value||"name",category=$("#productCategory")?.value||"";
  let arr=state.store.products.filter(p=>(!q||norm(p.name+" "+p.category).includes(q))&&(!category||String(p.category||"Khác")===category));
  arr=[...arr].sort((a,b)=>sort==="stock-low"?(a.stock-b.stock):sort==="stock-high"?(b.stock-a.stock):a.name.localeCompare(b.name,"vi"));
  const totalStock=arr.reduce((sum,p)=>sum+(Number(p.stock)||0),0);
  const low=arr.filter(p=>p.trackStock!==false&&(Number(p.stock)||0)<=(Number(p.minStock)||0)).length;
  if($("#productSummary"))$("#productSummary").innerHTML=`<span><strong>${arr.length}</strong> mặt hàng</span><span>Tổng tồn: <strong>${num(totalStock)}</strong></span><span>Sắp/hết: <strong>${low}</strong></span>`;
  $("#products").innerHTML=arr.length?arr.map(p=>`<div class="list-row product-manage-row" data-id="${p.id}">
    <div class="product-manage-main"><span class="category-badge">${esc(p.category||"Khác")}</span><strong>${esc(p.name)}</strong><small>bán ${money(p.salePrice)} · tối thiểu ${num(p.minStock||0)} · quy cách ${num(p.packSize||1)}/${esc(p.unit||"")}</small></div>
    <div class="direct-stock-control">
      <button class="stock-step" data-step="-1">−</button>
      <button class="stock-value directStock">${num(p.stock)} ${esc(p.unit)}</button>
      <button class="stock-step" data-step="1">+</button>
      <button class="ghost editProduct">Chi tiết</button>
    </div>
  </div>`).join(""):`<div class="hint">Không có mặt hàng trong danh mục này.</div>`;
  $("#products").querySelectorAll(".editProduct").forEach(b=>b.onclick=()=>showProductForm(state.store.products.find(p=>p.id===b.closest(".list-row").dataset.id)));
  $("#products").querySelectorAll(".directStock").forEach(b=>b.onclick=()=>showDirectStockAdjust(state.store.products.find(p=>p.id===b.closest(".list-row").dataset.id)));
  $("#products").querySelectorAll(".stock-step").forEach(b=>b.onclick=async()=>{
    const row=b.closest(".list-row"),p=state.store.products.find(x=>x.id===row.dataset.id),step=Number(b.dataset.step)||0;
    const next=Math.max(0,(Number(p.stock)||0)+step);
    try{await mutate("product.stock.set",{id:p.id,stock:next,note:`Điều chỉnh nhanh ${step>0?"+":"−"}1`});toast(`Đã cập nhật tồn ${p.name}`)}catch(e){toast(e.message,true)}
  });
}
function showDirectStockAdjust(p){
  showModal(`<h3>Điều chỉnh tồn: ${esc(p.name)}</h3>
    <p class="hint">Tồn hiện tại: <strong>${num(p.stock)} ${esc(p.unit)}</strong>. Thao tác này chỉ đổi số lượng tồn của mặt hàng.</p>
    <label>Số lượng tồn mới<input id="directStockValue" type="number" min="0" step="1" value="${p.stock}" inputmode="decimal"></label>
    <label>Lý do / ghi chú<input id="directStockNote" placeholder="VD: chỉnh tồn đầu kỳ, sửa số nhập nhầm"></label>
    <div class="stock-presets">
      <button class="ghost stockPreset" data-v="0">Về 0</button>
      <button class="ghost stockPreset" data-v="${Math.max(0,(Number(p.stock)||0)-1)}">−1</button>
      <button class="ghost stockPreset" data-v="${(Number(p.stock)||0)+1}">+1</button>
      <button class="ghost stockPreset" data-v="${(Number(p.stock)||0)+(Number(p.packSize)||1)}">+1 thùng</button>
    </div>
    <button id="saveDirectStock" class="primary full">Lưu số lượng tồn</button>`);
  $$(".stockPreset").forEach(b=>b.onclick=()=>$("#directStockValue").value=b.dataset.v);
  $("#saveDirectStock").onclick=async()=>{
    const next=Math.max(0,Number($("#directStockValue").value)||0);
    try{
      await mutate("product.stock.set",{id:p.id,stock:next,note:$("#directStockNote").value});
      closeModal();toast(`Đã chỉnh tồn ${p.name}: ${num(next)} ${p.unit}`);
    }catch(e){toast(e.message,true)}
  };
}

function showProductForm(p){showModal(`<h3>${p?"Chỉnh":"Thêm"} sản phẩm</h3><div class="form-grid"><label>Tên<input id="pName" value="${esc(p?.name||"")}"></label><label>Nhóm<select id="pCat"><option>Cà phê</option><option>Nước</option><option>Bánh Oishi</option><option>Kem</option><option>Khác</option>${p?.category&&!["Cà phê","Nước","Bánh Oishi","Kem","Khác"].includes(p.category)?`<option selected>${esc(p.category)}</option>`:""}</select></label><label>Đơn vị<input id="pUnit" value="${esc(p?.unit||"chai")}"></label><label>Quy cách<input id="pPack" value="${p?.packSize||1}" inputmode="numeric"></label><label>Giá nhập/thùng<input id="pCost" value="${p?.purchasePackPrice||p?.purchasePrice||p?.costPrice||0}" inputmode="numeric"></label><label>Giá bán<input id="pSale" value="${p?.salePrice||0}" inputmode="numeric"></label><label>Tồn hiện tại<input id="pStock" value="${p?.stock||0}" inputmode="numeric"></label><label>Tồn tối thiểu<input id="pMin" value="${p?.minStock||0}" inputmode="numeric"></label></div><div class="row"><button id="saveProduct" class="primary">Lưu</button>${p?'<button id="deleteProduct" class="file-btn" style="background:#b42318">Xóa</button>':""}</div>`);if(p&&[...$("#pCat").options].some(o=>o.value===p.category))$("#pCat").value=p.category;$("#saveProduct").onclick=async()=>{const payload={id:p?.id,name:$("#pName").value,category:$("#pCat").value,unit:$("#pUnit").value,packSize:+$("#pPack").value||1,costPrice:parseMoney($("#pCost").value),salePrice:parseMoney($("#pSale").value),stock:+$("#pStock").value||0,minStock:+$("#pMin").value||0};try{await mutate(p?"product.update":"product.create",payload);closeModal();toast("Đã lưu sản phẩm")}catch(e){toast(e.message,true)}};if(p)$("#deleteProduct").onclick=async()=>{if(confirm("Xóa mặt hàng?"))try{await mutate("product.delete",{id:p.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}


function productPurchasePackCost(p){
  const v=Number(p.purchasePackPrice||p.purchasePrice||p.costPrice||p.cost||0);
  return v>0?v:0;
}
function productPurchaseUnitCost(p){
  const pack=Math.max(1,Number(p.packSize)||1);
  const packCost=productPurchasePackCost(p);
  if(packCost>0)return packCost/pack;
  const unit=Number(p.unitCost||0);
  return unit>0?unit:0;
}
function calcStockinLinesFromUI(){
  return [...document.querySelectorAll("#stockinProducts .stockin-row")].map(r=>{
    const p=state.store.products.find(x=>x.id===r.dataset.id);if(!p)return null;
    const cases=Math.max(0,Number(r.querySelector(".cases")?.value)||0);
    const units=Math.max(0,Number(r.querySelector(".units")?.value)||0);
    const pack=Math.max(1,Number(p.packSize)||1);
    const qtyTotal=cases*pack+units;
    const packCost=Math.max(0,Number(r.querySelector(".purchasePackCost")?.value)||productPurchasePackCost(p));
    const unitCost=packCost>0?packCost/pack:productPurchaseUnitCost(p);
    const cost=cases*packCost+units*unitCost;
    return {productId:p.id,cases,units,qty:qtyTotal,packSize:pack,packCost,unitCost,cost};
  }).filter(Boolean).filter(x=>x.qty>0);
}
function updateStockinTotalCost(){
  const el=$("#stockinTotalCost");if(!el)return;
  el.textContent=money(calcStockinLinesFromUI().reduce((s,x)=>s+x.cost,0));
}

function renderStockin(){const q=norm($("#stockinSearch").value),arr=state.store.products.filter(p=>p.trackStock!==false&&(!q||norm(p.name).includes(q)));$("#stockinProducts").innerHTML=arr.map(p=>`<div class="stockin-row" data-id="${p.id}"><div><strong>${esc(p.name)}</strong><small>Tồn ${num(p.stock)} · ${num(p.packSize)} / thùng · giá nhập ${money(productPurchasePackCost(p))}/thùng</small></div><input class="cases" type="number" min="0" placeholder="Thùng"><input class="units" type="number" min="0" placeholder="Lẻ"><input class="purchasePackCost" type="number" min="0" value="${productPurchasePackCost(p)}" placeholder="Giá/thùng"></div>`).join("");$$("#stockinProducts .cases, #stockinProducts .units, #stockinProducts .purchasePackCost").forEach(i=>i.addEventListener("input",updateStockinTotalCost));updateStockinTotalCost();
  const hist=[...state.store.stockReceipts].reverse().slice(0,100);$("#stockinHistory").className=`list${hist.length?"":" empty"}`;$("#stockinHistory").innerHTML=hist.length?hist.map(r=>`<div class="list-row" data-id="${r.id}"><div><strong>${safeDateText(r.createdAt)}</strong><small>${esc(r.note||"Phiếu nhập")} · ${r.lines.length} mặt hàng · ${money(r.totalCost||0)}</small></div><div class="row-actions"><button class="ghost editReceipt">Sửa</button><button class="ghost danger-text deleteReceipt">Xóa</button></div></div>`).join(""):"Chưa có phiếu.";$("#stockinHistory").querySelectorAll(".editReceipt").forEach(b=>b.onclick=()=>showStockinEdit(state.store.stockReceipts.find(r=>r.id===b.closest(".list-row").dataset.id)));
$("#stockinHistory").querySelectorAll(".deleteReceipt").forEach(b=>b.onclick=async()=>{if(confirm("Xóa phiếu và trừ lại kho?"))try{await mutate("stockin.delete",{id:b.closest(".list-row").dataset.id});toast("Đã xóa phiếu")}catch(e){toast(e.message,true)}})}

function showStockinEdit(r){
  if(!r)return;
  const dateVal=(()=>{const d=new Date(r.createdAt);return Number.isNaN(d.getTime())?todayKey():dateKeyOf(r.createdAt)})();
  const suppliers=state.store.suppliers||[];
  showModal(`<h3>Chỉnh phiếu nhập</h3>
    <div class="form-grid">
      <label>Ngày nhập<input id="editStockinDate" type="date" value="${dateVal}"></label>
      <label>Nhà cung cấp<select id="editStockinSupplier"><option value="">Không chọn</option>${suppliers.map(s=>`<option value="${s.id}" ${s.id===r.supplierId?"selected":""}>${esc(s.name)}</option>`).join("")}</select></label>
      <label>Thanh toán<select id="editStockinStatus"><option value="paid" ${r.paymentStatus!=="unpaid"?"selected":""}>Đã thanh toán</option><option value="unpaid" ${r.paymentStatus==="unpaid"?"selected":""}>Chưa thanh toán</option></select></label>
      <label>Phương thức<select id="editStockinMethod"><option value="cash" ${r.method!=="transfer"?"selected":""}>Tiền mặt</option><option value="transfer" ${r.method==="transfer"?"selected":""}>Chuyển khoản</option></select></label>
      <label class="wide">Ghi chú<input id="editStockinNote" value="${esc(r.note||"")}"></label>
    </div>
    <div class="edit-stockin-lines">
      ${(r.lines||[]).map(l=>{const p=state.store.products.find(x=>x.id===l.productId)||{};const pack=Math.max(1,Number(l.packSize||p.packSize)||1);const packCost=Number(l.packCost||p.purchasePackPrice||p.purchasePrice||p.costPrice||0);return `<div class="edit-stockin-line" data-product="${l.productId}">
        <div><strong>${esc(p.name||l.name||"Mặt hàng")}</strong><small>${pack} ${esc(p.unit||"đv")}/thùng</small></div>
        <label>Thùng<input class="eCases" type="number" min="0" value="${Number(l.cases)||0}"></label>
        <label>Lẻ<input class="eUnits" type="number" min="0" value="${Number(l.units)||0}"></label>
        <label>Giá/thùng<input class="ePackCost" type="number" min="0" value="${packCost}"></label>
      </div>`}).join("")}
    </div>
    <div class="stockin-cost-card"><div><small>Tổng tiền sau sửa</small><strong id="editStockinTotal">${money(r.totalCost||0)}</strong></div></div>
    <button id="saveStockinEdit" class="primary full">Lưu thay đổi</button>`);
  const recalc=()=>{
    let total=0;
    $$(".edit-stockin-line").forEach(row=>{
      const p=state.store.products.find(x=>x.id===row.dataset.product)||{};
      const pack=Math.max(1,Number(p.packSize)||1),cases=Math.max(0,Number(row.querySelector(".eCases").value)||0),units=Math.max(0,Number(row.querySelector(".eUnits").value)||0),packCost=Math.max(0,Number(row.querySelector(".ePackCost").value)||0);
      total+=cases*packCost+units*(packCost/pack);
    });
    $("#editStockinTotal").textContent=money(total);
  };
  $$(".edit-stockin-line input").forEach(i=>i.addEventListener("input",recalc));
  $("#saveStockinEdit").onclick=async()=>{
    const lines=$$(".edit-stockin-line").map(row=>{
      const p=state.store.products.find(x=>x.id===row.dataset.product)||{},pack=Math.max(1,Number(p.packSize)||1),cases=Math.max(0,Number(row.querySelector(".eCases").value)||0),units=Math.max(0,Number(row.querySelector(".eUnits").value)||0),packCost=Math.max(0,Number(row.querySelector(".ePackCost").value)||0);
      const qty=cases*pack+units,unitCost=packCost/pack,cost=cases*packCost+units*unitCost;
      return {productId:row.dataset.product,cases,units,qty,packSize:pack,packCost,unitCost,cost};
    }).filter(x=>x.qty>0);
    try{
      await mutate("stockin.update",{id:r.id,createdAt:$("#editStockinDate").value+"T05:00:00.000Z",note:$("#editStockinNote").value,supplierId:$("#editStockinSupplier").value,paymentStatus:$("#editStockinStatus").value,method:$("#editStockinMethod").value,lines,totalCost:lines.reduce((s,x)=>s+x.cost,0)});
      closeModal();toast("Đã cập nhật phiếu nhập");
    }catch(e){toast(e.message,true)}
  };
}

$("#stockinSearch").oninput=renderStockin;$("#saveStockin").onclick=async()=>{
  const lines=calcStockinLinesFromUI();
  if(!lines.length)return toast("Chưa nhập số lượng",true);
  const totalCost=lines.reduce((s,x)=>s+x.cost,0);
  try{
    await mutate("stockin.create",{createdAt:$("#stockinDate").value+"T05:00:00.000Z",note:$("#stockinNote").value,lines,totalCost,supplierId:$("#stockinSupplier")?.value||"",paymentStatus:$("#stockinPaymentStatus")?.value||"paid",method:$("#stockinMethod")?.value||"cash"});
    toast(`Đã nhập kho · Chi ${money(totalCost)}`);
  }catch(e){toast(e.message,true)}
};

function renderAudit(){const q=norm($("#auditSearch").value),arr=state.store.products.filter(p=>p.trackStock!==false&&(!q||norm(p.name).includes(q)));$("#auditProducts").innerHTML=arr.map(p=>`<div class="audit-row" data-id="${p.id}"><div><strong>${esc(p.name)}</strong><small>Tồn hệ thống ${num(p.stock)} ${esc(p.unit)}</small></div><input class="actual" type="number" min="0" value="${p.stock}"></div>`).join("");const hist=[...state.store.audits].reverse().slice(0,100);$("#auditHistory").className=`list${hist.length?"":" empty"}`;$("#auditHistory").innerHTML=hist.length?hist.map(a=>`<div class="list-row" data-id="${a.id}"><div><strong>${new Date(a.createdAt).toLocaleString("vi-VN")}</strong><small>${esc(a.note||"Kiểm kho")} · ${a.lines.length} mặt hàng</small></div><button class="ghost editAudit">Sửa</button></div>`).join(""):"Chưa có lần kiểm kho.";$("#auditHistory").querySelectorAll(".editAudit").forEach(b=>b.onclick=()=>showAuditEdit(state.store.audits.find(a=>a.id===b.closest(".list-row").dataset.id)))}
$("#auditSearch").oninput=renderAudit;$("#saveAudit").onclick=async()=>{const lines=$$("#auditProducts .audit-row").map(r=>({productId:r.dataset.id,actual:+r.querySelector(".actual").value||0}));try{await mutate("audit.create",{note:$("#auditNote").value,lines});toast("Đã chốt kiểm kho")}catch(e){toast(e.message,true)}};
function showAuditEdit(a){showModal(`<h3>Chỉnh đơn kiểm kho</h3><label>Ghi chú<input id="auditEditNote" value="${esc(a.note||"")}"></label>${a.lines.map(l=>`<label>${esc(l.name)}<input class="auditEditActual" data-id="${l.productId}" type="number" value="${l.actual}"></label>`).join("")}<div class="row"><button id="saveAuditEdit" class="primary">Lưu</button><button id="deleteAudit" class="file-btn" style="background:#b42318">Xóa</button></div>`);$("#saveAuditEdit").onclick=async()=>{const lines=$$(".auditEditActual").map(i=>({productId:i.dataset.id,actual:+i.value||0}));try{await mutate("audit.update",{id:a.id,note:$("#auditEditNote").value,lines});closeModal();toast("Đã sửa kiểm kho")}catch(e){toast(e.message,true)}};$("#deleteAudit").onclick=async()=>{if(confirm("Xóa đơn kiểm kho?"))try{await mutate("audit.delete",{id:a.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}

function renderTransactions(){const arr=[...state.store.transactions].reverse().slice(0,200);$("#transactions").className=`list${arr.length?"":" empty"}`;$("#transactions").innerHTML=arr.length?arr.map(t=>`<div class="list-row"><div><strong>${esc(t.summary)}</strong><small>${new Date(t.createdAt).toLocaleString("vi-VN")} · ${esc(t.id)}</small></div></div>`).join(""):"Chưa có giao dịch."}
function renderSnapshots(){const arr=[...state.store.snapshots].reverse();$("#snapshots").className=`list${arr.length?"":" empty"}`;$("#snapshots").innerHTML=arr.length?arr.map(s=>`<div class="list-row" data-id="${s.id}"><div><strong>${esc(s.label)}</strong><small>${new Date(s.createdAt).toLocaleString("vi-VN")}</small></div><button class="ghost restoreSnapshot">Khôi phục</button></div>`).join(""):"Chưa có snapshot.";$("#snapshots").querySelectorAll(".restoreSnapshot").forEach(b=>b.onclick=async()=>{if(confirm("Khôi phục snapshot này?"))try{await mutate("snapshot.restore",{id:b.closest(".list-row").dataset.id});toast("Đã khôi phục")}catch(e){toast(e.message,true)}})}
$("#createSnapshot").onclick=async()=>{try{await mutate("snapshot.create",{label:"Snapshot "+new Date().toLocaleString("vi-VN")});toast("Đã tạo snapshot")}catch(e){toast(e.message,true)}};

function renderStores(){$("#stores").innerHTML=state.stores.map(s=>`<div class="list-row"><div><strong>${esc(s.name)}</strong><small>${s.id===state.storeId?"Đang dùng":""}</small></div></div>`).join("")}
$("#newStore").onclick=()=>{showModal(`<h3>Tạo cửa hàng mới</h3><label>Tên<input id="newStoreName"></label><button id="saveNewStore" class="primary full">Tạo cửa hàng</button>`);$("#saveNewStore").onclick=async()=>{try{await mutate("store.create",{name:$("#newStoreName").value});closeModal();toast("Đã tạo cửa hàng")}catch(e){toast(e.message,true)}}};

function addBubble(text,kind="ai",extra=""){const b=document.createElement("div");b.className=`bubble ${kind} ${extra}`;b.textContent=text;$("#chat").appendChild(b);$("#chat").scrollTop=$("#chat").scrollHeight;return b}
async function sendAI(text){text=text.trim();if(!text)return;addBubble(text,"user");$("#aiInput").value="";try{const r=await api("/api/ai/plan",{method:"POST",body:JSON.stringify({storeId:state.storeId,message:text})});if(r.type==="answer")return addBubble(r.answer,"ai");const b=addBubble(`Tôi hiểu: ${r.summary}`,"ai","preview");const row=document.createElement("div");row.className="row";row.innerHTML='<button class="primary small">Xác nhận</button><button class="file-btn" style="background:#64748b">Hủy</button>';b.appendChild(row);row.children[0].onclick=async()=>{try{await mutate("ai.execute",{plan:r.plan,message:text});b.textContent="Đã thực hiện: "+r.summary;toast("AI đã thực hiện")}catch(e){toast(e.message,true)}};row.children[1].onclick=()=>{b.textContent="Đã hủy thao tác."}}catch(e){addBubble("Lỗi: "+e.message,"ai");}}
$("#sendAi").onclick=()=>sendAI($("#aiInput").value);$("#aiInput").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAI(e.target.value)}};$$(".quick-prompts button").forEach(b=>b.onclick=()=>sendAI(b.dataset.prompt));

function download(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)}
async function readFile(f){return JSON.parse(await f.text())}
$("#exportStore").onclick=()=>download({format:"cantin-ai-next-store",version:1,store:state.store},`cantin-store-${todayKey()}.node.json`);
$("#importStore").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=await readFile(f);if(o.format!=="cantin-ai-next-store")throw new Error("Sai định dạng");await mutate("store.import",{store:o.store});toast("Đã nhập dữ liệu")}catch(x){toast(x.message,true)}e.target.value=""};
$("#exportConfig").onclick=()=>download({format:"cantin-ai-next-config",version:1,config:state.store.config,aliases:state.store.aliases},`cantin-config-${todayKey()}.node.json`);
$("#importConfig").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=await readFile(f);if(o.format!=="cantin-ai-next-config")throw new Error("Sai định dạng");await mutate("config.import",o);toast("Đã nhập cấu hình")}catch(x){toast(x.message,true)}e.target.value=""};
$("#validatePackage").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=await readFile(f);const r=await api("/api/package/validate",{method:"POST",body:JSON.stringify(o)});$("#packageStatus").textContent=`Hợp lệ: ${r.version} · ${r.fileCount} file. Cần deploy qua GitHub/Cloudflare để áp dụng.`}catch(x){$("#packageStatus").textContent=x.message}e.target.value=""};


$$(".inventory-subtabs .subtab").forEach(btn=>btn.addEventListener("click",()=>{
  const key=btn.dataset.subtab;
  $$(".inventory-subtabs .subtab").forEach(x=>x.classList.toggle("active",x===btn));
  $$('[data-subpage^="audit-"]').forEach(p=>p.classList.toggle("active",p.dataset.subpage===key));
  if(key==="audit-stockin")renderStockin();else renderAudit();
}));


$("#financeRangePreset")?.addEventListener("change",()=>{const c=$("#financeRangePreset").value==="custom";$("#financeFrom")?.classList.toggle("hidden",!c);$("#financeTo")?.classList.toggle("hidden",!c);renderFinanceReport()});$("#financeFrom")?.addEventListener("change",renderFinanceReport);$("#financeTo")?.addEventListener("change",renderFinanceReport);
$("#openFinanceReport")?.addEventListener("click",()=>goPage("expenses"));
$$("[data-finance-open]").forEach(b=>b.addEventListener("click",()=>{
  goPage("expenses");
  const want=b.dataset.financeOpen==="expense"?"finance-expense":b.dataset.financeOpen==="revenue"?"finance-revenue":"finance-summary";
  $$(".finance-tabs .subtab").forEach(x=>x.classList.toggle("active",x.dataset.financeTab===want));
  $$("[data-finance-page]").forEach(x=>x.classList.toggle("active",x.dataset.financePage===want));
}));
$$(".finance-tabs .subtab").forEach(b=>b.addEventListener("click",()=>{
  const key=b.dataset.financeTab;
  $$(".finance-tabs .subtab").forEach(x=>x.classList.toggle("active",x===b));
  $$("[data-finance-page]").forEach(x=>x.classList.toggle("active",x.dataset.financePage===key));
  renderFinanceReport();
}));
$$(".warehouse-jump").forEach(b=>b.addEventListener("click",()=>goPage(b.dataset.jump)));
$$(".back-to-warehouse").forEach(b=>b.addEventListener("click",()=>goPage("audit")));
$$(".more-jump").forEach(b=>b.addEventListener("click",()=>goPage(b.dataset.jump)));
$$(".back-to-more").forEach(b=>b.addEventListener("click",()=>goPage("assistant")));
$("#miniDebtLink")?.addEventListener("click",()=>goPage("debts"));
$("#miniLowLink")?.addEventListener("click",()=>goPage("products"));


$("#recoveryExport")?.addEventListener("click",async()=>{
  try{
    const r=await api("/api/recovery/export");
    download(r,`cantin-recovery-v5.1.9-${todayKey()}.json`);
    toast("Đã tạo bản sao dữ liệu");
  }catch(e){toast(e.message,true)}
});
boot();

if("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(()=>{});

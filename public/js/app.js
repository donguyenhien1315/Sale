
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={revision:0,storeId:"",store:null,stores:[],cart:[],editingSaleId:"",editingReceiptId:"",editingAuditId:"",aiContext:{productId:"",customerId:""}};
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
  if(!res.ok) throw new Error(data.error||data.message||`Lỗi máy chủ (${res.status})`);
  return data;
}
function toast(msg,error=false){const t=$("#toast");t.textContent=msg;t.className=`toast show${error?" error":""}`;clearTimeout(t._x);t._x=setTimeout(()=>t.className="toast",2600)}
function showModal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function showBottomSheet(html,kind="detail"){$("#modal").classList.add("bottom-sheet",`sheet-${kind}`);showModal(html)}
function closeModal(){$("#modal").classList.add("hidden");$("#modal").className="modal hidden"}
$("#closeModal").onclick=closeModal;

async function boot(){
  try{
    $("#boot").classList.remove("hidden");
    const data=await api("/api/bootstrap");
    state.revision=data.revision;state.storeId=data.storeId;state.store=data.store;state.stores=data.stores;
    renderAll();
    $("#boot").classList.add("hidden");
  }catch(e){$("#boot").textContent="Lỗi: "+e.message;toast(e.message,true)}
}
function renderAll(){
  $("#storeName").textContent=state.store.meta?.name||"Cửa hàng";
  $("#storeSelect").innerHTML=state.stores.map(s=>`<option value="${s.id}" ${s.id===state.storeId?"selected":""}>${esc(s.name)}</option>`).join("");
  $("#saleDate").value=$("#saleDate").value||dtLocal();$("#stockinDate").value=$("#stockinDate").value||dtLocal();$("#auditDate").value=$("#auditDate").value||dtLocal();$("#auditPeriodMonth").value=$("#auditPeriodMonth").value||defaultAuditPeriodKey($("#auditDate").value);$("#auditReportMonth").value=$("#auditReportMonth").value||monthKeyLocal(new Date());
  renderDataSafety();renderDashboard();renderIngredients();renderProducts();renderSaleCustomers();renderSales();renderCustomers();renderStockin();renderAudit();renderAuditPeriodReport();renderTransactions();renderSnapshots();renderStores();renderQuickProducts();renderCart();renderAliases();renderAIContext();renderAISettings();renderAIOperationHistory();
}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===page));
  const navPage=["ingredients","assistant","activity","data"].includes(page)?"more":page;
  $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.target===navPage));
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

function localDayKey(date=new Date()){const p=n=>String(n).padStart(2,"0");return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`}
function salesForDay(date=new Date()){const key=localDayKey(date);return state.store.sales.filter(s=>String(s.createdAt).slice(0,10)===key)}
function aggregateSales(sales){
  const pay={cash:0,transfer:0,debt:0},categories=new Map(),products=new Map(),hours=new Map();
  let revenue=0,profit=0,cost=0,qty=0;
  for(const s of sales){
    revenue+=+s.total||0;profit+=+s.profit||0;cost+=+s.costTotal||0;
    pay[s.paymentMethod]=(+pay[s.paymentMethod]||0)+(+s.total||0);
    const hour=new Date(s.createdAt).getHours();
    hours.set(hour,(hours.get(hour)||0)+(+s.total||0));
    for(const l of s.items||[]){
      const q=+l.quantity||0,sub=+l.subtotal||q*(+l.unitPrice||0),lineProfit=q*((+l.unitPrice||0)-(+l.costPrice||0));
      qty+=q;
      const cat=l.category||state.store.products.find(p=>p.id===l.productId)?.category||"Khác";
      const c=categories.get(cat)||{name:cat,revenue:0,profit:0,qty:0};
      c.revenue+=sub;c.profit+=lineProfit;c.qty+=q;categories.set(cat,c);
      const p=products.get(l.productId)||{id:l.productId,name:l.name||state.store.products.find(x=>x.id===l.productId)?.name||"Sản phẩm",revenue:0,profit:0,qty:0};
      p.revenue+=sub;p.profit+=lineProfit;p.qty+=q;products.set(l.productId,p);
    }
  }
  return {
    revenue,profit,cost,qty,orders:sales.length,pay,
    categories:[...categories.values()].sort((a,b)=>b.revenue-a.revenue),
    products:[...products.values()].sort((a,b)=>b.revenue-a.revenue),
    profitProducts:[...products.values()].sort((a,b)=>b.profit-a.profit),
    hours:[...hours.entries()].sort((a,b)=>a[0]-b[0]).map(([hour,revenue])=>({hour,revenue}))
  };
}
function dashboardComparePercent(current,previous){
  if(!previous)return current?null:0;
  return (current-previous)/previous*100;
}
function compareBadge(current,previous,label="hôm qua"){
  const pct=dashboardComparePercent(current,previous);
  if(pct===null)return `<span class="compare neutral">Chưa có dữ liệu ${label}</span>`;
  const cls=pct>0?"up":pct<0?"down":"neutral";
  const arrow=pct>0?"↑":pct<0?"↓":"→";
  return `<span class="compare ${cls}">${arrow} ${Math.abs(pct).toFixed(1)}% so với ${label}</span>`;
}
function dashboardSheetData(){
  const today=salesForDay(new Date()),yd=new Date();yd.setDate(yd.getDate()-1);
  return {today:aggregateSales(today),yesterday:aggregateSales(salesForDay(yd)),sales:today};
}
function paymentLabel(k){return k==="cash"?"Tiền mặt":k==="transfer"?"Chuyển khoản":"Ghi nợ"}
function renderMiniBars(rows,valueKey="revenue",limit=6){
  const arr=(rows||[]).slice(0,limit),max=Math.max(1,...arr.map(x=>+x[valueKey]||0));
  return arr.map(x=>`<div class="mini-bar-row"><div><strong>${esc(x.name)}</strong><small>${valueKey==="profit"?money(x.profit):money(x.revenue)}${x.qty?` · ${num(x.qty)} SP`:""}</small></div><span class="mini-bar"><i style="width:${Math.max(4,(+x[valueKey]||0)/max*100)}%"></i></span></div>`).join("")||'<div class="hint">Chưa có dữ liệu.</div>'
}
function showRevenueDetail(){
  const {today,yesterday,sales}=dashboardSheetData();
  const paymentRows=Object.entries(today.pay).filter(([,v])=>v>0).map(([k,v])=>`<div class="detail-kv"><span>${paymentLabel(k)}</span><strong>${money(v)}</strong></div>`).join("")||'<div class="hint">Chưa có thanh toán hôm nay.</div>';
  const hourMax=Math.max(1,...today.hours.map(x=>x.revenue));
  const hours=today.hours.map(x=>`<div class="hour-bar"><span>${String(x.hour).padStart(2,"0")}h</span><i style="height:${Math.max(8,x.revenue/hourMax*72)}px"></i><small>${money(x.revenue)}</small></div>`).join("")||'<div class="hint">Chưa có dữ liệu theo giờ.</div>';
  showBottomSheet(`<div class="sheet-head"><div><div class="eyebrow">CHI TIẾT HÔM NAY</div><h2>Doanh thu ${money(today.revenue)}</h2></div>${compareBadge(today.revenue,yesterday.revenue)}</div>
    <div class="detail-grid">
      <div><span>Số đơn</span><b>${today.orders}</b></div><div><span>Sản phẩm</span><b>${num(today.qty)}</b></div>
      <div><span>Giá trị TB/đơn</span><b>${money(today.orders?today.revenue/today.orders:0)}</b></div><div><span>Lợi nhuận</span><b>${money(today.profit)}</b></div>
    </div>
    <h3>Thanh toán</h3><div class="detail-list">${paymentRows}</div>
    <h3>Doanh thu theo nhóm</h3><div class="mini-bars">${renderMiniBars(today.categories,"revenue",8)}</div>
    <h3>Sản phẩm doanh thu cao</h3><div class="mini-bars">${renderMiniBars(today.products,"revenue",5)}</div>
    <h3>Doanh thu theo giờ</h3><div class="hour-bars">${hours}</div>
    <div class="sheet-actions"><button id="openTodaySales" class="primary full">Xem toàn bộ đơn hàng hôm nay (${sales.length})</button></div>`,"revenue");
  $("#openTodaySales").onclick=()=>{closeModal();navigate("sales");document.querySelector("#salesHistory")?.scrollIntoView({behavior:"smooth",block:"start"})};
}
function showProfitDetail(){
  const {today,yesterday}=dashboardSheetData(),margin=today.revenue?today.profit/today.revenue*100:0;
  const lowMargin=today.products.map(x=>{
    const p=state.store.products.find(y=>y.id===x.id),sale=+p?.salePrice||0,cost=+p?.costPrice||0,m=sale?sale-cost:0,rate=sale?m/sale*100:0;
    return {...x,sale,cost,rate}
  }).filter(x=>x.sale>0&&x.rate<20).sort((a,b)=>a.rate-b.rate).slice(0,6);
  showBottomSheet(`<div class="sheet-head"><div><div class="eyebrow">PHÂN TÍCH HÔM NAY</div><h2>Lợi nhuận ${money(today.profit)}</h2></div>${compareBadge(today.profit,yesterday.profit)}</div>
    <div class="detail-grid">
      <div><span>Doanh thu</span><b>${money(today.revenue)}</b></div><div><span>Giá vốn</span><b>${money(today.cost)}</b></div>
      <div><span>Biên lợi nhuận</span><b>${margin.toFixed(1)}%</b></div><div><span>Số đơn</span><b>${today.orders}</b></div>
    </div>
    <h3>Lợi nhuận theo nhóm</h3><div class="mini-bars">${renderMiniBars([...today.categories].sort((a,b)=>b.profit-a.profit),"profit",8)}</div>
    <h3>Mặt hàng lời nhiều nhất</h3><div class="mini-bars">${renderMiniBars(today.profitProducts,"profit",5)}</div>
    <h3>Cảnh báo biên lợi nhuận thấp</h3>
    <div class="detail-list">${lowMargin.length?lowMargin.map(x=>`<div class="detail-kv warning"><div><strong>${esc(x.name)}</strong><small>Giá vốn ${money(x.cost)} · bán ${money(x.sale)}</small></div><b>${x.rate.toFixed(1)}%</b></div>`).join(""):'<div class="hint">Không có mặt hàng bán hôm nay có biên dưới 20%.</div>'}</div>
    <div class="sheet-actions"><button id="openProfitSales" class="primary full">Xem các đơn hàng hôm nay</button></div>`,"profit");
  $("#openProfitSales").onclick=()=>{closeModal();navigate("sales");document.querySelector("#salesHistory")?.scrollIntoView({behavior:"smooth",block:"start"})};
}


function renderDataSafety(){
  const b=$("#dataSafetyBanner");if(!b||!state.store)return;
  const empty=(state.store.products?.length||0)+(state.store.customers?.length||0)+(state.store.debts?.length||0)+(state.store.sales?.length||0)===0;
  b.classList.toggle("hidden",!empty);
}
$("#goRecovery")?.addEventListener("click",()=>navigate("data"));

function renderDashboard(){
  const d=dashboardData();$("#todayRevenue").textContent=money(d.rev);$("#todayProfit").textContent=money(d.profit);$("#totalDebt").textContent=money(d.debt);$("#lowStockCount").textContent=d.low.length;
  const insights=[];
  d.low.slice(0,8).forEach(p=>insights.push({t:p.stock<=0?`${p.name} đã hết`:`${p.name} sắp hết`,d:`Tồn ${num(p.stock)} ${p.unit||""} · tối thiểu ${num(p.minStock)}`,target:"products"}));
  const weird=state.store.debts.filter(x=>x.balance>0&&x.balance<1000);weird.forEach(x=>{const c=state.store.customers.find(c=>c.id===x.customerId);insights.push({t:`Kiểm tra khoản nợ nhỏ: ${c?.name||""}`,d:`${money(x.balance)} · ${x.note||""}`,target:"debts"})});
  $("#insights").className=`list${insights.length?"":" empty"}`;$("#insights").innerHTML=insights.length?insights.map(x=>`<div class="list-row"><div><strong>${esc(x.t)}</strong><small>${esc(x.d)}</small></div><button class="ghost nav-target" data-target="${x.target}">Mở</button></div>`).join(""):"Không có cảnh báo đáng chú ý.";
  $("#insights").querySelectorAll(".nav-target").forEach(b=>b.onclick=()=>navigate(b.dataset.target));
  const tx=[...state.store.transactions].reverse().slice(0,5);$("#recentTx").className=`list${tx.length?"":" empty"}`;$("#recentTx").innerHTML=tx.length?tx.map(t=>`<div class="list-row"><div><strong>${esc(t.summary)}</strong><small>${new Date(t.createdAt).toLocaleString("vi-VN")}</small></div></div>`).join(""):"Chưa có thao tác.";
}
$("#refreshInsights").onclick=renderDashboard;
$("#dashboardRevenueCard")?.addEventListener("click",showRevenueDetail);
$("#dashboardProfitCard")?.addEventListener("click",showProfitDetail);



const categoryState={sale:"",stockin:"",audit:"",product:""};

const auditDraft={};
function renderCategoryButtons(chipsId,key,items,rerender){
  const chips=$(chipsId);if(!chips)return "";
  const activeItems=(items||[]).filter(p=>p.active!==false);
  const categories=[...new Set(activeItems.map(p=>String(p.category||"Khác").trim()||"Khác"))].sort((a,b)=>a.localeCompare(b,"vi"));
  if(categoryState[key]&&!categories.includes(categoryState[key]))categoryState[key]="";
  const selected=categoryState[key]||"";
  const all=[{v:"",n:"Tất cả"},...categories.map(c=>({v:c,n:c}))];
  chips.className="category-chips compact-category-chips";
  chips.innerHTML=all.map(x=>{
    const count=x.v?activeItems.filter(p=>String(p.category||"Khác")===x.v).length:activeItems.length;
    return `<button class="category-chip ${selected===x.v?"active":""}" data-category="${esc(x.v)}">${esc(x.n)} <span>${count}</span></button>`
  }).join("");
  chips.querySelectorAll(".category-chip").forEach(b=>b.onclick=()=>{categoryState[key]=b.dataset.category||"";rerender()});
  return selected;
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
  const category=renderCategoryButtons("#saleCategoryChips","sale",state.store.products.filter(p=>p.active!==false),renderQuickProducts);
  const list=state.store.products.filter(p=>p.active!==false&&(!q||norm(p.name+" "+p.category).includes(q))&&(!category||String(p.category||"Khác")===category));
  $("#quickProducts").innerHTML=list.length?list.map(p=>{
    const inCart=state.cart.find(x=>x.productId===p.id),count=inCart?.quantity||0;
    return `<div class="product-tile ${count?"selected":""}" data-id="${p.id}">
      <button class="product-main">
        <span class="category-badge">${esc(p.category||"Khác")}</span>
        <strong>${esc(p.name)}</strong>
        <small>Tồn ${num(p.stock)} ${esc(p.unit||"")}</small>
        <div class="price">${money(p.salePrice)}</div>
      </button>
      ${count?`<div class="product-inline-cart">
        <button class="inline-minus">−</button>
        <button class="inline-count">${count}</button>
        <button class="inline-plus">+</button>
        <button class="inline-remove">×</button>
      </div>`:""}
    </div>`
  }).join(""):`<div class="hint">Không có mặt hàng phù hợp.</div>`;
  $("#quickProducts").querySelectorAll(".product-main").forEach(b=>b.onclick=()=>addCart(b.closest(".product-tile").dataset.id));
  $("#quickProducts").querySelectorAll(".inline-minus").forEach(b=>b.onclick=e=>{e.stopPropagation();changeCartQty(b.closest(".product-tile").dataset.id,-1)});
  $("#quickProducts").querySelectorAll(".inline-plus").forEach(b=>b.onclick=e=>{e.stopPropagation();changeCartQty(b.closest(".product-tile").dataset.id,1)});
  $("#quickProducts").querySelectorAll(".inline-remove").forEach(b=>b.onclick=e=>{e.stopPropagation();removeCartItem(b.closest(".product-tile").dataset.id)});
  $("#quickProducts").querySelectorAll(".inline-count").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const id=b.closest(".product-tile").dataset.id,item=state.cart.find(x=>x.productId===id),p=state.store.products.find(x=>x.id===id);
    showModal(`<h3>Số lượng ${esc(p?.name||"")}</h3><label>Số lượng<input id="inlineQtyEdit" type="number" min="1" value="${item?.quantity||1}" inputmode="numeric"></label><button id="saveInlineQty" class="primary full">Cập nhật</button>`);
    $("#saveInlineQty").onclick=()=>{
      const qn=Math.max(1,Number($("#inlineQtyEdit").value)||1);
      if(p?.trackStock!==false&&qn>Number(p?.stock||0))return toast(`${p.name} chỉ còn ${p.stock} ${p.unit||""}`,true);
      if(item)item.quantity=qn;closeModal();renderCart()
    }
  });
}
$("#saleSearch").oninput=renderQuickProducts;
function addCart(id){const p=state.store.products.find(x=>x.id===id);if(!p)return;let row=state.cart.find(x=>x.productId===id),next=(row?.quantity||0)+1;if(p.trackStock!==false&&next>Number(p.stock||0))return toast(`${p.name} chỉ còn ${p.stock} ${p.unit||""}`,true);if(row)row.quantity=next;else state.cart.push({productId:id,quantity:1});renderCart()}
function renderCart(){
  const box=$("#cart");if(!box)return;
  if(!state.cart.length){box.className="cart empty";box.innerHTML="Chưa chọn sản phẩm.";if($("#cartTotal"))$("#cartTotal").textContent=money(0);renderQuickProducts();return}
  box.className="cart";
  let total=0;
  box.innerHTML=state.cart.map(i=>{
    const p=state.store.products.find(x=>x.id===i.productId);if(!p)return"";
    const sub=(+p.salePrice||0)*(+i.quantity||0);total+=sub;
    return `<div class="cart-row" data-id="${p.id}">
      <div class="cart-product"><strong>${esc(p.name)}</strong><small>${money(p.salePrice)} × ${i.quantity} = ${money(sub)}</small></div>
      <div class="cart-qty">
        <button class="cart-minus" aria-label="Giảm">−</button>
        <button class="cart-count" aria-label="Sửa số lượng">${i.quantity}</button>
        <button class="cart-plus" aria-label="Tăng">+</button>
        <button class="cart-remove" aria-label="Xóa">×</button>
      </div>
    </div>`
  }).join("");
  if($("#cartTotal"))$("#cartTotal").textContent=money(total);

  box.querySelectorAll(".cart-minus").forEach(b=>b.onclick=()=>changeCartQty(b.closest(".cart-row").dataset.id,-1));
  box.querySelectorAll(".cart-plus").forEach(b=>b.onclick=()=>changeCartQty(b.closest(".cart-row").dataset.id,1));
  box.querySelectorAll(".cart-remove").forEach(b=>b.onclick=()=>removeCartItem(b.closest(".cart-row").dataset.id));
  box.querySelectorAll(".cart-count").forEach(b=>b.onclick=()=>{
    const id=b.closest(".cart-row").dataset.id,item=state.cart.find(x=>x.productId===id),p=state.store.products.find(x=>x.id===id);
    showModal(`<h3>Số lượng ${esc(p?.name||"")}</h3><label>Số lượng<input id="cartQtyEdit" type="number" min="1" value="${item.quantity}" inputmode="numeric"></label><button id="saveCartQty" class="primary full">Cập nhật</button>`);
    $("#saveCartQty").onclick=()=>{const q=Math.max(1,Number($("#cartQtyEdit").value)||1);if(p?.trackStock!==false&&q>Number(p?.stock||0))return toast(`${p.name} chỉ còn ${p.stock} ${p.unit||""}`,true);item.quantity=q;closeModal();renderCart()}
  });
  renderQuickProducts();
}
function changeCartQty(id,delta){
  const item=state.cart.find(x=>x.productId===id),p=state.store.products.find(x=>x.id===id);if(!item||!p)return;
  const next=Math.max(1,(Number(item.quantity)||1)+delta);
  if(p.trackStock!==false&&next>Number(p.stock||0))return toast(`${p.name} chỉ còn ${p.stock} ${p.unit||""}`,true);
  item.quantity=next;renderCart()
}
function removeCartItem(id){state.cart=state.cart.filter(x=>x.productId!==id);renderCart()}
$("#clearCart").onclick=()=>{state.cart=[];renderCart()};$("#paymentMethod").onchange=()=>{};
$("#checkout").onclick=async()=>{if(!state.cart.length)return toast("Chưa có sản phẩm",true);if($("#paymentMethod").value==="debt"&&!$("#saleCustomer").value)return toast("Ghi nợ phải chọn khách hàng",true);try{await mutate("sale.create",{createdAt:new Date($("#saleDate").value).toISOString(),paymentMethod:$("#paymentMethod").value,customerId:$("#saleCustomer").value,note:$("#saleNote").value,items:state.cart});state.cart=[];renderCart();toast("Đã lưu đơn hàng")}catch(e){toast(e.message,true)}};

function renderSaleCustomers(){
  const sel=$("#saleCustomer");if(!sel||!state.store)return;
  const current=sel.value;
  sel.innerHTML='<option value="">Khách lẻ</option>'+state.store.customers.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name,"vi")).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  if([...sel.options].some(o=>o.value===current))sel.value=current;
}

function renderSales(){
  const arr=[...state.store.sales].reverse().slice(0,100);$("#salesHistory").className=`list${arr.length?"":" empty"}`;
  $("#salesHistory").innerHTML=arr.length?arr.map(s=>`<div class="list-row sale-history-row" data-id="${s.id}"><div><strong>${money(s.total)}</strong><small>${new Date(s.createdAt).toLocaleString("vi-VN")} · ${esc(s.customer||"Khách lẻ")} · ${esc(s.items.map(i=>i.name+" x"+i.quantity).join(", "))}</small></div><div class="row"><button class="ghost edit-sale">Sửa</button><button class="ghost danger-text delete-sale">Xóa</button></div></div>`).join(""):"Chưa có đơn.";
  $("#salesHistory").querySelectorAll(".edit-sale").forEach(b=>b.onclick=()=>showSaleEdit(state.store.sales.find(s=>s.id===b.closest(".list-row").dataset.id)));
  $("#salesHistory").querySelectorAll(".delete-sale").forEach(b=>b.onclick=async()=>{if(confirm("Xóa đơn này và hoàn lại kho?"))try{await mutate("sale.delete",{id:b.closest(".list-row").dataset.id});toast("Đã xóa đơn")}catch(e){toast(e.message,true)}});
}
function showSaleEdit(s){
  const customers='<option value="">Khách lẻ</option>'+state.store.customers.filter(c=>c.active!==false).map(c=>`<option value="${c.id}" ${c.id===s.customerId?"selected":""}>${esc(c.name)}</option>`).join("");
  showModal(`<h3>Sửa đơn bán</h3><label>Ngày<input id="editSaleDate" type="datetime-local" value="${dtLocal(s.createdAt)}"></label><label>Thanh toán<select id="editSalePayment"><option value="cash" ${s.paymentMethod==="cash"?"selected":""}>Tiền mặt</option><option value="transfer" ${s.paymentMethod==="transfer"?"selected":""}>Chuyển khoản</option><option value="debt" ${s.paymentMethod==="debt"?"selected":""}>Ghi nợ</option></select></label><label>Khách hàng<select id="editSaleCustomer">${customers}</select></label><label>Ghi chú<input id="editSaleNote" value="${esc(s.note||"")}"></label><div class="sale-edit-lines">${(s.items||[]).map(l=>`<div class="sale-edit-line" data-id="${l.productId}"><span>${esc(l.name)}</span><input class="sale-edit-qty" type="number" min="0" value="${l.quantity}" inputmode="numeric"></div>`).join("")}</div><p class="hint">Nhập 0 để bỏ mặt hàng khỏi đơn.</p><button id="saveSaleEdit" class="primary full">Lưu thay đổi</button>`);
  $("#saveSaleEdit").onclick=async()=>{const items=$$(".sale-edit-line").map(r=>({productId:r.dataset.id,quantity:Number(r.querySelector(".sale-edit-qty").value)||0})).filter(x=>x.quantity>0);if(!items.length)return toast("Đơn hàng phải còn ít nhất một mặt hàng",true);if($("#editSalePayment").value==="debt"&&!$("#editSaleCustomer").value)return toast("Ghi nợ phải chọn khách",true);try{await mutate("sale.update",{id:s.id,createdAt:new Date($("#editSaleDate").value).toISOString(),paymentMethod:$("#editSalePayment").value,customerId:$("#editSaleCustomer").value,note:$("#editSaleNote").value,items});closeModal();toast("Đã sửa đơn bán")}catch(e){toast(e.message,true)}}
}
function parseMoney(v,base=0){let s=String(v||"").trim().toLowerCase().replace(/\s/g,"");const op=s[0],isop="+-*/×÷".includes(op);const cv=x=>{let k=String(x).toLowerCase(),mul=1;if(k.endsWith("k")){mul=1000;k=k.slice(0,-1)}else if(k.endsWith("tr")){mul=1e6;k=k.slice(0,-2)}k=k.replace(/\./g,"").replace(",",".");let n=Number(k)||0;if(!mul||mul===1){if(n>0&&n<1000)mul=1000}return Math.round(n*mul)};if(isop){const n=cv(s.slice(1));return op==="+"?base+n:op==="-"?base-n:(op==="*"||op==="×")?base*n:(op==="/"||op==="÷")?(n?base/n:base):base}return cv(s)}

let debtStatusFilter="all";
function customerDebt(id){return state.store.debts.filter(d=>d.customerId===id).reduce((a,d)=>a+(+d.balance||0),0)}
function customerHadDebt(id){return state.store.debts.some(d=>d.customerId===id)}
function renderDebtStatusFilters(base){
  const all=base.length,owing=base.filter(c=>c.debtBalance>0).length,paid=base.filter(c=>c.debtBalance<=0&&c.hadDebt).length;
  $("#debtCountAll").textContent=all;$("#debtCountOwing").textContent=owing;$("#debtCountPaid").textContent=paid;
  $$("#debtStatusFilters .debt-filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===debtStatusFilter));
}
function renderCustomers(){
  const q=norm($("#debtSearch").value),sort=$("#debtSort").value;
  let base=state.store.customers.filter(c=>!q||norm(c.name).includes(q)).map(c=>({...c,debtBalance:customerDebt(c.id),hadDebt:customerHadDebt(c.id)}));
  renderDebtStatusFilters(base);
  let arr=base.filter(c=>debtStatusFilter==="owing"?c.debtBalance>0:debtStatusFilter==="paid"?c.debtBalance<=0&&c.hadDebt:true);
  arr.sort((a,b)=>sort==="debt"?b.debtBalance-a.debtBalance:sort==="za"?b.name.localeCompare(a.name,"vi"):a.name.localeCompare(b.name,"vi"));
  $("#debtPageTotal").textContent=money(arr.reduce((a,c)=>a+c.debtBalance,0));
  $("#saleCustomer").innerHTML=`<option value="">Chọn khách</option>`+state.store.customers.map(c=>`<option value="${c.id}">${esc(c.name)}${customerDebt(c.id)?` — ${money(customerDebt(c.id))}`:""}</option>`).join("");
  $("#customers").className=`customer-list${arr.length?"":" empty"}`;
  $("#customers").innerHTML=arr.length?arr.map(c=>`<article class="customer-item ${c.debtBalance>0?"has-debt":"paid-debt"}" data-id="${c.id}"><div class="customer-summary"><strong class="${c.debtBalance>0?"debt-red":""}">${esc(c.name)}</strong><strong class="${c.debtBalance>0?"debt-red":""}">${c.debtBalance>0?money(c.debtBalance):c.hadDebt?"Đã trả":"0 ₫"} ›</strong></div><div class="customer-detail hidden"></div></article>`).join(""):`<div class="hint">Không có khách hàng phù hợp bộ lọc.</div>`;
  $("#customers").querySelectorAll(".customer-summary").forEach(s=>s.onclick=()=>toggleCustomer(s.parentElement));
}
function toggleCustomer(card){
  const box=card.querySelector(".customer-detail"),id=card.dataset.id,c=state.store.customers.find(c=>c.id===id);
  if(!box.classList.contains("hidden"))return box.classList.add("hidden");
  const debts=[...state.store.debts.filter(d=>d.customerId===id)].reverse();
  box.innerHTML=`
    <div class="debt-compact-actions debt-actions-3">
      <button class="primary addDebtOpen">+ Ghi nợ</button>
      <button class="file-btn payDebtOpen">Trả nợ</button>
      <button class="ghost editCustomer" data-id="${c.id}">Sửa tên</button>
    </div>
    <div class="debt-history-title"><strong>Lịch sử nợ</strong><span>${debts.length} khoản</span></div>
    <div class="debt-lines">${debts.map(d=>`
      <div class="debt-line debt-history-block" data-id="${d.id}">
        <div class="debt-main">
          <strong class="${d.balance>0?"debt-red":""}">${d.balance>0?`Còn ${money(d.balance)}`:"Đã trả"} <span class="debt-original">/ ${money(d.amount)}</span></strong>
          <small>${new Date(d.createdAt).toLocaleDateString("vi-VN")} · ${esc(d.note||"Không có ghi chú")}</small>
          ${(d.payments||[]).length?`<div class="payments-mini">${(d.payments||[]).map(p=>`<button class="payment-chip" data-debt="${d.id}" data-pay="${p.id}">${new Date(p.createdAt).toLocaleDateString("vi-VN")} · ${money(p.amount)}</button>`).join("")}</div>`:""}
        </div>
        <button class="ghost debtEdit">Sửa</button>
      </div>`).join("")||'<div class="hint">Chưa có lịch sử nợ.</div>'}
    </div>`;
  box.classList.remove("hidden");
  box.querySelector(".addDebtOpen").onclick=()=>showAddDebt(c);
  box.querySelector(".payDebtOpen").onclick=()=>showPayment(c);box.querySelector(".editCustomer").onclick=()=>showCustomerRename(c);
  box.querySelectorAll(".debtEdit").forEach(b=>b.onclick=()=>showDebtEdit(state.store.debts.find(d=>d.id===b.closest(".debt-line").dataset.id)));
  box.querySelectorAll(".payment-chip").forEach(b=>b.onclick=()=>{const d=state.store.debts.find(x=>x.id===b.dataset.debt);const p=(d?.payments||[]).find(x=>x.id===b.dataset.pay);if(d&&p)showPaymentEdit(d,p);});
}

function showCustomerRename(c){showModal(`<h3>Sửa tên khách hàng</h3><label>Tên khách hàng<input id="editCustomerName" value="${esc(c.name)}"></label><button id="saveCustomerName" class="primary full">Lưu tên</button>`);$("#saveCustomerName").onclick=async()=>{const name=$("#editCustomerName").value.trim();if(!name)return toast("Tên khách trống",true);try{await mutate("customer.update",{id:c.id,name});closeModal();toast("Đã đổi tên khách hàng")}catch(err){toast(err.message,true)}}}
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
      await mutate("debt.add",{customerId:c.id,amount,note:$("#modalDebtNote").value,createdAt:$("#modalDebtDate").value+"T12:00:00"});
      closeModal();toast("Đã ghi nợ");
    }catch(e){toast(e.message,true)}
  };
}

function showPayment(c){const total=customerDebt(c.id);showModal(`<h3>${esc(c.name)} trả nợ</h3><p class="hint">Tổng còn nợ: <strong>${money(total)}</strong>. Số tiền được điền sẵn toàn bộ, có thể sửa nếu chỉ trả một phần.</p><label>Ngày trả<input id="payDate" type="date" value="${todayKey()}"></label><label>Số tiền<input id="payMoney" value="${total}" inputmode="numeric"></label><label>Ghi chú<input id="payNote"></label><button id="doPay" class="primary full">Xác nhận</button>`);$("#doPay").onclick=async()=>{const amount=parseMoney($("#payMoney").value,total);try{await mutate("debt.pay",{customerId:c.id,amount,note:$("#payNote").value,createdAt:$("#payDate").value+"T12:00:00"});closeModal();toast("Đã ghi nhận trả nợ")}catch(e){toast(e.message,true)}}}
function showDebtEdit(d){showModal(`<h3>Chỉnh khoản nợ</h3><label>Ngày ghi nợ<input id="editDebtDate" type="date" value="${String(d.createdAt).slice(0,10)}"></label><label>Số tiền<input id="editDebtMoney" value="${d.amount}"></label><label>Ghi chú / món nợ<input id="editDebtNote" value="${esc(d.note||"")}"></label><div class="row"><button id="saveDebtEdit" class="primary">Lưu</button><button id="deleteDebt" class="file-btn" style="background:#b42318">Xóa</button></div>`);$("#saveDebtEdit").onclick=async()=>{try{await mutate("debt.update",{id:d.id,amount:parseMoney($("#editDebtMoney").value,d.amount),note:$("#editDebtNote").value,createdAt:$("#editDebtDate").value+"T12:00:00"});closeModal();toast("Đã sửa khoản nợ")}catch(e){toast(e.message,true)}};$("#deleteDebt").onclick=async()=>{if(confirm("Xóa khoản nợ này?"))try{await mutate("debt.delete",{id:d.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}
function showPaymentEdit(d,p){showModal(`<h3>Chỉnh lần trả nợ</h3><p class="hint">${esc(d.customer||"")} · khoản nợ ${money(d.amount)}</p><label>Ngày trả<input id="editPayDate" type="date" value="${String(p.createdAt).slice(0,10)}"></label><label>Số tiền<input id="editPayMoney" value="${p.amount}" inputmode="numeric"></label><label>Ghi chú<input id="editPayNote" value="${esc(p.note||"")}"></label><div class="row"><button id="savePayEdit" class="primary">Lưu</button><button id="deletePay" class="file-btn" style="background:#b42318">Xóa lần trả</button></div>`);$("#savePayEdit").onclick=async()=>{try{await mutate("debt.payment.update",{debtId:d.id,paymentId:p.id,amount:parseMoney($("#editPayMoney").value,p.amount),note:$("#editPayNote").value,createdAt:$("#editPayDate").value+"T12:00:00"});closeModal();toast("Đã sửa lần trả nợ")}catch(e){toast(e.message,true)}};$("#deletePay").onclick=async()=>{if(confirm("Xóa lần trả nợ này? Số còn nợ sẽ tăng lại."))try{await mutate("debt.payment.delete",{debtId:d.id,paymentId:p.id});closeModal();toast("Đã xóa lần trả nợ")}catch(e){toast(e.message,true)}}}
$("#debtSearch").oninput=renderCustomers;$("#debtSort").onchange=renderCustomers;$$("#debtStatusFilters .debt-filter").forEach(b=>b.onclick=()=>{debtStatusFilter=b.dataset.filter;renderCustomers()});
$("#addCustomerBtn").onclick=()=>{showModal(`<h3>Thêm khách hàng</h3><label>Tên<input id="newCustomerName"></label><button id="saveCustomer" class="primary full">Lưu</button>`);$("#saveCustomer").onclick=async()=>{try{await mutate("customer.create",{name:$("#newCustomerName").value});closeModal();toast("Đã thêm khách")}catch(e){toast(e.message,true)}}};


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

function renderProductCategories(){const items=state.store.products.filter(p=>p.active!==false);renderCategoryButtons("#productCategoryChips","product",items,renderProducts)}

function renderProducts(){
  renderProductCategories();
  const q=norm($("#productSearch").value),sort=$("#productSort")?.value||"name",category=categoryState.product||"";
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

function showProductForm(p){showModal(`<h3>${p?"Chỉnh":"Thêm"} sản phẩm</h3><div class="form-grid"><label>Tên<input id="pName" value="${esc(p?.name||"")}"></label><label>Nhóm<select id="pCat"><option>Cà phê</option><option>Nước</option><option>Bánh Oishi</option><option>Kem</option><option>Khác</option>${p?.category&&!["Cà phê","Nước","Bánh Oishi","Kem","Khác"].includes(p.category)?`<option selected>${esc(p.category)}</option>`:""}</select></label><label>Đơn vị<input id="pUnit" value="${esc(p?.unit||"chai")}"></label><label>Quy cách<input id="pPack" value="${p?.packSize||1}" inputmode="numeric"></label><label>Giá nhập/đv<input id="pCost" value="${p?.costPrice||0}" inputmode="numeric"></label><label>Giá bán<input id="pSale" value="${p?.salePrice||0}" inputmode="numeric"></label><label>Tồn hiện tại<input id="pStock" value="${p?.stock||0}" inputmode="numeric"></label><label>Tồn tối thiểu<input id="pMin" value="${p?.minStock||0}" inputmode="numeric"></label></div><div class="row"><button id="saveProduct" class="primary">Lưu</button>${p?'<button id="deleteProduct" class="file-btn" style="background:#b42318">Xóa</button>':""}</div>`);if(p&&[...$("#pCat").options].some(o=>o.value===p.category))$("#pCat").value=p.category;$("#saveProduct").onclick=async()=>{const payload={id:p?.id,name:$("#pName").value,category:$("#pCat").value,unit:$("#pUnit").value,packSize:+$("#pPack").value||1,costPrice:parseMoney($("#pCost").value),salePrice:parseMoney($("#pSale").value),stock:+$("#pStock").value||0,minStock:+$("#pMin").value||0};try{await mutate(p?"product.update":"product.create",payload);closeModal();toast("Đã lưu sản phẩm")}catch(e){toast(e.message,true)}};if(p)$("#deleteProduct").onclick=async()=>{if(confirm("Xóa mặt hàng?"))try{await mutate("product.delete",{id:p.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}

function renderStockin(){const q=norm($("#stockinSearch").value),category=renderCategoryButtons("#stockinCategoryChips","stockin",state.store.products.filter(p=>p.trackStock!==false&&p.active!==false),renderStockin),arr=state.store.products.filter(p=>p.trackStock!==false&&p.active!==false&&(!q||norm(p.name+" "+p.category).includes(q))&&(!category||String(p.category||"Khác")===category));$("#stockinProducts").innerHTML=arr.length?arr.map(p=>`<div class="stockin-row" data-id="${p.id}"><div><strong>${esc(p.name)}</strong><small>Tồn ${num(p.stock)} · ${num(p.packSize)} / thùng</small></div><input class="cases" type="number" min="0" placeholder="Thùng"><input class="units" type="number" min="0" placeholder="Lẻ"></div>`).join(""):`<div class="hint">Không có mặt hàng phù hợp.</div>`;const hist=[...state.store.stockReceipts].reverse().slice(0,100);$("#stockinHistory").className=`list${hist.length?"":" empty"}`;$("#stockinHistory").innerHTML=hist.length?hist.map(r=>`<div class="list-row" data-id="${r.id}"><div><strong>${new Date(r.createdAt).toLocaleString("vi-VN")}</strong><small>${esc(r.note||"Phiếu nhập")} · ${r.lines.length} mặt hàng</small></div><div class="row"><button class="ghost editReceipt">Sửa</button><button class="ghost danger-text deleteReceipt">Xóa</button></div></div>`).join(""):"Chưa có phiếu.";$("#stockinHistory").querySelectorAll(".editReceipt").forEach(b=>b.onclick=()=>showStockinEdit(state.store.stockReceipts.find(r=>r.id===b.closest(".list-row").dataset.id)));$("#stockinHistory").querySelectorAll(".deleteReceipt").forEach(b=>b.onclick=async()=>{if(confirm("Xóa phiếu và trừ lại kho?"))try{await mutate("stockin.delete",{id:b.closest(".list-row").dataset.id});toast("Đã xóa phiếu")}catch(e){toast(e.message,true)}})}
$("#stockinSearch").oninput=renderStockin;$("#saveStockin").onclick=async()=>{const lines=$$("#stockinProducts .stockin-row").map(r=>({productId:r.dataset.id,cases:+r.querySelector(".cases").value||0,units:+r.querySelector(".units").value||0})).filter(x=>x.cases||x.units);if(!lines.length)return toast("Chưa nhập số lượng",true);try{await mutate("stockin.create",{createdAt:new Date($("#stockinDate").value).toISOString(),note:$("#stockinNote").value,lines});toast("Đã nhập kho")}catch(e){toast(e.message,true)}};

function showStockinEdit(r){
  showModal(`<h3>Sửa phiếu nhập kho</h3><label>Ngày nhập<input id="editReceiptDate" type="datetime-local" value="${dtLocal(r.createdAt)}"></label><label>Ghi chú<input id="editReceiptNote" value="${esc(r.note||"")}"></label><div class="receipt-edit-lines">${(r.lines||[]).map(l=>`<div class="sale-edit-line" data-id="${l.productId}"><span>${esc(l.name||state.store.products.find(p=>p.id===l.productId)?.name||"")}</span><input class="receipt-edit-qty" type="number" min="0" value="${l.quantity}" inputmode="numeric"></div>`).join("")}</div><p class="hint">Sửa theo tổng số lượng nhập. Hệ thống chỉ cộng/trừ phần chênh lệch để không phá các giao dịch phát sinh sau phiếu.</p><button id="saveReceiptEdit" class="primary full">Lưu phiếu nhập</button>`);
  $("#saveReceiptEdit").onclick=async()=>{const lines=$$(".sale-edit-line").map(x=>({productId:x.dataset.id,quantity:Number(x.querySelector(".receipt-edit-qty").value)||0})).filter(x=>x.quantity>0);if(!lines.length)return toast("Phiếu nhập phải còn ít nhất một mặt hàng",true);try{await mutate("stockin.update",{id:r.id,createdAt:new Date($("#editReceiptDate").value).toISOString(),note:$("#editReceiptNote").value,lines});closeModal();toast("Đã sửa phiếu nhập")}catch(e){toast(e.message,true)}}
}

function monthKeyLocal(dateLike){
  const d=dateLike instanceof Date?new Date(dateLike):new Date(dateLike||Date.now());if(Number.isNaN(d.getTime()))return "";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
}
function defaultAuditPeriodKey(dateLike){
  const d=dateLike?new Date(dateLike):new Date();if(Number.isNaN(d.getTime()))return "";
  if(d.getDate()<=3)d.setMonth(d.getMonth()-1);
  return monthKeyLocal(d)
}
function periodLabel(key){const m=String(key||"").match(/^(\d{4})-(\d{2})$/);return m?`${m[2]}/${m[1]}`:"Chưa gán kỳ"}
function previousAuditForProductClient(audit,productId){
  return (state.store.audits||[]).filter(a=>a.id!==audit.id&&new Date(a.createdAt)<new Date(audit.createdAt)&&(a.lines||[]).some(l=>l.productId===productId)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null
}
function auditLinePeriodMetric(audit,line){
  const p=state.store.products.find(x=>x.id===line.productId),prev=previousAuditForProductClient(audit,line.productId);
  const unexplained=Math.max(0,(+line.before||0)-(+line.actual||0)),surplus=Math.max(0,(+line.actual||0)-(+line.before||0));
  const type=line.reconcileType||"unclassified",salePrice=line.salePriceSnapshot??p?.salePrice??0,costPrice=line.costPriceSnapshot??p?.costPrice??0;
  return {audit,line,p,prev,type,unexplained,surplus,salePrice,costPrice,revenue:prev&&type==="unrecorded_sale"?unexplained*salePrice:0,profit:prev&&type==="unrecorded_sale"?unexplained*(salePrice-costPrice):0,lossCost:prev&&type==="loss"?unexplained*costPrice:0}
}
function auditPeriodMonthReport(key){
  const sales=(state.store.sales||[]).filter(s=>String(s.createdAt).slice(0,7)===key);
  let actualRevenue=0,actualProfit=0;for(const s of sales){actualRevenue+=+s.total||0;actualProfit+=+s.profit||0}
  const rows=[];let derivedRevenue=0,derivedProfit=0,lossCost=0,unclassifiedQty=0,baselineQty=0,surplusQty=0,auditCount=0,auditedLineCount=0;
  const auditedProductIds=new Set(),baselineProductIds=new Set();
  for(const a of state.store.audits||[]){if(a.periodKey!==key)continue;auditCount++;for(const l of a.lines||[]){auditedLineCount++;auditedProductIds.add(l.productId);const x=auditLinePeriodMetric(a,l);if(!x.prev){baselineProductIds.add(l.productId);baselineQty+=x.unexplained;continue}derivedRevenue+=x.revenue;derivedProfit+=x.profit;lossCost+=x.lossCost;surplusQty+=x.surplus;if(x.type==="unclassified")unclassifiedQty+=x.unexplained;if(x.unexplained>0||x.surplus>0)rows.push(x)}}
  return {key,sales,actualRevenue,actualProfit,derivedRevenue,derivedProfit,lossCost,unclassifiedQty,baselineQty,surplusQty,auditCount,auditedLineCount,auditedProductCount:auditedProductIds.size,baselineProductCount:baselineProductIds.size,estimatedRevenue:actualRevenue+derivedRevenue,estimatedProfit:actualProfit+derivedProfit-lossCost,rows}
}
function renderAuditPeriodReport(){
  const box=$("#auditPeriodReport"),key=$("#auditReportMonth")?.value;if(!box||!key||!state.store)return;
  const r=auditPeriodMonthReport(key),derivedRows=r.rows.filter(x=>x.type==="unrecorded_sale"&&x.unexplained>0).sort((a,b)=>b.revenue-a.revenue);
  const recalculatedAt=new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  box.innerHTML=`<div class="period-recalc-note">Đã tính lại từ dữ liệu hiện tại · ${recalculatedAt}</div><div class="period-summary-grid">
    <div><span>Doanh thu từ đơn</span><b>${money(r.actualRevenue)}</b><small>Chính xác theo ngày bán</small></div>
    <div><span>Suy ra từ kiểm kho</span><b>${money(r.derivedRevenue)}</b><small>Không gán vào từng ngày</small></div>
    <div class="period-total"><span>Tổng doanh thu tháng</span><b>${money(r.estimatedRevenue)}</b><small>Ước tính theo kỳ kiểm kho</small></div>
    <div><span>Lợi nhuận ước tính</span><b>${money(r.estimatedProfit)}</b><small>Đã trừ hao hụt đã phân loại</small></div>
  </div>
  <div class="audit-count-summary">
    <span><b>${r.auditedProductCount}</b> mặt hàng đã lưu trong kiểm kho kỳ này</span>
    <span><b>${r.auditCount}</b> phiếu kiểm kho</span>
    <span><b>${derivedRows.length}</b> mặt hàng có bán chưa ghi nhận</span>
  </div>
  <div class="period-flags">
    ${r.lossCost?`<span class="period-flag loss">Hao hụt theo giá vốn: ${money(r.lossCost)}</span>`:""}
    ${r.unclassifiedQty?`<span class="period-flag warn">${num(r.unclassifiedQty)} SP chưa phân loại</span>`:""}
    ${r.baselineQty?`<span class="period-flag neutral">Phiếu đầu tiên còn lại là mốc gốc, không tính ${num(r.baselineQty)} SP chênh lệch trước mốc</span>`:""}
    ${!r.unclassifiedQty&&!r.baselineQty&&!r.lossCost?`<span class="period-flag good">Các kỳ đã phân loại đầy đủ</span>`:""}
  </div>
  <details class="period-details"><summary>Bán chưa ghi nhận từ kiểm kho (${derivedRows.length} mặt hàng — không phải tổng số mặt hàng đã kiểm)</summary>
    <div class="period-derived-list">${derivedRows.length?derivedRows.map(x=>`<div class="period-derived-row"><div><strong>${esc(x.p?.name||x.line.name||"Sản phẩm")}</strong><small>${new Date(x.prev.createdAt).toLocaleDateString("vi-VN")} → ${new Date(x.audit.createdAt).toLocaleDateString("vi-VN")} · ${num(x.unexplained)} ${esc(x.p?.unit||"")}</small></div><b>${money(x.revenue)}</b></div>`).join(""):'<div class="hint">Không có doanh thu suy ra trong kỳ này.</div>'}</div>
  </details>
  <p class="hint period-method">Phần suy ra dùng <b>tồn hệ thống trước kiểm − tồn thực tế</b>. Tồn hệ thống đã trừ các đơn bán và cộng các phiếu nhập, nên phần này không cộng trùng với đơn đã ghi.</p>`;
}
$("#auditReportMonth")?.addEventListener("change",renderAuditPeriodReport);
$("#auditDate")?.addEventListener("change",()=>{$("#auditPeriodMonth").value=defaultAuditPeriodKey($("#auditDate").value)});

function renderAudit(){
  const q=norm($("#auditSearch").value),category=renderCategoryButtons("#auditCategoryChips","audit",state.store.products.filter(p=>p.trackStock!==false&&p.active!==false),renderAudit),all=state.store.products.filter(p=>p.trackStock!==false&&p.active!==false),arr=all.filter(p=>(!q||norm(p.name+" "+p.category).includes(q))&&(!category||String(p.category||"Khác")===category));
  $("#auditProducts").innerHTML=arr.length?arr.map(p=>{const actual=Object.prototype.hasOwnProperty.call(auditDraft,p.id)?auditDraft[p.id]:p.stock;return `<div class="audit-row" data-id="${p.id}"><div><strong>${esc(p.name)}</strong><small>${esc(p.category||"Khác")} · tồn hệ thống ${num(p.stock)} ${esc(p.unit||"")}</small></div><input class="actual" type="number" min="0" value="${actual}" inputmode="numeric"></div>`}).join(""):`<div class="hint">Không có mặt hàng phù hợp.</div>`;
  $$("#auditProducts .audit-row").forEach(r=>{const input=r.querySelector(".actual");input.oninput=()=>{auditDraft[r.dataset.id]=Math.max(0,+input.value||0)}});

  const savedDraftCount=Object.keys(auditDraft).length;
  const draftInfo=$("#auditDraftInfo");
  if(draftInfo)draftInfo.innerHTML=`Phiếu hiện tại sẽ lưu <b>${all.length} mặt hàng</b>${savedDraftCount?` · đã nhập/chỉnh ${savedDraftCount} mặt hàng qua các bộ lọc`:""}. Đổi danh mục không làm mất số đã nhập.`;

  const hist=[...state.store.audits].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100);
  $("#auditHistory").className=`list${hist.length?"":" empty"}`;
  $("#auditHistory").innerHTML=hist.length?hist.map(a=>{const metrics=(a.lines||[]).map(l=>auditLinePeriodMetric(a,l)),derived=metrics.reduce((z,x)=>z+x.revenue,0),loss=metrics.reduce((z,x)=>z+x.lossCost,0),unclassified=metrics.reduce((z,x)=>z+(x.type==="unclassified"&&x.prev?x.unexplained:0),0);return `<div class="list-row audit-history-row" data-id="${a.id}"><div><strong>${new Date(a.createdAt).toLocaleString("vi-VN")}</strong><small>Kỳ ${periodLabel(a.periodKey)} · <b>${a.lines.length} mặt hàng đã lưu</b>${derived?` · suy ra ${money(derived)}`:""}${loss?` · hao hụt ${money(loss)}`:""}${unclassified?` · ${num(unclassified)} SP chưa phân loại`:""}</small><small>${esc(a.note||"Kiểm kho")}</small></div><button class="ghost editAudit">Sửa</button></div>`}).join(""):"Chưa có lần kiểm kho.";
  $("#auditHistory").querySelectorAll(".editAudit").forEach(b=>b.onclick=()=>showAuditEdit(state.store.audits.find(a=>a.id===b.closest(".list-row").dataset.id)));
}
$("#auditSearch").oninput=renderAudit;


$("#resetBusinessHistoryBtn")?.addEventListener("click",()=>{
  const salesCount=(state.store.sales||[]).length,auditCount=(state.store.audits||[]).length,debtCount=(state.store.debts||[]).length;
  showModal(`<h3>Reset doanh thu, lợi nhuận & đơn hàng</h3>
    <div class="reset-warning reset-business-warning">
      <strong>Đây là reset dữ liệu kinh doanh lớn</strong>
      <p>Sau khi thực hiện:</p>
      <ul>
        <li><b>Doanh thu = 0 ₫</b></li>
        <li><b>Lợi nhuận = 0 ₫</b></li>
        <li><b>Đơn hàng = 0</b> (${salesCount} đơn hiện tại sẽ bị xóa)</li>
        <li>Toàn bộ ${auditCount} phiếu kiểm kho sẽ bị xóa nên doanh thu suy ra từ kiểm kho cũng về 0.</li>
        <li><b>Giữ nguyên ${debtCount} khoản công nợ</b>, số còn nợ và lịch sử trả nợ.</li>
        <li>Giữ khách hàng, sản phẩm và tồn kho hiện tại để tiếp tục sử dụng.</li>
        <li>Giữ phiếu nhập kho.</li>
        <li>Tạo snapshot trước khi reset để có thể khôi phục.</li>
      </ul>
    </div>
    <label class="confirm-reset-label">Nhập chính xác <b>RESET ALL</b> để xác nhận
      <input id="confirmBusinessResetText" autocomplete="off" placeholder="RESET ALL">
    </label>
    <button id="confirmBusinessResetBtn" class="danger full" disabled>Reset doanh thu & đơn hàng</button>`);
  const input=$("#confirmBusinessResetText"),btn=$("#confirmBusinessResetBtn");
  input.oninput=()=>{btn.disabled=input.value.trim().toUpperCase()!=="RESET ALL"};
  btn.onclick=async()=>{
    if(input.value.trim().toUpperCase()!=="RESET ALL")return;
    btn.disabled=true;btn.textContent="Đang reset…";
    try{
      await mutate("business.reset.keep_debts",{});
      closeModal();
      state.cart={};
      renderDashboard();renderSales();renderCustomers();renderAudit();renderAuditPeriodReport();renderTransactions();
      toast("Đã reset doanh thu, lợi nhuận và đơn hàng; công nợ được giữ nguyên");
    }catch(e){
      btn.disabled=false;btn.textContent="Reset doanh thu & đơn hàng";toast(e.message,true)
    }
  };
});

$("#resetAllAuditsBtn")?.addEventListener("click",()=>{
  const count=(state.store.audits||[]).length;
  if(!count)return toast("Không có lịch sử kiểm kho để reset");
  showModal(`<h3>Reset toàn bộ kiểm kho</h3>
    <div class="reset-warning">
      <strong>Sẽ xóa ${count} phiếu kiểm kho</strong>
      <p>Hệ thống sẽ xóa toàn bộ lịch sử kiểm kho và toàn bộ doanh thu/lợi nhuận suy ra từ kiểm kho.</p>
      <ul>
        <li><b>Hoàn tác toàn bộ ảnh hưởng kiểm kho lên tồn kho.</b> Ví dụ tồn trước kiểm 30, kiểm còn 0 thì reset sẽ trả lại 30.</li>
        <li>Giữ nguyên đơn bán thật.</li>
        <li>Giữ nguyên công nợ, khách hàng, sản phẩm và phiếu nhập kho.</li>
        <li>Tự tạo snapshot trước khi reset.</li>
        <li>Lần kiểm kho tiếp theo sẽ là mốc đầu tiên mới và chưa tạo doanh thu suy ra.</li>
      </ul>
    </div>
    <label class="confirm-reset-label">Nhập <b>RESET</b> để xác nhận<input id="confirmAuditResetText" autocomplete="off" placeholder="RESET"></label>
    <button id="confirmAuditResetBtn" class="danger full" disabled>Reset an toàn</button>`);
  const input=$("#confirmAuditResetText"),btn=$("#confirmAuditResetBtn");
  input.oninput=()=>{btn.disabled=input.value.trim().toUpperCase()!=="RESET"};
  btn.onclick=async()=>{
    if(input.value.trim().toUpperCase()!=="RESET")return;
    btn.disabled=true;btn.textContent="Đang reset…";
    try{
      await mutate("audit.reset.safe",{});
      closeModal();
      if($("#auditReportMonth"))$("#auditReportMonth").value=monthKeyLocal(new Date());
      renderAuditPeriodReport();renderDashboard();renderAudit();
      toast("Đã reset kiểm kho và hoàn tồn về trước các lần kiểm");
    }catch(e){btn.disabled=false;btn.textContent="Reset an toàn";toast(e.message,true)}
  };
});

$("#saveAudit").onclick=async()=>{
  const all=state.store.products.filter(p=>p.trackStock!==false&&p.active!==false);
  const lines=all.map(p=>({productId:p.id,actual:Object.prototype.hasOwnProperty.call(auditDraft,p.id)?Math.max(0,+auditDraft[p.id]||0):Math.max(0,+p.stock||0),reconcileType:$("#auditDefaultReconcile").value}));
  if(!lines.length)return toast("Không có mặt hàng để kiểm kho",true);
  const createdAt=$("#auditDate").value?new Date($("#auditDate").value).toISOString():new Date().toISOString(),periodKey=$("#auditPeriodMonth").value||defaultAuditPeriodKey(createdAt);
  try{
    await mutate("audit.create",{createdAt,periodKey,defaultReconcileType:$("#auditDefaultReconcile").value,note:$("#auditNote").value,lines});
    for(const k of Object.keys(auditDraft))delete auditDraft[k];
    $("#auditNote").value="";
    renderAudit();
    toast(`Đã chốt kiểm kho ${lines.length} mặt hàng · kỳ ${periodLabel(periodKey)}`)
  }catch(e){toast(e.message,true)}
};
function showAuditEdit(a){
  const lineHtml=(a.lines||[]).map(l=>{const x=auditLinePeriodMetric(a,l),type=l.reconcileType||"unclassified";return `<div class="audit-edit-period-line" data-id="${l.productId}"><div class="audit-edit-title"><strong>${esc(l.name)}</strong><small>Hệ thống trước kiểm ${num(l.before)} → thực tế ${num(l.actual)}${x.prev?` · chênh giảm ${num(x.unexplained)}`:" · mốc kiểm đầu tiên"}</small></div><label>Tồn thực tế<input class="auditEditActual" type="number" value="${l.actual}" min="0"></label><label>Phân loại chênh lệch<select class="auditEditType"><option value="unrecorded_sale" ${type==="unrecorded_sale"?"selected":""}>Bán chưa ghi nhận</option><option value="loss" ${type==="loss"?"selected":""}>Hao hụt / hỏng / mất</option><option value="adjustment" ${type==="adjustment"?"selected":""}>Điều chỉnh khác</option><option value="unclassified" ${type==="unclassified"?"selected":""}>Chưa phân loại</option></select></label></div>`}).join("");
  showModal(`<h3>Chỉnh đơn kiểm kho</h3><div class="form-grid"><label>Ngày kiểm<input value="${dtLocal(a.createdAt)}" disabled></label><label>Kỳ doanh thu<input id="auditEditPeriod" type="month" value="${esc(a.periodKey||"")}"></label><label class="wide">Ghi chú<input id="auditEditNote" value="${esc(a.note||"")}"></label></div><p class="hint">Chỉ “Bán chưa ghi nhận” được cộng vào doanh thu kỳ. “Hao hụt” chỉ tính chi phí hao hụt; “Điều chỉnh khác” không tính doanh thu.</p><div class="audit-edit-period-list">${lineHtml}</div><div class="row"><button id="saveAuditEdit" class="primary">Lưu</button><button id="deleteAudit" class="file-btn" style="background:#b42318">Xóa</button></div>`);
  $("#saveAuditEdit").onclick=async()=>{const lines=$$(".audit-edit-period-line").map(r=>({productId:r.dataset.id,actual:+r.querySelector(".auditEditActual").value||0,reconcileType:r.querySelector(".auditEditType").value}));try{await mutate("audit.update",{id:a.id,periodKey:$("#auditEditPeriod").value,note:$("#auditEditNote").value,lines});closeModal();toast("Đã sửa kiểm kho và cập nhật kỳ doanh thu")}catch(e){toast(e.message,true)}};
  $("#deleteAudit").onclick=async()=>{if(confirm("Xóa đơn kiểm kho? Doanh thu suy ra của kỳ sẽ được tính lại ngay. Nếu đây là phiếu cũ và đã có lần kiểm kho sau đó, tồn hiện tại sẽ được giữ nguyên."))try{const deletedPeriod=a.periodKey||$("#auditReportMonth")?.value||"";await mutate("audit.delete",{id:a.id});if(deletedPeriod&&$("#auditReportMonth"))$("#auditReportMonth").value=deletedPeriod;renderAuditPeriodReport();renderDashboard();closeModal();toast(`Đã xóa kiểm kho${deletedPeriod?` · đã tính lại kỳ ${periodLabel(deletedPeriod)}`:""}`)}catch(e){toast(e.message,true)}}
}

function renderTransactions(){const arr=[...state.store.transactions].reverse().slice(0,200);$("#transactions").className=`list${arr.length?"":" empty"}`;$("#transactions").innerHTML=arr.length?arr.map(t=>`<div class="list-row"><div><strong>${esc(t.summary)}</strong><small>${new Date(t.createdAt).toLocaleString("vi-VN")} · ${esc(t.id)}</small></div></div>`).join(""):"Chưa có giao dịch."}
function renderSnapshots(){const arr=[...state.store.snapshots].reverse();$("#snapshots").className=`list${arr.length?"":" empty"}`;$("#snapshots").innerHTML=arr.length?arr.map(s=>`<div class="list-row" data-id="${s.id}"><div><strong>${esc(s.label)}</strong><small>${new Date(s.createdAt).toLocaleString("vi-VN")}</small></div><button class="ghost restoreSnapshot">Khôi phục</button></div>`).join(""):"Chưa có snapshot.";$("#snapshots").querySelectorAll(".restoreSnapshot").forEach(b=>b.onclick=async()=>{if(confirm("Khôi phục snapshot này?"))try{await mutate("snapshot.restore",{id:b.closest(".list-row").dataset.id});toast("Đã khôi phục")}catch(e){toast(e.message,true)}})}
$("#createSnapshot").onclick=async()=>{try{await mutate("snapshot.create",{label:"Snapshot "+new Date().toLocaleString("vi-VN")});toast("Đã tạo snapshot")}catch(e){toast(e.message,true)}};

function renderStores(){$("#stores").innerHTML=state.stores.map(s=>`<div class="list-row"><div><strong>${esc(s.name)}</strong><small>${s.id===state.storeId?"Đang dùng":""}</small></div></div>`).join("")}
$("#newStore").onclick=()=>{showModal(`<h3>Tạo cửa hàng mới</h3><label>Tên<input id="newStoreName"></label><button id="saveNewStore" class="primary full">Tạo cửa hàng</button>`);$("#saveNewStore").onclick=async()=>{try{await mutate("store.create",{name:$("#newStoreName").value});closeModal();toast("Đã tạo cửa hàng")}catch(e){toast(e.message,true)}}};


function renderAISettings(){if(!state.store)return;const mode=state.store.config?.ai?.safetyMode||"preview";if($("#aiSafetyMode"))$("#aiSafetyMode").value=mode;if($("#autoIngredientDeduct"))$("#autoIngredientDeduct").checked=!!state.store.config?.ai?.autoIngredientDeduct}
function renderAIOperationHistory(){const box=$("#aiOperationHistory");if(!box||!state.store)return;const rows=[...(state.store.transactions||[])].filter(t=>String(t.type||"").startsWith("ai.")).reverse().slice(0,30);box.className=`list${rows.length?"":" empty"}`;box.innerHTML=rows.length?rows.map(t=>`<div class="list-row"><div><strong>${esc(t.summary||t.type)}</strong><small>${new Date(t.createdAt).toLocaleString("vi-VN")} · ${esc(t.type)}</small></div></div>`).join(""):"AI chưa thực hiện thay đổi nào."}
$("#aiSafetyMode")?.addEventListener("change",async e=>{try{await mutate("config.update",{config:{ai:{safetyMode:e.target.value}}});toast("Đã cập nhật chế độ AI")}catch(err){toast(err.message,true)}});$("#autoIngredientDeduct")?.addEventListener("change",async e=>{try{await mutate("config.update",{config:{ai:{autoIngredientDeduct:e.target.checked}}});toast(e.target.checked?"Đã bật tự trừ nguyên liệu":"Đã tắt tự trừ nguyên liệu")}catch(err){toast(err.message,true)}});

function addBubble(text,kind="ai",extra=""){const b=document.createElement("div");b.className=`bubble ${kind} ${extra}`;b.textContent=text;$("#chat").appendChild(b);$("#chat").scrollTop=$("#chat").scrollHeight;return b}
function renderAIContext(){
  const bar=$("#aiContextBar");if(!bar)return;
  const p=state.store?.products?.find(x=>x.id===state.aiContext.productId),c=state.store?.customers?.find(x=>x.id===state.aiContext.customerId);
  const bits=[];if(p)bits.push(`Mặt hàng: ${p.name}`);if(c)bits.push(`Khách: ${c.name}`);
  if(bits.length){bar.innerHTML=`<span>Ngữ cảnh AI: ${esc(bits.join(" · "))}</span><button id="clearAiContext" class="ghost small">Xóa ngữ cảnh</button>`;bar.classList.remove("hidden");$("#clearAiContext").onclick=()=>{state.aiContext={productId:"",customerId:""};renderAIContext()}}
  else bar.classList.add("hidden")
}
function latestPreAISnapshot(){return [...(state.store.snapshots||[])].reverse().find(s=>String(s.label||"").includes("ai.execute"))}


function buildTodaySummaryCard(r){const d=r.data||{},w=document.createElement("div");w.className="bubble ai today-summary-card";w.innerHTML=`<strong>Tình hình hôm nay</strong><div class="summary-mini-grid"><div><span>Doanh thu</span><b>${money(d.revenue)}</b></div><div><span>Lợi nhuận</span><b>${money(d.profit)}</b></div><div><span>Đơn hàng</span><b>${d.orders||0}</b></div><div><span>Sản phẩm</span><b>${d.qty||0}</b></div><div><span>Nợ phát sinh</span><b>${money(d.debtNew)}</b></div><div><span>Đã thu nợ</span><b>${money(d.debtPaid)}</b></div></div><div class="hint">Tổng công nợ hiện tại: <b>${money(d.totalDebt)}</b></div>${d.low?.length?`<details><summary>Hàng sắp hết (${d.low.length})</summary>${d.low.map(x=>`<div>• ${esc(x.name)}: ${x.stock} ${esc(x.unit||"")}</div>`).join("")}</details>`:""}${d.variance?.length?`<details><summary>Chênh lệch kho (${d.variance.length})</summary>${d.variance.map(x=>`<div>• ${esc(x.name)}: ${x.diff>0?"+":""}${x.diff}</div>`).join("")}</details>`:""}`;return w}

function debtHistoryHtml(history){
  if(!history?.length)return '<div class="hint">Không có lịch sử nợ.</div>';
  return `<div class="ai-debt-history">${history.map(d=>`<div class="ai-debt-row"><div><strong>${new Date(d.createdAt).toLocaleDateString("vi-VN")}</strong><small>${esc(d.note||"Khoản nợ")}</small></div><div><b>${money(d.amount)}</b><small>Còn ${money(d.balance)}</small></div></div>`).join("")}</div>`
}
function buildDebtPaymentCard(r,popup=false){
  const wrapper=document.createElement("div");wrapper.className="bubble ai debt-payment-card";const selected=new Set(r.selectedDebtIds||r.history?.filter(d=>d.balance>0).map(d=>d.id)||[]);
  wrapper.innerHTML=`<strong>${esc(r.customer.name)} trả nợ</strong><div class="ai-debt-total">Tổng còn nợ: <b>${money(r.history?.reduce((z,d)=>z+(+d.balance||0),0)||r.total)}</b></div><div class="ai-debt-history">${(r.history||[]).map(d=>`<label class="ai-debt-row selectable ${d.balance<=0?"paid":""}"><input class="ai-debt-check" type="checkbox" data-id="${d.id}" data-balance="${d.balance}" ${selected.has(d.id)&&d.balance>0?"checked":""} ${d.balance<=0?"disabled":""}><div><strong>${new Date(d.createdAt).toLocaleDateString("vi-VN")}</strong><small>${esc(d.note||"Khoản nợ")}</small></div><div><b>${money(d.amount)}</b><small>Còn ${money(d.balance)}</small></div></label>`).join("")}</div><label class="ai-pay-label">Số tiền thanh toán<input class="ai-pay-amount" type="number" min="1" inputmode="numeric"></label><div class="row"><button class="primary ai-pay-confirm">Thanh toán khoản đã chọn</button><button class="ghost ai-pay-all">Chọn tất cả</button><button class="ghost ai-pay-cancel">Hủy</button></div>`;
  const checks=[...wrapper.querySelectorAll(".ai-debt-check")],amountInput=wrapper.querySelector(".ai-pay-amount"),selectedTotal=()=>checks.filter(x=>x.checked).reduce((z,x)=>z+(+x.dataset.balance||0),0),refresh=()=>{amountInput.value=Math.round(r.suggestedAmount||selectedTotal()||0)};refresh();checks.forEach(x=>x.onchange=()=>{r.suggestedAmount=0;refresh()});wrapper.querySelector(".ai-pay-all").onclick=()=>{checks.forEach(x=>{if(!x.disabled)x.checked=true});r.suggestedAmount=0;refresh()};
  wrapper.querySelector(".ai-pay-confirm").onclick=async()=>{const chosen=checks.filter(x=>x.checked),requested=Number(amountInput.value)||0;if(!chosen.length)return toast("Hãy chọn ít nhất một khoản nợ",true);if(requested<=0)return toast("Số tiền không hợp lệ",true);let left=requested,allocations=[];for(const x of chosen){const a=Math.min(left,+x.dataset.balance||0);if(a>0)allocations.push({debtId:x.dataset.id,amount:a});left-=a;if(left<=0)break}if(left>0)return toast("Số tiền lớn hơn tổng các khoản đã chọn",true);try{await mutate("debt.pay.selected",{customerId:r.customer.id,allocations,note:"Thanh toán qua AI",createdAt:new Date().toISOString(),source:"ai"});const undoSnap=state.store.snapshots?.at(-1);wrapper.innerHTML=`<strong>Đã thanh toán ${money(requested)} cho ${esc(r.customer.name)}</strong>`;attachUndoRedo(wrapper,undoSnap,`Thanh toán ${r.customer.name}`)}catch(e){toast(e.message,true)}};wrapper.querySelector(".ai-pay-cancel").onclick=()=>wrapper.remove();return wrapper
}


function attachUndoRedo(container,undoSnapshot,label="thao tác AI"){if(!undoSnapshot)return;const row=document.createElement("div");row.className="row ai-undo-redo";const undo=document.createElement("button");undo.className="ghost small";undo.textContent="↩ Hoàn tác";row.appendChild(undo);container.appendChild(document.createElement("br"));container.appendChild(row);undo.onclick=async()=>{if(!confirm(`Hoàn tác ${label}?`))return;try{await mutate("snapshot.create",{label:`REDO: ${label}`});const redoSnapshot=state.store.snapshots?.at(-1);await mutate("snapshot.restore",{id:undoSnapshot.id});toast("Đã hoàn tác");row.innerHTML="";const redo=document.createElement("button");redo.className="ghost small";redo.textContent="↪ Làm lại";row.appendChild(redo);redo.onclick=async()=>{if(!confirm(`Làm lại ${label}?`))return;try{await mutate("snapshot.restore",{id:redoSnapshot.id});toast("Đã làm lại")}catch(e){toast(e.message,true)}}}catch(e){toast(e.message,true)}}}
async function executeAIPlan(r,text,container){const mode=state.store.config?.ai?.safetyMode||"preview";if(mode==="ask"){container.textContent=`Tôi hiểu: ${r.summary}\n(Chế độ “Chỉ hỏi” đang bật nên AI không ghi dữ liệu.)`;return}const run=async()=>{await mutate("ai.execute",{plan:r.plan,message:text});const undoSnap=state.store.snapshots?.at(-1);container.textContent="Đã thực hiện: "+r.summary;attachUndoRedo(container,undoSnap,r.summary);toast("AI đã thực hiện")};if(mode==="autoSafe"&&r.safe===true){try{await run()}catch(e){toast(e.message,true)};return}const row=document.createElement("div");row.className="row";row.innerHTML='<button class="primary small">Xác nhận</button><button class="ghost small">Hủy</button>';container.appendChild(row);row.children[0].onclick=async()=>{try{await run()}catch(e){toast(e.message,true)}};row.children[1].onclick=()=>{container.textContent="Đã hủy thao tác."}}

async function sendAI(text){
  text=text.trim();if(!text)return;addBubble(text,"user");$("#aiInput").value="";
  try{
    const r=await api("/api/ai/plan",{method:"POST",body:JSON.stringify({storeId:state.storeId,message:text,context:state.aiContext})});
    if(r.context)state.aiContext={...state.aiContext,...r.context};if(r.type==="plan"&&state.aiContext.resolvedProductId)state.aiContext.resolvedProductId="";renderAIContext();

    if(r.type==="answer")return addBubble(r.answer,"ai");if(r.type==="todaySummary"){const card=buildTodaySummaryCard(r);$("#chat").appendChild(card);$("#chat").scrollTop=$("#chat").scrollHeight;return}
    if(r.type==="debtPayment"){const card=buildDebtPaymentCard(r,false);$("#chat").appendChild(card);$("#chat").scrollTop=$("#chat").scrollHeight;return}
    if(r.type==="clarify"){
      const b=addBubble(r.question||"Tôi cần anh xác nhận thêm.","ai","clarify");
      if(r.choices?.length){
        const row=document.createElement("div");row.className="choice-row";
        for(const c of r.choices){const btn=document.createElement("button");btn.className="ghost small";btn.textContent=c.label;btn.onclick=()=>{if(c.context)state.aiContext={...state.aiContext,...c.context};if(c.message.endsWith(" ")){$("#aiInput").value=c.message;$("#aiInput").focus()}else sendAI(c.message)};row.appendChild(btn)}
        b.appendChild(row)
      }
      return
    }

    const b=addBubble(`Tôi hiểu: ${r.summary}`,"ai","preview");
    await executeAIPlan(r,text,b);
  }catch(e){addBubble("Lỗi: "+e.message,"ai")}
}
$("#sendAi").onclick=()=>sendAI($("#aiInput").value);
$("#aiInput").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAI(e.target.value)}};
$$(".quick-prompts button").forEach(b=>b.onclick=()=>sendAI(b.dataset.prompt));
$("#aiAnalyzeBtn")?.addEventListener("click",()=>sendAI("Hôm nay kinh doanh thế nào? Có số liệu nào bất thường không và mặt hàng nào cần nhập sớm?"));

function renderAliases(){
  const box=$("#aliasList");if(!box||!state.store)return;
  const a=state.store.aliases||[];box.className=`list${a.length?"":" empty"}`;
  box.innerHTML=a.length?a.map(x=>{const p=state.store.products.find(p=>p.id===x.productId);return `<div class="list-row" data-id="${x.id}"><div><strong>${esc(x.alias)}</strong><small>= ${esc(p?.name||"Không tìm thấy sản phẩm")}</small></div><button class="ghost deleteAlias">Xóa</button></div>`}).join(""):"Chưa có alias.";
  box.querySelectorAll(".deleteAlias").forEach(b=>b.onclick=async()=>{if(confirm("Xóa alias này?"))try{await mutate("alias.delete",{id:b.closest(".list-row").dataset.id});toast("Đã xóa alias")}catch(e){toast(e.message,true)}})
}
$("#addAliasBtn")?.addEventListener("click",()=>{
  showModal(`<h3>Thêm tên gọi cho AI</h3><label>Tên gọi / viết tắt<input id="aliasName" placeholder="VD: rs"></label><label>Mặt hàng<select id="aliasProduct">${state.store.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label><button id="saveAlias" class="primary full">Lưu alias</button>`);
  $("#saveAlias").onclick=async()=>{try{await mutate("alias.add",{alias:$("#aliasName").value,productId:$("#aliasProduct").value});closeModal();toast("AI đã ghi nhớ tên gọi")}catch(e){toast(e.message,true)}}
});

const externalScripts=new Map();
function loadExternalScript(src,test){if(test())return Promise.resolve();if(externalScripts.has(src))return externalScripts.get(src);const p=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=()=>test()?resolve():reject(new Error("Thư viện tải xong nhưng không khởi tạo"));s.onerror=()=>reject(new Error("Không tải được thư viện ngoài"));document.head.appendChild(s)});externalScripts.set(src,p);return p}
const ensureXLSX=()=>loadExternalScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",()=>!!window.XLSX);
const ensureTesseract=()=>loadExternalScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",()=>!!window.Tesseract);

async function analyzeAIFile(file){
  const status=$("#aiFileStatus");status.textContent=`Đang đọc ${file.name}…`;
  try{
    let text="";
    if(file.type.startsWith("image/")){
      status.textContent="Đang tải bộ đọc ảnh…";await ensureTesseract();status.textContent="AI đang đọc chữ trong ảnh…";
      const result=await window.Tesseract.recognize(file,"vie+eng");
      text=result.data.text||"";
    }else if(/\.xlsx?$|\.xls$/i.test(file.name)){
      await ensureXLSX();
      const wb=window.XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
      text=wb.SheetNames.slice(0,3).map(n=>`[Sheet ${n}]\n`+window.XLSX.utils.sheet_to_csv(wb.Sheets[n])).join("\n").slice(0,12000);
    }else if(/\.csv$/i.test(file.name)){
      text=(await file.text()).slice(0,12000);
    }else{
      const raw=await file.text();try{text=JSON.stringify(JSON.parse(raw),null,2).slice(0,12000)}catch{text=raw.slice(0,12000)}
    }
    const ntext=norm(text),fname=norm(file.name);let prefix="Phân tích dữ liệu/tệp";if(ntext.includes("don gia")||ntext.includes("thanh tien")||ntext.includes("hoa don")||fname.includes("hoa don")||fname.includes("nhap"))prefix="Nhập kho từ hóa đơn";else if(ntext.includes("ton")||ntext.includes("kiem kho")||fname.includes("kiem")||fname.includes("ton"))prefix="Kiểm kho từ ảnh/file";status.textContent=`Đã đọc ${file.name}. AI đã nhận diện sơ bộ: ${prefix}.`;$("#aiInput").value=`${prefix}:
${text}`;$("#aiInput").focus()
  }catch(e){status.textContent="Lỗi đọc file: "+e.message;toast(e.message,true)}
}
$("#aiFile")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(f)await analyzeAIFile(f);e.target.value=""});


function download(obj,name){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;a.rel="noopener";a.style.display="none";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function readFile(f){return JSON.parse(await f.text())}
function sheetRows(){
  const st=state.store;
  return {
    Products:(st.products||[]).map(p=>({name:p.name,category:p.category,unit:p.unit,packSize:p.packSize,costPrice:p.costPrice,salePrice:p.salePrice,stock:p.stock,minStock:p.minStock,active:p.active!==false})),
    Customers:(st.customers||[]).map(c=>({name:c.name,active:c.active!==false,totalDebt:customerDebt(c.id)})),
    Debts:(st.debts||[]).map(d=>({customer:d.customer||st.customers.find(c=>c.id===d.customerId)?.name||"",amount:d.amount,paid:d.paid,balance:d.balance,note:d.note,createdAt:d.createdAt,saleId:d.saleId||""})),
    Sales:(st.sales||[]).map(s=>({id:s.id,createdAt:s.createdAt,customer:s.customer||"",paymentMethod:s.paymentMethod,total:s.total,costTotal:s.costTotal,profit:s.profit,note:s.note||"",items:(s.items||[]).map(i=>`${i.name} x${i.quantity}`).join(" | ")})),
    StockReceipts:(st.stockReceipts||[]).flatMap(r=>(r.lines||[]).map(l=>({receiptId:r.id,createdAt:r.createdAt,note:r.note||"",product:l.name||st.products.find(p=>p.id===l.productId)?.name||"",quantity:l.quantity}))),
    Audits:(st.audits||[]).flatMap(a=>(a.lines||[]).map(l=>({auditId:a.id,createdAt:a.createdAt,periodKey:a.periodKey||"",note:a.note||"",product:l.name||st.products.find(p=>p.id===l.productId)?.name||"",before:l.before,actual:l.actual,delta:l.delta,reconcileType:l.reconcileType||"unclassified",salePriceSnapshot:l.salePriceSnapshot??"",costPriceSnapshot:l.costPriceSnapshot??""})))
  }
}
async function exportExcel(){await ensureXLSX();const wb=window.XLSX.utils.book_new();for(const [name,rows] of Object.entries(sheetRows()))window.XLSX.utils.book_append_sheet(wb,window.XLSX.utils.json_to_sheet(rows),name);window.XLSX.writeFile(wb,`cantin-${todayKey()}.xlsx`)}
function normalizeExcelKey(k){return norm(k).replace(/[^a-z0-9]+/g,"")}
function mapExcelRows(rows,type){const m=v=>v===""||v===undefined||v===null?undefined:(typeof v==="number"?v:parseMoney(v));return rows.map(raw=>{const r={};for(const [k,v] of Object.entries(raw))r[normalizeExcelKey(k)]=v;if(type==="products")return {name:r.name||r.ten||r.sanpham||r.mathang,category:r.category||r.danhmuc,unit:r.unit||r.donvi,packSize:r.packsize||r.quycach,costPrice:m(r.costprice||r.gianhap),salePrice:m(r.saleprice||r.giaban),stock:r.stock||r.ton||r.tonkho,minStock:r.minstock||r.tonthieutoi};if(type==="customers")return {name:r.name||r.ten||r.khachhang};const d=r.createdat||r.ngay;return {customer:r.customer||r.khachhang||r.ten,amount:m(r.amount||r.sotien||r.tongno),paid:m(r.paid||r.datra),note:r.note||r.ghichu||r.monno,createdAt:d instanceof Date?d.toISOString():d}}).filter(x=>type==="debts"?x.customer&&x.amount:x.name)}
async function importExcelFile(file){await ensureXLSX();const wb=window.XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true}),get=name=>{const n=wb.SheetNames.find(x=>norm(x)===norm(name));return n?window.XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:""}):[]};const products=mapExcelRows(get("Products"),"products"),customers=mapExcelRows(get("Customers"),"customers"),debts=mapExcelRows(get("Debts"),"debts");if(!products.length&&!customers.length&&!debts.length)throw new Error("Không tìm thấy sheet Products / Customers / Debts");if(!confirm(`Nhập Excel: ${products.length} mặt hàng · ${customers.length} khách · ${debts.length} khoản nợ? Hệ thống sẽ tạo snapshot trước khi ghi.`))return;await mutate("data.tabular.import",{products,customers,debts});$("#excelStatus").textContent=`Đã nhập ${products.length} mặt hàng · ${customers.length} khách · ${debts.length} khoản nợ.`}
$("#exportExcel")?.addEventListener("click",()=>exportExcel().catch(e=>toast(e.message,true)));
$("#importExcel")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{await importExcelFile(f);toast("Đã nhập Excel")}catch(err){$("#excelStatus").textContent=err.message;toast(err.message,true)}e.target.value=""});

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


let pendingRecoveryData=null;
$("#recoveryFile")?.addEventListener("change",async e=>{
  const f=e.target.files?.[0]; if(!f)return;
  try{
    const raw=JSON.parse(await f.text());
    const store=raw?.data||raw?.store||raw;
    if(!store || typeof store!=="object") throw new Error("File không hợp lệ");
    const p=(store.products||[]).length,c=(store.customers||[]).length,d=(store.debts||[]).length,s=(store.sales||[]).length;
    pendingRecoveryData=store;
    $("#recoveryPreview").innerHTML=`<strong>${esc(f.name)}</strong><br>${p} mặt hàng · ${c} khách hàng · ${d} khoản nợ · ${s} đơn bán`;
    $("#runRecovery").disabled=false;
  }catch(err){
    pendingRecoveryData=null;
    $("#recoveryPreview").textContent="Không đọc được file backup: "+err.message;
    $("#runRecovery").disabled=true;
  }
});
$("#runRecovery")?.addEventListener("click",async()=>{
  if(!pendingRecoveryData)return;
  if(!confirm("Khôi phục dữ liệu từ file này? Hệ thống sẽ tạo snapshot hiện tại trước khi thay dữ liệu."))return;
  try{
    await mutate("recovery.import",{data:pendingRecoveryData});
    pendingRecoveryData=null;
    $("#recoveryFile").value="";
    $("#recoveryPreview").textContent="Khôi phục thành công.";
    $("#runRecovery").disabled=true;
    toast("Đã khôi phục dữ liệu");
  }catch(e){toast(e.message,true)}
});
$("#downloadEmergencyBackup")?.addEventListener("click",()=>{
  const payload={format:"cantin-ai-emergency-backup",version:"4.12",exportedAt:new Date().toISOString(),data:state.store};
  download(payload,`cantin-backup-${todayKey()}.json`);
  toast("Đã tạo file backup");
});

boot();

if("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(()=>{});
function addPopupBubble(text,kind="ai",extra=""){const box=$("#aiPopupChat");if(!box)return null;const b=document.createElement("div");b.className=`bubble ${kind} ${extra}`;b.textContent=text;box.appendChild(b);box.scrollTop=box.scrollHeight;return b}
function renderPopupAIContext(){const bar=$("#aiPopupContext");if(!bar||!state.store)return;const p=state.store.products.find(x=>x.id===state.aiContext.productId),c=state.store.customers.find(x=>x.id===state.aiContext.customerId),bits=[];if(p)bits.push(`Mặt hàng: ${p.name}`);if(c)bits.push(`Khách: ${c.name}`);if(bits.length){bar.innerHTML=`<span>${esc(bits.join(" · "))}</span><button id="clearPopupContext" class="ghost small">Xóa</button>`;bar.classList.remove("hidden");$("#clearPopupContext").onclick=()=>{state.aiContext={productId:"",customerId:""};renderPopupAIContext();renderAIContext()}}else bar.classList.add("hidden")}
async function sendAIPopup(text){
  text=text.trim();if(!text)return;addPopupBubble(text,"user");$("#aiPopupInput").value="";
  try{
    const r=await api("/api/ai/plan",{method:"POST",body:JSON.stringify({storeId:state.storeId,message:text,context:state.aiContext})});
    if(r.context)state.aiContext={...state.aiContext,...r.context};if(r.type==="plan"&&state.aiContext.resolvedProductId)state.aiContext.resolvedProductId="";renderPopupAIContext();renderAIContext();
    if(r.type==="answer")return addPopupBubble(r.answer,"ai");if(r.type==="todaySummary"){const card=buildTodaySummaryCard(r);$("#aiPopupChat").appendChild(card);$("#aiPopupChat").scrollTop=$("#aiPopupChat").scrollHeight;return}
    if(r.type==="debtPayment"){const card=buildDebtPaymentCard(r,true);$("#aiPopupChat").appendChild(card);$("#aiPopupChat").scrollTop=$("#aiPopupChat").scrollHeight;return}
    if(r.type==="clarify"){const b=addPopupBubble(r.question||"Tôi cần xác nhận thêm.","ai","clarify");if(r.choices?.length){const row=document.createElement("div");row.className="choice-row";for(const c of r.choices){const btn=document.createElement("button");btn.className="ghost small";btn.textContent=c.label;btn.onclick=()=>{if(c.context)state.aiContext={...state.aiContext,...c.context};sendAIPopup(c.message)};row.appendChild(btn)}b.appendChild(row)}return}
    const b=addPopupBubble(`Tôi hiểu: ${r.summary}`,"ai","preview");
    await executeAIPlan(r,text,b);
  }catch(e){addPopupBubble("Lỗi: "+e.message,"ai")}
}
function openAiPopup(){$("#aiPopup").classList.remove("hidden");$("#aiPopup").setAttribute("aria-hidden","false");renderPopupAIContext();setTimeout(()=>$("#aiPopupInput")?.focus(),80)}
function closeAiPopup(){$("#aiPopup").classList.add("hidden");$("#aiPopup").setAttribute("aria-hidden","true")}
$("#aiFab")?.addEventListener("click",openAiPopup);$("#closeAiPopup")?.addEventListener("click",closeAiPopup);$("#aiPopup")?.addEventListener("click",e=>{if(e.target.id==="aiPopup")closeAiPopup()});
$("#sendAiPopup")?.addEventListener("click",()=>sendAIPopup($("#aiPopupInput").value));$("#aiPopupInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAIPopup(e.target.value)}});
$$("[data-popup-prompt]").forEach(b=>b.onclick=()=>sendAIPopup(b.dataset.popupPrompt));
$("#openFullAi")?.addEventListener("click",()=>{closeAiPopup();navigate("assistant")});


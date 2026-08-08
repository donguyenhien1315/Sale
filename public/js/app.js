
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
  $("#saleDate").value=$("#saleDate").value||dtLocal();$("#stockinDate").value=$("#stockinDate").value||dtLocal();
  renderDashboard();renderIngredients();renderProducts();renderSales();renderCustomers();renderStockin();renderAudit();renderTransactions();renderSnapshots();renderStores();renderQuickProducts();renderCart();
}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===page));
  $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.target===page));
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
function renderCustomers(){
  const q=norm($("#debtSearch").value),sort=$("#debtSort").value;let arr=state.store.customers.filter(c=>!q||norm(c.name).includes(q)).map(c=>({...c,debtBalance:customerDebt(c.id)}));
  arr.sort((a,b)=>sort==="debt"?b.debtBalance-a.debtBalance:sort==="za"?b.name.localeCompare(a.name,"vi"):a.name.localeCompare(b.name,"vi"));
  $("#debtPageTotal").textContent=money(arr.reduce((a,c)=>a+c.debtBalance,0));$("#saleCustomer").innerHTML=`<option value="">Chọn khách</option>`+state.store.customers.map(c=>`<option value="${c.id}">${esc(c.name)}${customerDebt(c.id)?` — ${money(customerDebt(c.id))}`:""}</option>`).join("");
  $("#customers").innerHTML=arr.map(c=>`<article class="customer-item" data-id="${c.id}"><div class="customer-summary"><strong>${esc(c.name)}</strong><strong>${money(c.debtBalance)} ›</strong></div><div class="customer-detail hidden"></div></article>`).join("");
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

function showProductForm(p){showModal(`<h3>${p?"Chỉnh":"Thêm"} sản phẩm</h3><div class="form-grid"><label>Tên<input id="pName" value="${esc(p?.name||"")}"></label><label>Nhóm<select id="pCat"><option>Cà phê</option><option>Nước</option><option>Bánh Oishi</option><option>Kem</option><option>Khác</option>${p?.category&&!["Cà phê","Nước","Bánh Oishi","Kem","Khác"].includes(p.category)?`<option selected>${esc(p.category)}</option>`:""}</select></label><label>Đơn vị<input id="pUnit" value="${esc(p?.unit||"chai")}"></label><label>Quy cách<input id="pPack" value="${p?.packSize||1}" inputmode="numeric"></label><label>Giá nhập/đv<input id="pCost" value="${p?.costPrice||0}" inputmode="numeric"></label><label>Giá bán<input id="pSale" value="${p?.salePrice||0}" inputmode="numeric"></label><label>Tồn hiện tại<input id="pStock" value="${p?.stock||0}" inputmode="numeric"></label><label>Tồn tối thiểu<input id="pMin" value="${p?.minStock||0}" inputmode="numeric"></label></div><div class="row"><button id="saveProduct" class="primary">Lưu</button>${p?'<button id="deleteProduct" class="file-btn" style="background:#b42318">Xóa</button>':""}</div>`);if(p&&[...$("#pCat").options].some(o=>o.value===p.category))$("#pCat").value=p.category;$("#saveProduct").onclick=async()=>{const payload={id:p?.id,name:$("#pName").value,category:$("#pCat").value,unit:$("#pUnit").value,packSize:+$("#pPack").value||1,costPrice:parseMoney($("#pCost").value),salePrice:parseMoney($("#pSale").value),stock:+$("#pStock").value||0,minStock:+$("#pMin").value||0};try{await mutate(p?"product.update":"product.create",payload);closeModal();toast("Đã lưu sản phẩm")}catch(e){toast(e.message,true)}};if(p)$("#deleteProduct").onclick=async()=>{if(confirm("Xóa mặt hàng?"))try{await mutate("product.delete",{id:p.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}

function renderStockin(){const q=norm($("#stockinSearch").value),arr=state.store.products.filter(p=>p.trackStock!==false&&(!q||norm(p.name).includes(q)));$("#stockinProducts").innerHTML=arr.map(p=>`<div class="stockin-row" data-id="${p.id}"><div><strong>${esc(p.name)}</strong><small>Tồn ${num(p.stock)} · ${num(p.packSize)} / thùng</small></div><input class="cases" type="number" min="0" placeholder="Thùng"><input class="units" type="number" min="0" placeholder="Lẻ"></div>`).join("");const hist=[...state.store.stockReceipts].reverse().slice(0,100);$("#stockinHistory").className=`list${hist.length?"":" empty"}`;$("#stockinHistory").innerHTML=hist.length?hist.map(r=>`<div class="list-row" data-id="${r.id}"><div><strong>${new Date(r.createdAt).toLocaleString("vi-VN")}</strong><small>${esc(r.note||"Phiếu nhập")} · ${r.lines.length} mặt hàng</small></div><button class="ghost danger-text deleteReceipt">Xóa</button></div>`).join(""):"Chưa có phiếu.";$("#stockinHistory").querySelectorAll(".deleteReceipt").forEach(b=>b.onclick=async()=>{if(confirm("Xóa phiếu và trừ lại kho?"))try{await mutate("stockin.delete",{id:b.closest(".list-row").dataset.id});toast("Đã xóa phiếu")}catch(e){toast(e.message,true)}})}
$("#stockinSearch").oninput=renderStockin;$("#saveStockin").onclick=async()=>{const lines=$$("#stockinProducts .stockin-row").map(r=>({productId:r.dataset.id,cases:+r.querySelector(".cases").value||0,units:+r.querySelector(".units").value||0})).filter(x=>x.cases||x.units);if(!lines.length)return toast("Chưa nhập số lượng",true);try{await mutate("stockin.create",{createdAt:new Date($("#stockinDate").value).toISOString(),note:$("#stockinNote").value,lines});toast("Đã nhập kho")}catch(e){toast(e.message,true)}};

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

boot();

if("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(()=>{});

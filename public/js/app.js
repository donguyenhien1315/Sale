
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
  renderDashboard();renderProducts();renderSales();renderCustomers();renderStockin();renderAudit();renderTransactions();renderSnapshots();renderStores();renderQuickProducts();renderCart();
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

function renderQuickProducts(){
  const q=norm($("#saleSearch").value),list=state.store.products.filter(p=>p.active!==false&&(!q||norm(p.name+" "+p.category).includes(q)));
  $("#quickProducts").innerHTML=list.map(p=>`<button class="product-tile" data-id="${p.id}"><strong>${esc(p.name)}</strong><small>Tồn ${num(p.stock)} ${esc(p.unit||"")}</small><div class="price">${money(p.salePrice)}</div></button>`).join("");
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
  const box=card.querySelector(".customer-detail"),id=card.dataset.id,c=state.store.customers.find(c=>c.id===id);if(!box.classList.contains("hidden"))return box.classList.add("hidden");
  const debts=[...state.store.debts.filter(d=>d.customerId===id)].reverse();
  box.innerHTML=`<div class="form-grid"><label>Số tiền<input class="newDebtMoney" placeholder="VD 43k hoặc 150000"></label><label>Món nợ<input class="newDebtNote" placeholder="VD 3 kem"></label></div><div class="row"><button class="primary small addDebt">Ghi nợ</button><button class="file-btn payDebt">Trả nợ</button></div><div class="debt-lines">${debts.map(d=>`<div class="debt-line" data-id="${d.id}"><div><strong>${money(d.balance)}</strong><small>${new Date(d.createdAt).toLocaleDateString("vi-VN")} · ${esc(d.note||"")}</small></div><button class="ghost debtEdit">Sửa</button></div>`).join("")||'<div class="hint">Chưa có khoản nợ.</div>'}</div>`;box.classList.remove("hidden");
  box.querySelector(".addDebt").onclick=async()=>{const amount=parseMoney(box.querySelector(".newDebtMoney").value);if(!amount)return toast("Số tiền không hợp lệ",true);try{await mutate("debt.add",{customerId:id,amount,note:box.querySelector(".newDebtNote").value});toast("Đã ghi nợ")}catch(e){toast(e.message,true)}};
  box.querySelector(".payDebt").onclick=()=>showPayment(c);
  box.querySelectorAll(".debtEdit").forEach(b=>b.onclick=()=>showDebtEdit(state.store.debts.find(d=>d.id===b.closest(".debt-line").dataset.id)));
}
function showPayment(c){showModal(`<h3>${esc(c.name)} trả nợ</h3><label>Số tiền<input id="payMoney" placeholder="VD 100k"></label><label>Ghi chú<input id="payNote"></label><button id="doPay" class="primary full">Xác nhận</button>`);$("#doPay").onclick=async()=>{const amount=parseMoney($("#payMoney").value);try{await mutate("debt.pay",{customerId:c.id,amount,note:$("#payNote").value});closeModal();toast("Đã ghi nhận trả nợ")}catch(e){toast(e.message,true)}}}
function showDebtEdit(d){showModal(`<h3>Chỉnh khoản nợ</h3><label>Số tiền<input id="editDebtMoney" value="${d.amount}"></label><label>Ghi chú<input id="editDebtNote" value="${esc(d.note||"")}"></label><div class="row"><button id="saveDebtEdit" class="primary">Lưu</button><button id="deleteDebt" class="file-btn" style="background:#b42318">Xóa</button></div>`);$("#saveDebtEdit").onclick=async()=>{try{await mutate("debt.update",{id:d.id,amount:parseMoney($("#editDebtMoney").value,d.amount),note:$("#editDebtNote").value});closeModal();toast("Đã sửa khoản nợ")}catch(e){toast(e.message,true)}};$("#deleteDebt").onclick=async()=>{if(confirm("Xóa khoản nợ này?"))try{await mutate("debt.delete",{id:d.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}
$("#debtSearch").oninput=renderCustomers;$("#debtSort").onchange=renderCustomers;
$("#addCustomerBtn").onclick=()=>{showModal(`<h3>Thêm khách hàng</h3><label>Tên<input id="newCustomerName"></label><button id="saveCustomer" class="primary full">Lưu</button>`);$("#saveCustomer").onclick=async()=>{try{await mutate("customer.create",{name:$("#newCustomerName").value});closeModal();toast("Đã thêm khách")}catch(e){toast(e.message,true)}}};

function renderProducts(){const q=norm($("#productSearch").value),arr=state.store.products.filter(p=>!q||norm(p.name+" "+p.category).includes(q));$("#products").innerHTML=arr.map(p=>`<div class="list-row" data-id="${p.id}"><div><strong>${esc(p.name)}</strong><small>${esc(p.category)} · tồn ${num(p.stock)} ${esc(p.unit)} · bán ${money(p.salePrice)}</small></div><button class="ghost editProduct">Sửa</button></div>`).join("");$("#products").querySelectorAll(".editProduct").forEach(b=>b.onclick=()=>showProductForm(state.store.products.find(p=>p.id===b.closest(".list-row").dataset.id)))}
$("#productSearch").oninput=renderProducts;$("#addProductBtn").onclick=()=>showProductForm(null);
function showProductForm(p){showModal(`<h3>${p?"Chỉnh":"Thêm"} sản phẩm</h3><div class="form-grid"><label>Tên<input id="pName" value="${esc(p?.name||"")}"></label><label>Nhóm<input id="pCat" value="${esc(p?.category||"Nước")}"></label><label>Đơn vị<input id="pUnit" value="${esc(p?.unit||"chai")}"></label><label>Quy cách<input id="pPack" value="${p?.packSize||1}" inputmode="numeric"></label><label>Giá nhập/đv<input id="pCost" value="${p?.costPrice||0}" inputmode="numeric"></label><label>Giá bán<input id="pSale" value="${p?.salePrice||0}" inputmode="numeric"></label><label>Tồn hiện tại<input id="pStock" value="${p?.stock||0}" inputmode="numeric"></label><label>Tồn tối thiểu<input id="pMin" value="${p?.minStock||0}" inputmode="numeric"></label></div><div class="row"><button id="saveProduct" class="primary">Lưu</button>${p?'<button id="deleteProduct" class="file-btn" style="background:#b42318">Xóa</button>':""}</div>`);$("#saveProduct").onclick=async()=>{const payload={id:p?.id,name:$("#pName").value,category:$("#pCat").value,unit:$("#pUnit").value,packSize:+$("#pPack").value||1,costPrice:parseMoney($("#pCost").value),salePrice:parseMoney($("#pSale").value),stock:+$("#pStock").value||0,minStock:+$("#pMin").value||0};try{await mutate(p?"product.update":"product.create",payload);closeModal();toast("Đã lưu sản phẩm")}catch(e){toast(e.message,true)}};if(p)$("#deleteProduct").onclick=async()=>{if(confirm("Xóa mặt hàng?"))try{await mutate("product.delete",{id:p.id});closeModal();toast("Đã xóa")}catch(e){toast(e.message,true)}}}

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

boot();

if("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(()=>{});

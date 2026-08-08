import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';

const workerSrc = new URL('../functions/api/[[path]].js', import.meta.url);
const workerCopy = new URL('./worker-under-test.mjs', import.meta.url);
fs.copyFileSync(workerSrc, workerCopy);
const {onRequest} = await import(pathToFileURL(workerCopy.pathname).href + `?t=${Date.now()}`);

let dbRoot = null;
globalThis.fetch = async (url, opts={}) => {
  const u=String(url);
  if(u.includes('/rpc/cantin_read_store_public')) return new Response(JSON.stringify(dbRoot),{status:200,headers:{'content-type':'application/json'}});
  if(u.includes('/rpc/cantin_write_store_public')) {const body=JSON.parse(opts.body||'{}');dbRoot=structuredClone(body.p_data);return new Response('null',{status:200,headers:{'content-type':'application/json'}});}
  throw new Error('Unexpected fetch '+u);
};

async function call(path,{method='GET',body}={}){
  const req=new Request('https://local.test'+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const res=await onRequest({request:req,env:{SUPABASE_URL:'https://mock.supabase.local',SUPABASE_ANON_KEY:'test'}});
  const data=await res.json();
  return {status:res.status,data};
}
async function action(revision,action,payload={}){return call('/api/action',{method:'POST',body:{revision,action,payload}})}

let r=await call('/api/bootstrap');assert.equal(r.status,200);let rev=r.data.revision;
assert.equal(r.data.store.meta.version,'4.12');

r=await action(rev,'data.tabular.import',{products:[{name:'Pepsi',category:'Nước',unit:'lon',packSize:24,costPrice:10000,salePrice:15000,stock:10,minStock:2}],customers:[{name:'Quỳnh'}],debts:[]});assert.equal(r.status,200);rev=r.data.revision;
let st=r.data.store;const pepsi=st.products.find(p=>p.name==='Pepsi'), quynh=st.customers.find(c=>c.name==='Quỳnh');assert(pepsi&&quynh);assert.equal(pepsi.stock,10);

r=await action(rev,'customer.update',{id:quynh.id,name:'Quỳnh 67'});assert.equal(r.status,200);rev=r.data.revision;st=r.data.store;const q=st.customers.find(c=>c.id===quynh.id);assert.equal(q.name,'Quỳnh 67');

r=await action(rev,'sale.create',{paymentMethod:'debt',customerId:q.id,items:[{productId:pepsi.id,quantity:2}]});assert.equal(r.status,200);rev=r.data.revision;st=r.data.store;let sale=st.sales.at(-1);assert.equal(st.products.find(p=>p.id===pepsi.id).stock,8);assert.equal(st.debts.find(d=>d.saleId===sale.id).amount,30000);

r=await action(rev,'sale.update',{id:sale.id,paymentMethod:'debt',customerId:q.id,items:[{productId:pepsi.id,quantity:3}]});assert.equal(r.status,200);rev=r.data.revision;st=r.data.store;sale=st.sales.find(s=>s.id===sale.id);assert.equal(st.products.find(p=>p.id===pepsi.id).stock,7);assert.equal(st.debts.find(d=>d.saleId===sale.id).amount,45000);

r=await action(rev,'stockin.create',{lines:[{productId:pepsi.id,cases:0,units:10}],note:'test'});assert.equal(r.status,200);rev=r.data.revision;st=r.data.store;const receipt=st.stockReceipts.at(-1);assert.equal(st.products.find(p=>p.id===pepsi.id).stock,17);
r=await action(rev,'stockin.update',{id:receipt.id,lines:[{productId:pepsi.id,quantity:5}],note:'edit'});assert.equal(r.status,200);rev=r.data.revision;st=r.data.store;assert.equal(st.products.find(p=>p.id===pepsi.id).stock,12);assert.equal(st.stockReceipts.find(x=>x.id===receipt.id).lines[0].quantity,5);

r=await call('/api/ai/plan',{method:'POST',body:{storeId:r.data.storeId,message:'Quỳnh 67 nợ 42k 2c 1 mèo',context:{}}});assert.equal(r.status,200);assert.equal(r.data.type,'plan');assert.equal(r.data.plan.kind,'debt.add');assert.equal(r.data.plan.amount,42000);assert.match(r.data.plan.note,/2c 1 mèo/);assert.equal(r.data.plan.productId,undefined);

r=await call('/api/ai/plan',{method:'POST',body:{storeId:dbRoot.activeStoreId,message:'Pepsi hết',context:{}}});assert.equal(r.status,200);assert.equal(r.data.type,'plan');assert.equal(r.data.plan.kind,'inventory.set');assert.equal(r.data.plan.after,0);

r=await action(rev,'ai.execute',{plan:{kind:'evil.write'},message:'bad'});assert.equal(r.status,400);assert.match(r.data.error,/chưa được cho phép|không hợp lệ/i);

// create enough successful mutations to verify snapshot cap
for(let i=0;i<15;i++){r=await action(rev,'config.update',{config:{ai:{safetyMode:i%2?'preview':'ask'}}});assert.equal(r.status,200);rev=r.data.revision;}
st=r.data.store;assert(st.snapshots.length<=12);assert(st.snapshots.every(s=>(s.data.transactions||[]).length<=120));

fs.unlinkSync(workerCopy);
console.log('PASS v4.12 smoke: bootstrap, import, customer rename, sale edit, stock-in edit, literal debt note, AI validation, snapshot cap');

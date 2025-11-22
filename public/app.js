// app.js — fixed navigation + load-on-demand
const API = '/api';

function qs(s){ return document.querySelector(s) }
function qsa(s){ return Array.from(document.querySelectorAll(s)) }

// SPA navigation
qsa('.nav-btn').forEach(b => {
  b.addEventListener('click', (e) => {
    qsa('.nav-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const view = b.dataset.view;
    showView(view);
  });
});
function showView(id){
  qsa('.view').forEach(v => {
    const is = v.id === 'view-'+id;
    v.classList.toggle('active', is);
    v.setAttribute('aria-hidden', !is);
  });
  // lazy load data per view
  if(id === 'inventory') loadInventory();
  if(id === 'donor') loadDonors();
}

// toasts
const toastRoot = (() => {
  let t = qs('#toast');
  if(!t){ t = document.createElement('div'); t.id='toast'; document.body.appendChild(t) }
  return t;
})();
function toast(msg, type='success'){
  const el = document.createElement('div'); el.className = 'toast ' + (type==='success'?'success':'error'); el.textContent = msg;
  toastRoot.prepend(el); setTimeout(()=> el.remove(), 3000);
}

// Donor form
qs('#donor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = {
    name: qs('#donor-name').value.trim(),
    age: Number(qs('#donor-age').value),
    blood: qs('#donor-group').value,
    contact: qs('#donor-contact').value.trim()
  };
  if(!d.name || !d.blood){ toast('Enter required fields','error'); return }
  try{
    const res = await fetch(API + '/donors', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(d) });
    if(!res.ok) throw new Error('failed');
    toast('Donor registered', 'success');
    e.target.reset();
    loadDonors();
  } catch(e){ toast('Could not register donor','error') }
});

qs('#prefill-donor').addEventListener('click', async () => {
  const sample = { name:'John Doe', age:30, blood:'O+', contact:'9876543210' };
  await fetch(API + '/donors', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sample) });
  toast('Sample donor added','success'); loadDonors();
});

// Request form
qs('#request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = {
    name: qs('#req-name').value.trim(),
    blood: qs('#req-group').value,
    qty: Number(qs('#req-qty').value),
    loc: qs('#req-loc').value.trim(),
    contact: qs('#req-contact').value.trim()
  };
  if(!r.name || !r.blood || r.qty <= 0){ toast('Complete the form','error'); return }
  try{
    const res = await fetch(API + '/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(r) });
    const data = await res.json();
    toast(data.message || 'Request placed','success');
    qs('#request-form').reset();
    if(document.querySelector('#view-inventory').classList.contains('active')) loadInventory();
  } catch(e){ toast('Could not place request','error') }
});

qs('#match-blood').addEventListener('click', async ()=>{
  const blood = qs('#req-group').value;
  if(!blood){ toast('Choose blood group first','error'); return }
  const donors = await fetch(API + '/donors').then(r=>r.json()).catch(()=>[]);
  const matches = donors.filter(d => d.blood === blood);
  const el = qs('#request-results'); el.innerHTML = '';
  if(!matches.length) return el.textContent = 'No donors found';
  matches.forEach(m => {
    const div = document.createElement('div'); div.className = 'row-item';
    div.innerHTML = `<div><strong>${m.name}</strong><div class="muted">${m.contact}</div></div><div><button class="nav-btn" onclick="contactDonor('${m.contact}')">Contact</button></div>`;
    el.appendChild(div);
  });
});

window.contactDonor = (c) => toast('Contact: ' + c, 'success');

// Loaders
async function loadDonors(){
  const list = await fetch(API + '/donors').then(r=>r.json()).catch(()=>[]);
  const container = qs('#donor-list'); container.innerHTML = '';
  if(!list.length) { container.innerHTML = '<div class="muted">No donors yet</div>'; return }
  list.forEach(d => {
    const div = document.createElement('div'); div.className = 'row-item';
    div.innerHTML = `<div><strong>${d.name}</strong> <div class="muted">${d.blood} • ${d.age} • ${d.contact}</div></div><div><button class="nav-btn" onclick="deleteDonor('${d.id}')">Remove</button></div>`;
    container.appendChild(div);
  });
}

window.deleteDonor = async function(id){
  if(!confirm('Delete donor?')) return;
  await fetch(API + '/donors/' + id, { method:'DELETE' });
  toast('Donor removed','success'); loadDonors();
}

async function loadInventory(){
  const inv = await fetch(API + '/inventory').then(r=>r.json()).catch(()=>({}));
  const invList = qs('#inventory-list'); invList.innerHTML = '';
  const keys = Object.keys(inv).sort();
  keys.forEach(k => {
    const row = document.createElement('div'); row.className = 'row-item';
    row.innerHTML = `<div><strong>${k}</strong><div class="muted">${inv[k]} unit(s)</div></div>
      <div><button class="nav-btn" onclick="changeUnits('${k}',1)">+1</button> <button class="nav-btn" onclick="changeUnits('${k}',-1)">-1</button></div>`;
    invList.appendChild(row);
  });
}

window.changeUnits = async function(group, delta){
  const ep = delta>0 ? '/inventory/add' : '/inventory/remove';
  await fetch(API + ep, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ group, qty: Math.abs(delta) })});
  toast('Inventory updated','success'); loadInventory();
}

qs('#search-group').addEventListener('change', (e) => {
  // simple filter: reload and hide non matching using redraw
  loadInventory();
});

qs('#reset-sample').addEventListener('click', () => { alert('To reset inventory edit db.json in repo and redeploy.'); });

// init — show home only
showView('home');

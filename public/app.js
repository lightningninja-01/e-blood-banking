// public/app.js — frontend for file-backed API served from same origin
const API = '/api'; // same origin, file-backed endpoints under /api

// simple SPA navigation
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
navBtns.forEach(b => b.addEventListener('click', e => showView(e.target.dataset.view)));
function showView(id) {
  views.forEach(v => v.id === 'view-'+id ? v.classList.add('active') : v.classList.remove('active'));
}

// donors
document.getElementById('donor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = {
    name: document.getElementById('donor-name').value.trim(),
    age: Number(document.getElementById('donor-age').value),
    blood: document.getElementById('donor-group').value,
    contact: document.getElementById('donor-contact').value.trim()
  };
  const res = await fetch(API + '/donors', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(d) });
  if (!res.ok) return alert('Failed to register donor');
  alert('Donor registered (inventory +1).');
  e.target.reset();
  loadDonors(); loadInventory();
});

document.getElementById('prefill-donor').addEventListener('click', async () => {
  const sample = { name:'John Doe', age:30, blood:'O+', contact:'9876543210' };
  await fetch(API + '/donors', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sample) });
  loadDonors(); loadInventory();
});

// requests
document.getElementById('request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = {
    name: document.getElementById('req-name').value.trim(),
    blood: document.getElementById('req-group').value,
    qty: Number(document.getElementById('req-qty').value),
    loc: document.getElementById('req-loc').value.trim(),
    contact: document.getElementById('req-contact').value.trim()
  };
  const res = await fetch(API + '/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(r) });
  const data = await res.json();
  loadInventory();
  const el = document.getElementById('request-results');
  const item = document.createElement('div'); item.className = 'row-item';
  item.textContent = data.message || JSON.stringify(data);
  el.prepend(item);
  e.target.reset();
});

// auto-match donors
document.getElementById('match-blood').addEventListener('click', async () => {
  const blood = document.getElementById('req-group').value;
  if (!blood) return alert('Select blood group first.');
  const donors = await fetch(API + '/donors').then(r=>r.json());
  const matches = donors.filter(d => d.blood === blood);
  const el = document.getElementById('request-results'); el.innerHTML = '';
  if (!matches.length) el.textContent = 'No donors with that blood group found.';
  else matches.forEach(m => {
    const div = document.createElement('div'); div.className = 'row-item';
    div.innerHTML = `<div>${m.name} • ${m.contact}</div><div><button onclick="contactDonor('${m.contact}')">Contact</button></div>`;
    el.appendChild(div);
  });
});

window.contactDonor = function(contact){ alert('Contact: ' + contact + ' (demo)'); }

// load donors
async function loadDonors(){
  const donors = await fetch(API + '/donors').then(r=>r.json());
  const el = document.getElementById('donor-list'); el.innerHTML = '';
  donors.forEach(d => {
    const div = document.createElement('div'); div.className = 'row-item';
    div.innerHTML = `<div><strong>${d.name}</strong> (${d.age}) • ${d.blood} • ${d.contact}</div><div><button onclick="deleteDonor('${d.id}')">Remove</button></div>`;
    el.appendChild(div);
  });
}

window.deleteDonor = async function(id){
  if (!confirm('Delete donor?')) return;
  await fetch(API + '/donors/' + id, { method: 'DELETE' });
  loadDonors();
}

// inventory
async function loadInventory(filter){
  const inv = await fetch(API + '/inventory').then(r=>r.json());
  const invList = document.getElementById('inventory-list'); invList.innerHTML = '';
  Object.entries(inv).forEach(([g,q]) => {
    if (filter && filter !== g) return;
    const div = document.createElement('div'); div.className = 'row-item';
    div.innerHTML = `<div><strong>${g}</strong> — ${q} unit(s)</div>
      <div><button onclick="changeUnits('${g}',1)">+1</button><button onclick="changeUnits('${g}',-1)">-1</button></div>`;
    invList.appendChild(div);
  });
  const dash = document.getElementById('dash-inv'); dash.innerHTML = ''; Object.entries(inv).forEach(([g,q])=>{ const p=document.createElement('div'); p.textContent=`${g}: ${q}`; dash.appendChild(p) });
}

window.changeUnits = async function(group, delta){
  const endpoint = delta > 0 ? '/inventory/add' : '/inventory/remove';
  await fetch(API + endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ group, qty: Math.abs(delta) })});
  loadInventory(document.getElementById('search-group').value);
}

document.getElementById('search-group').addEventListener('change', (e) => loadInventory(e.target.value));
document.getElementById('reset-sample').addEventListener('click', () => {
  alert('To reset inventory, edit db.json in the repo and redeploy.');
});

// init
showView('home');
loadInventory();
loadDonors();

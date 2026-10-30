const defaults=[{id:1,name:'Nami Lamp',category:'Lighting',price:289.9,stock:8,tag:'New',image:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80'},{id:2,name:'Serena Armchair',category:'Furniture',price:1249,stock:4,tag:'Bestseller',image:'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80'},{id:3,name:'Terra Vase',category:'Decor',price:139.9,stock:12,tag:'',image:'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80'},{id:4,name:'Duna Table',category:'Furniture',price:479.9,stock:6,tag:'Limited edition',image:'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80'},{id:5,name:'Brisa Throw',category:'Textiles',price:219.9,stock:10,tag:'',image:'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'},{id:6,name:'Orbe Tray',category:'Decor',price:159.9,stock:9,tag:'New',image:'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80'},{id:7,name:'Linha Chair',category:'Furniture',price:699.9,stock:5,tag:'',image:'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=800&q=80'},{id:8,name:'Horizonte Cushion',category:'Textiles',price:119.9,stock:14,tag:'',image:'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80'}];
let products=JSON.parse(localStorage.getItem('noma-products')||'null')||defaults,cart=JSON.parse(localStorage.getItem('noma-cart')||'[]'),filter='All';const money=v=>Number(v).toLocaleString('en-US',{style:'currency',currency:'BRL'}),save=()=>{localStorage.setItem('noma-products',JSON.stringify(products));localStorage.setItem('noma-cart',JSON.stringify(cart))};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),safeImage=v=>/^https:\/\//i.test(String(v||''))?String(v):'';
async function syncCatalog(){try{const response=await fetch('/api/products');if(!response.ok)return;const remote=await response.json();if(!Array.isArray(remote)||!remote.length)return;products=remote.map(p=>({...p,id:Number(p.id),price:Number(p.price_cents)/100}));save();renderFilters();renderProducts();renderCart()}catch{}}
function renderFilters(){let cs=['All',...new Set(products.map(p=>p.category))];filters.innerHTML=cs.map(c=>`<button class="filter ${c===filter?'on':''}" onclick="setFilter(this.dataset.c)" data-c="${esc(c)}">${esc(c)}</button>`).join('')}function setFilter(c){filter=c;renderFilters();renderProducts()}
function renderProducts(){let ps=filter==='All'?products:products.filter(p=>p.category===filter);grid.innerHTML=ps.length?ps.map(p=>`<article class="product" data-product-id="${p.id}">
<div class="media">
<img src="${esc(safeImage(p.image))}" alt="${esc(p.name)}" loading="lazy">${p.tag?`<span class="tag">${esc(p.tag)}</span>`:''}<button class="add" onclick="event.stopPropagation();add(${Number(p.id)})" aria-label="Add to cart">+</button>
</div>
<div class="info">
<div class="cat">${esc(p.category)}</div>
<div class="name">${esc(p.name)}</div>
<span class="price">${money(p.price)}</span>
</div>
</article>`).join(''):'<div class="empty">No products in this category.</div>';document.querySelectorAll('.product').forEach(card=>{card.onclick=()=>openProduct(Number(card.dataset.productId))})}
function openProduct(id){const p=products.find(x=>x.id===id);if(!p)return;productBox.innerHTML=`<button class="x product-close" onclick="closeModal('productModal')">×</button><div class="product-modal-content"><img src="${esc(safeImage(p.image))}" alt="${esc(p.name)}"><div class="product-modal-copy"><div class="cat">${esc(p.category)}</div><h3>${esc(p.name)}</h3><strong class="price">${money(p.price)}</strong><p>${esc(p.description||'A piece made to be part of your daily life for years.')}</p><small>${Number(p.stock)} units available</small><button class="btn" onclick="add(${Number(p.id)});closeModal('productModal')">Add to bag →</button></div></div>`;productModal.classList.add('on')}
function add(id){id=Number(id);let p=products.find(x=>Number(x.id)===id),i=cart.find(x=>Number(x.id)===id);if(!p||p.stock<1)return notify('Product out of stock');if(i&&i.qty>=p.stock)return notify('Maximum stock reached');i?i.qty++:cart.push({id,qty:1});save();renderCart();notify(p.name+' added to bag')}
function qty(id,n){id=Number(id);let i=cart.find(x=>Number(x.id)===id),p=products.find(x=>Number(x.id)===id);if(!i||!p)return;i.qty=Math.max(0,Math.min(p.stock,i.qty+n));if(!i.qty)cart=cart.filter(x=>Number(x.id)!==id);save();renderCart()}const total=()=>cart.reduce((s,i)=>s+(products.find(p=>Number(p.id)===Number(i.id))?.price||0)*i.qty,0);
function renderCart(){let valid=cart.map(i=>({...i,p:products.find(p=>Number(p.id)===Number(i.id))})).filter(i=>i.p);count.textContent=valid.reduce((s,i)=>s+i.qty,0);items.innerHTML=valid.length?valid.map(i=>`<div class="item">
<img src="${esc(safeImage(i.p.image))}" alt="${esc(i.p.name)}">
<div>
<h4>${esc(i.p.name)}</h4>
<b>${money(i.p.price)}</b>
<div class="qty">
<button onclick="qty(${i.id},-1)">−</button>
<span>${i.qty}</span>
<button onclick="qty(${i.id},1)">+</button>
</div>
</div>
<button class="remove" onclick="qty(${i.id},-${i.qty})">Remove</button>
</div>`).join(''):'<div class="empty">Your bag is empty.</div>';subtotal.textContent=money(total())}
function cartOpen(on){drawer.classList.toggle('on',on);shade.classList.toggle('on',on)}function closeModal(id){document.getElementById(id).classList.remove('on')}function openAdmin(){renderAdmin();adminModal.classList.add('on')}function renderAdmin(){adminList.innerHTML='<h4>Catalog products</h4>'+products.map(p=>`<div class="admin-row">
<div>
<b>${esc(p.name)}</b>
<br>
<small>${esc(p.category)} · ${money(p.price)} · ${Number(p.stock)} in stock</small>
</div>
<button class="remove" onclick="del(${p.id})">Remove</button>
</div>`).join('')}function del(id){products=products.filter(p=>p.id!==id);cart=cart.filter(i=>i.id!==id);save();renderAdmin();renderFilters();renderProducts();renderCart()}
function checkout(){if(!cart.length)return notify('Add a product before continuing');cartOpen(false);let sub=total(),frete=sub>=299?0:24.9;summary.innerHTML=`<div>
<span>Products</span>
<b>${money(sub)}</b>
</div>
<div>
<span>Shipping</span>
<b>${frete?money(frete):'Free'}</b>
</div>
<div class="total">
<span>Total</span>
<span>${money(sub+frete)}</span>
</div>`;checkoutModal.classList.add('on')}function notify(t){toast.textContent=t;toast.classList.add('on');clearTimeout(window.tt);window.tt=setTimeout(()=>toast.classList.remove('on'),2200)}
productForm.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target);products.unshift({id:Date.now(),name:f.get('name'),category:f.get('category'),price:+f.get('price'),stock:+f.get('stock'),image:f.get('image'),tag:f.get('tag')});save();e.target.reset();renderAdmin();renderFilters();renderProducts();notify('Product added')});pay.addEventListener('change',()=>card.style.display=pay.value==='Credit card'?'flex':'none');checkoutForm.addEventListener('submit',e=>{e.preventDefault();cart.forEach(i=>{let p=products.find(p=>p.id===i.id);if(p)p.stock-=i.qty});cart=[];save();renderCart();renderProducts();checkoutBox.innerHTML=`<div class="success">
<div class="check">✓</div>
<h3>Order confirmed!</h3>
<p>Order <b>#${String(Date.now()).slice(-6)}</b> received.<br>This is a demo purchase; no payment was collected.</p>
<button class="btn" onclick="location.reload()">Back to shop</button>
</div>`});renderFilters();renderProducts();renderCart();syncCatalog();

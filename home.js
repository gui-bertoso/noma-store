const defaults=[{id:1,name:'Luminária Nami',category:'Iluminação',price:289.9,stock:8,tag:'Novo',image:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80'},{id:2,name:'Poltrona Serena',category:'Mobiliário',price:1249,stock:4,tag:'Mais vendido',image:'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80'},{id:3,name:'Vaso Terra',category:'Decoração',price:139.9,stock:12,tag:'',image:'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80'},{id:4,name:'Mesa Duna',category:'Mobiliário',price:479.9,stock:6,tag:'Edição limitada',image:'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80'},{id:5,name:'Manta Brisa',category:'Têxteis',price:219.9,stock:10,tag:'',image:'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'},{id:6,name:'Bandeja Orbe',category:'Decoração',price:159.9,stock:9,tag:'Novo',image:'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80'},{id:7,name:'Cadeira Linha',category:'Mobiliário',price:699.9,stock:5,tag:'',image:'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=800&q=80'},{id:8,name:'Almofada Horizonte',category:'Têxteis',price:119.9,stock:14,tag:'',image:'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80'}];
let products=JSON.parse(localStorage.getItem('noma-products')||'null')||defaults,cart=JSON.parse(localStorage.getItem('noma-cart')||'[]'),filter='Todos';const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),save=()=>{localStorage.setItem('noma-products',JSON.stringify(products));localStorage.setItem('noma-cart',JSON.stringify(cart))};
async function syncCatalog(){try{const response=await fetch('/api/products');if(!response.ok)return;const remote=await response.json();if(!Array.isArray(remote)||!remote.length)return;products=remote.map(p=>({...p,id:Number(p.id),price:Number(p.price_cents)/100}));save();renderFilters();renderProducts();renderCart()}catch{}}
function renderFilters(){let cs=['Todos',...new Set(products.map(p=>p.category))];filters.innerHTML=cs.map(c=>`<button class="filter ${c===filter?'on':''}" onclick="setFilter(this.dataset.c)" data-c="${c}">${c}</button>`).join('')}function setFilter(c){filter=c;renderFilters();renderProducts()}
function renderProducts(){let ps=filter==='Todos'?products:products.filter(p=>p.category===filter);grid.innerHTML=ps.length?ps.map(p=>`<article class="product" data-product-id="${p.id}">
<div class="media">
<img src="${p.image}" alt="${p.name}" loading="lazy">${p.tag?`<span class="tag">${p.tag}</span>`:''}<button class="add" onclick="event.stopPropagation();add(${p.id})" aria-label="Adicionar ao carrinho">+</button>
</div>
<div class="info">
<div class="cat">${p.category}</div>
<div class="name">${p.name}</div>
<span class="price">${money(p.price)}</span>
</div>
</article>`).join(''):'<div class="empty">Nenhum produto nesta categoria.</div>';document.querySelectorAll('.product').forEach(card=>{card.onclick=()=>openProduct(Number(card.dataset.productId))})}
function openProduct(id){const p=products.find(x=>x.id===id);if(!p)return;productBox.innerHTML=`<button class="x product-close" onclick="closeModal('productModal')">×</button><div class="product-modal-content"><img src="${p.image}" alt="${p.name}"><div class="product-modal-copy"><div class="cat">${p.category}</div><h3>${p.name}</h3><strong class="price">${money(p.price)}</strong><p>${p.description||'Uma peça feita para acompanhar sua rotina por muitos anos.'}</p><small>${p.stock} unidades disponíveis</small><button class="btn" onclick="add(${p.id});closeModal('productModal')">Adicionar à sacola →</button></div></div>`;productModal.classList.add('on')}
function add(id){id=Number(id);let p=products.find(x=>Number(x.id)===id),i=cart.find(x=>Number(x.id)===id);if(!p||p.stock<1)return notify('Produto sem estoque');if(i&&i.qty>=p.stock)return notify('Estoque máximo atingido');i?i.qty++:cart.push({id,qty:1});save();renderCart();notify(p.name+' adicionado à sacola')}
function qty(id,n){id=Number(id);let i=cart.find(x=>Number(x.id)===id),p=products.find(x=>Number(x.id)===id);if(!i||!p)return;i.qty=Math.max(0,Math.min(p.stock,i.qty+n));if(!i.qty)cart=cart.filter(x=>Number(x.id)!==id);save();renderCart()}const total=()=>cart.reduce((s,i)=>s+(products.find(p=>Number(p.id)===Number(i.id))?.price||0)*i.qty,0);
function renderCart(){let valid=cart.map(i=>({...i,p:products.find(p=>Number(p.id)===Number(i.id))})).filter(i=>i.p);count.textContent=valid.reduce((s,i)=>s+i.qty,0);items.innerHTML=valid.length?valid.map(i=>`<div class="item">
<img src="${i.p.image}" alt="">
<div>
<h4>${i.p.name}</h4>
<b>${money(i.p.price)}</b>
<div class="qty">
<button onclick="qty(${i.id},-1)">−</button>
<span>${i.qty}</span>
<button onclick="qty(${i.id},1)">+</button>
</div>
</div>
<button class="remove" onclick="qty(${i.id},-${i.qty})">Excluir</button>
</div>`).join(''):'<div class="empty">Sua sacola está vazia.</div>';subtotal.textContent=money(total())}
function cartOpen(on){drawer.classList.toggle('on',on);shade.classList.toggle('on',on)}function closeModal(id){document.getElementById(id).classList.remove('on')}function openAdmin(){renderAdmin();adminModal.classList.add('on')}function renderAdmin(){adminList.innerHTML='<h4>Produtos cadastrados</h4>'+products.map(p=>`<div class="admin-row">
<div>
<b>${p.name}</b>
<br>
<small>${p.category} · ${money(p.price)} · ${p.stock} em estoque</small>
</div>
<button class="remove" onclick="del(${p.id})">Excluir</button>
</div>`).join('')}function del(id){products=products.filter(p=>p.id!==id);cart=cart.filter(i=>i.id!==id);save();renderAdmin();renderFilters();renderProducts();renderCart()}
function checkout(){if(!cart.length)return notify('Adicione um produto antes de continuar');cartOpen(false);let sub=total(),frete=sub>=299?0:24.9;summary.innerHTML=`<div>
<span>Produtos</span>
<b>${money(sub)}</b>
</div>
<div>
<span>Frete</span>
<b>${frete?money(frete):'Grátis'}</b>
</div>
<div class="total">
<span>Total</span>
<span>${money(sub+frete)}</span>
</div>`;checkoutModal.classList.add('on')}function notify(t){toast.textContent=t;toast.classList.add('on');clearTimeout(window.tt);window.tt=setTimeout(()=>toast.classList.remove('on'),2200)}
productForm.addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target);products.unshift({id:Date.now(),name:f.get('name'),category:f.get('category'),price:+f.get('price'),stock:+f.get('stock'),image:f.get('image'),tag:f.get('tag')});save();e.target.reset();renderAdmin();renderFilters();renderProducts();notify('Produto cadastrado')});pay.addEventListener('change',()=>card.style.display=pay.value==='Cartão de crédito'?'flex':'none');checkoutForm.addEventListener('submit',e=>{e.preventDefault();cart.forEach(i=>{let p=products.find(p=>p.id===i.id);if(p)p.stock-=i.qty});cart=[];save();renderCart();renderProducts();checkoutBox.innerHTML=`<div class="success">
<div class="check">✓</div>
<h3>Pedido confirmado!</h3>
<p>Pedido <b>#${String(Date.now()).slice(-6)}</b> recebido.<br>Esta é uma compra demonstrativa; nenhum valor foi cobrado.</p>
<button class="btn" onclick="location.reload()">Voltar para a loja</button>
</div>`});renderFilters();renderProducts();renderCart();syncCatalog();

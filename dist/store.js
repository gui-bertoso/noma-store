const NomaStore = (() => {
  const defaults = [
    {id:1,name:'Nami Lamp',category:'Lighting',price:289.9,stock:8,tag:'New',description:'Soft, welcoming light with a linen shade and certified-wood base.',image:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85'},
    {id:2,name:'Serena Armchair',category:'Furniture',price:1249,stock:4,tag:'Bestseller',description:'Generous comfort, light lines and durable fabric for slowing down.',image:'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1000&q=85'},
    {id:3,name:'Terra Vase',category:'Decor',price:139.9,stock:12,tag:'',description:'Matte ceramic, shaped in small batches by local artisans.',image:'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1000&q=85'},
    {id:4,name:'Duna Table',category:'Furniture',price:479.9,stock:6,tag:'Limited edition',description:'Compact solid-wood side table with gently rounded edges.',image:'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1000&q=85'},
    {id:5,name:'Brisa Throw',category:'Textiles',price:219.9,stock:10,tag:'',description:'Soft recycled cotton adds texture and warmth to your space.',image:'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85'},
    {id:6,name:'Orbe Tray',category:'Decor',price:159.9,stock:9,tag:'New',description:'A versatile ceramic piece for keeping small objects beautifully organized.',image:'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85'},
    {id:7,name:'Linha Chair',category:'Furniture',price:699.9,stock:5,tag:'',description:'Lightweight frame, comfortable seating and timeless design for any table.',image:'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=1000&q=85'},
    {id:8,name:'Horizonte Cushion',category:'Textiles',price:119.9,stock:14,tag:'',description:'Removable cotton cover with soft filling and a natural feel.',image:'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=85'}
  ];
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
  const products=()=>read('noma-products',defaults);
  const setProducts=value=>localStorage.setItem('noma-products',JSON.stringify(value));
  const cart=()=>read('noma-cart',[]);
  const setCart=value=>{localStorage.setItem('noma-cart',JSON.stringify(value));updateBadge()};
  const money=value=>Number(value).toLocaleString('en-US',{style:'currency',currency:'BRL'});
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const imageUrl=value=>/^https:\/\//i.test(String(value||''))?String(value):'';
  function add(id,qty=1){const p=products().find(x=>x.id===Number(id));const items=cart();const item=items.find(x=>x.id===Number(id));if(!p||p.stock<1)return false;if(item)item.qty=Math.min(p.stock,item.qty+qty);else items.push({id:p.id,qty:Math.min(qty,p.stock)});setCart(items);return true}
  function change(id,delta){let items=cart(),item=items.find(x=>x.id===Number(id)),p=products().find(x=>x.id===Number(id));if(!item||!p)return;item.qty=Math.max(0,Math.min(p.stock,item.qty+delta));setCart(items.filter(x=>x.qty>0))}
  const enriched=()=>cart().map(i=>({...i,id:Number(i.id),product:products().find(p=>Number(p.id)===Number(i.id))})).filter(i=>i.product);
  const subtotal=()=>enriched().reduce((sum,i)=>sum+i.product.price*i.qty,0);
  async function loadCatalog(){try{const response=await fetch('/api/products');if(!response.ok)return;const remote=await response.json();if(!Array.isArray(remote)||!remote.length)return;const normalized=remote.map(p=>({...p,id:Number(p.id),price:Number(p.price_cents)/100}));if(JSON.stringify(normalized)!==JSON.stringify(products())){setProducts(normalized);if(!sessionStorage.getItem('noma-sync')){sessionStorage.setItem('noma-sync','1');location.reload()}else sessionStorage.removeItem('noma-sync')}}catch{}}
  function updateBadge(){document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=cart().reduce((s,i)=>s+i.qty,0))}
  function header(){return `<div class="announce">Free shipping on orders over <b>R$ 299</b></div><header><a class="brand" href="index.html">no<span>ma.</span></a><nav><a href="index.html">Home</a><a href="shop.html">Shop</a><a href="about.html">About</a></nav><div class="header-actions"><a class="cart-link" href="cart.html">Bag <b data-cart-count>0</b></a></div></header>`}
  function footer(){return `<footer><div><a class="brand light" href="index.html">no<span>ma.</span></a><p>Essential design for a more intentional life.</p></div><div><b>Shop</b><a href="shop.html">All products</a><a href="cart.html">My bag</a></div><div><b>About us</b><a href="about.html">Our story</a><a href="about.html#trocas">Returns and shipping</a></div><small>© 2026 Noma Casa.</small></footer>`}
  function shell(){document.querySelector('[data-header]')?.replaceChildren(document.createRange().createContextualFragment(header()));document.querySelector('[data-footer]')?.replaceChildren(document.createRange().createContextualFragment(footer()));updateBadge()}
  return {products,setProducts,cart,setCart,money,escapeHtml,imageUrl,add,change,enriched,subtotal,updateBadge,shell,loadCatalog};
})();
document.addEventListener('DOMContentLoaded',()=>{NomaStore.shell();NomaStore.loadCatalog()});

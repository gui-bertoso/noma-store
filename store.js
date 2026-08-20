const NomaStore = (() => {
  const defaults = [
    {id:1,name:'Luminária Nami',category:'Iluminação',price:289.9,stock:8,tag:'Novo',description:'Luz suave e acolhedora com cúpula de linho e base em madeira certificada.',image:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85'},
    {id:2,name:'Poltrona Serena',category:'Mobiliário',price:1249,stock:4,tag:'Mais vendido',description:'Conforto generoso, linhas leves e tecido de alta durabilidade para desacelerar.',image:'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1000&q=85'},
    {id:3,name:'Vaso Terra',category:'Decoração',price:139.9,stock:12,tag:'',description:'Cerâmica de acabamento fosco, moldada em pequenos lotes por artesãos locais.',image:'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1000&q=85'},
    {id:4,name:'Mesa Duna',category:'Mobiliário',price:479.9,stock:6,tag:'Edição limitada',description:'Mesa lateral compacta em madeira maciça com bordas suavemente arredondadas.',image:'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1000&q=85'},
    {id:5,name:'Manta Brisa',category:'Têxteis',price:219.9,stock:10,tag:'',description:'Trama macia de algodão reciclado para trazer textura e aconchego ao ambiente.',image:'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85'},
    {id:6,name:'Bandeja Orbe',category:'Decoração',price:159.9,stock:9,tag:'Novo',description:'Uma peça versátil de cerâmica para organizar pequenos objetos com beleza.',image:'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85'},
    {id:7,name:'Cadeira Linha',category:'Mobiliário',price:699.9,stock:5,tag:'',description:'Estrutura leve, assento confortável e desenho atemporal para qualquer mesa.',image:'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=1000&q=85'},
    {id:8,name:'Almofada Horizonte',category:'Têxteis',price:119.9,stock:14,tag:'',description:'Capa removível de algodão com enchimento macio e toque natural.',image:'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=85'}
  ];
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
  const products=()=>read('noma-products',defaults);
  const setProducts=value=>localStorage.setItem('noma-products',JSON.stringify(value));
  const cart=()=>read('noma-cart',[]);
  const setCart=value=>{localStorage.setItem('noma-cart',JSON.stringify(value));updateBadge()};
  const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function add(id,qty=1){const p=products().find(x=>x.id===Number(id));const items=cart();const item=items.find(x=>x.id===Number(id));if(!p||p.stock<1)return false;if(item)item.qty=Math.min(p.stock,item.qty+qty);else items.push({id:p.id,qty:Math.min(qty,p.stock)});setCart(items);return true}
  function change(id,delta){let items=cart(),item=items.find(x=>x.id===Number(id)),p=products().find(x=>x.id===Number(id));if(!item||!p)return;item.qty=Math.max(0,Math.min(p.stock,item.qty+delta));setCart(items.filter(x=>x.qty>0))}
  const enriched=()=>cart().map(i=>({...i,id:Number(i.id),product:products().find(p=>Number(p.id)===Number(i.id))})).filter(i=>i.product);
  const subtotal=()=>enriched().reduce((sum,i)=>sum+i.product.price*i.qty,0);
  async function loadCatalog(){try{const response=await fetch('/api/products');if(!response.ok)return;const remote=await response.json();if(!Array.isArray(remote)||!remote.length)return;const normalized=remote.map(p=>({...p,id:Number(p.id),price:Number(p.price_cents)/100}));if(JSON.stringify(normalized)!==JSON.stringify(products())){setProducts(normalized);if(!sessionStorage.getItem('noma-sync')){sessionStorage.setItem('noma-sync','1');location.reload()}else sessionStorage.removeItem('noma-sync')}}catch{}}
  function updateBadge(){document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=cart().reduce((s,i)=>s+i.qty,0))}
  function header(){return `<div class="announce">Frete grátis acima de <b>R$ 299</b></div><header><a class="brand" href="index.html">no<span>ma.</span></a><nav><a href="index.html">Início</a><a href="loja.html">Loja</a><a href="sobre.html">Sobre</a></nav><div class="header-actions"><a class="cart-link" href="carrinho.html">Sacola <b data-cart-count>0</b></a></div></header>`}
  function footer(){return `<footer><div><a class="brand light" href="index.html">no<span>ma.</span></a><p>Design essencial para uma vida com mais intenção.</p></div><div><b>Comprar</b><a href="loja.html">Todos os produtos</a><a href="carrinho.html">Minha sacola</a></div><div><b>Institucional</b><a href="sobre.html">Nossa história</a><a href="sobre.html#trocas">Trocas e envios</a></div><small>© 2026 Noma Casa.</small></footer>`}
  function shell(){document.querySelector('[data-header]')?.replaceChildren(document.createRange().createContextualFragment(header()));document.querySelector('[data-footer]')?.replaceChildren(document.createRange().createContextualFragment(footer()));updateBadge()}
  return {products,setProducts,cart,setCart,money,add,change,enriched,subtotal,updateBadge,shell,loadCatalog};
})();
document.addEventListener('DOMContentLoaded',()=>{NomaStore.shell();NomaStore.loadCatalog()});

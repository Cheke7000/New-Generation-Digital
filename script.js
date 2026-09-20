// ===== Ajustes: edita aquí =====
var SHEETS_URL=""; // pega aquí la URL de tu Google Apps Script (si la dejas vacía, el pedido se envía por WhatsApp)
var WA="50379741077"; // WhatsApp de la tienda: código de país + número
var COLORS=[{n:"Azul",c:"#3d5a80"},{n:"Negro",c:"#2a2b2e"},{n:"Blanco",c:"#e9e9ec"},{n:"Titanio natural",c:"#b9b2a6"},{n:"Rosa",c:"#e8b4c0"}];
var STORAGE=[{v:128,gb:"128 GB",extra:0},{v:256,gb:"256 GB",extra:100},{v:512,gb:"512 GB",extra:250},{v:1024,gb:"1 TB",extra:400}]; // extra = USD sobre 128 GB
var DEPTS=["Ahuachapán","Santa Ana","Sonsonate","Chalatenango","La Libertad","San Salvador","Cuscatlán","La Paz","Cabañas","San Vicente","Usulután","San Miguel","Morazán","La Unión"];
var SS_POINTS=["Metrocentro","Centro de San Salvador","Galerías Escalón","Plaza Mundo Soyapango"];
var HOURS=[9,10,11,12,13,14,15,16,17].map(function(h){return (h>12?h-12:h)+":00 "+(h>=12?"p. m.":"a. m.")});
var SS_DAYS=[6,0];      // días de entrega en San Salvador (6 = sábado, 0 = domingo)
var COURIER_DAYS=[6,0]; // días que trabaja la mensajería (quita el 0 si no trabaja domingos)
var COURIER_HOURS="9:00 a. m. a 3:00 p. m. (ejemplo)"; // horario de la mensajería
var DEPT_POINTS={ // puntos de entrega de la mensajería por departamento (cambia los de ejemplo)
"Ahuachapán":["Ahuachapán centro (ejemplo)"],"Santa Ana":["Santa Ana centro (ejemplo)"],"Sonsonate":["Sonsonate centro (ejemplo)"],
"Chalatenango":["Chalatenango centro (ejemplo)"],"La Libertad":["Santa Tecla (ejemplo)"],"Cuscatlán":["Cojutepeque (ejemplo)"],
"La Paz":["Zacatecoluca (ejemplo)"],"Cabañas":["Sensuntepeque (ejemplo)"],"San Vicente":["San Vicente centro (ejemplo)"],
"Usulután":["Usulután centro (ejemplo)"],"San Miguel":["San Miguel centro (ejemplo)"],"Morazán":["San Francisco Gotera (ejemplo)"],"La Unión":["La Unión centro (ejemplo)"]};
var BLOCKED=[];  // fechas sin entrega, ej. ["2026-12-25"]
var LEAD_DAYS=2; // días mínimos de anticipación para pedir
var MAX_DAYS=90; // hasta cuántos días adelante se puede elegir
// ===============================
var $=function(s){return document.querySelector(s)};
var fmt=function(n){return "$"+n.toLocaleString("en-US")};
var DN=["domingos","lunes","martes","miércoles","jueves","viernes","sábados"];
var cart=[],cur=null,home=false,map=null,pin=null,pos="";
try{cart=JSON.parse(localStorage.getItem("ngd_cart")||"[]")}catch(e){}
function save(){try{localStorage.setItem("ngd_cart",JSON.stringify(cart))}catch(e){}}
function fill(sel,list){list.forEach(function(t){var o=document.createElement("option");o.textContent=t;$(sel).appendChild(o)})}
fill("#dept",DEPTS);fill("#point",SS_POINTS);fill("#hour",HOURS);

document.querySelectorAll("[data-wa]").forEach(function(a){a.href="https://wa.me/"+WA+"?text="+encodeURIComponent(a.dataset.wa);a.target="_blank";a.rel="noopener"});

function swatches(box,onPick){
  COLORS.forEach(function(k,i){
    var b=document.createElement("button");b.className="sw";b.style.background=k.c;b.title=k.n;
    b.setAttribute("aria-label",k.n);b.setAttribute("aria-pressed",i===0);
    b.onclick=function(){box.querySelectorAll(".sw").forEach(function(x){x.setAttribute("aria-pressed",x===b)});onPick(i)};
    box.appendChild(b);
  });
}
$("#heroColor").textContent=COLORS[0].n;
swatches($("#heroSw"),function(i){$("#heroPhone").style.setProperty("--phone",COLORS[i].c);$("#heroColor").textContent=COLORS[i].n});

document.querySelectorAll(".card").forEach(function(el){
  el.innerHTML='<div class="mini"><div class="phone sm"><i></i></div></div><h3></h3><div class="price"></div><button class="btn">Elegir</button>';
  el.querySelector("h3").textContent=el.dataset.name;
  el.querySelector(".price").textContent="Desde "+fmt(+el.dataset.price);
  el.querySelector(".btn").onclick=function(){openProduct(el)};
});

function go(n){[1,2,3].forEach(function(i){$("#s"+i).hidden=i!==n})}
function openProduct(el){
  var only=el.dataset.gb?el.dataset.gb.split(","):null;
  var list=STORAGE.filter(function(s){return !only||only.indexOf(String(s.v))>-1});
  var base=+el.dataset.price,first=list[0].extra;
  cur={name:el.dataset.name,c:0,g:0,date:null,opts:list.map(function(s){return {gb:s.gb,price:base+s.extra-first}})};
  $("#pdName").textContent=cur.name;
  $("#pdColors").innerHTML="";swatches($("#pdColors"),function(i){cur.c=i;paint()});
  var box=$("#pdGb");box.innerHTML="";
  cur.opts.forEach(function(o,i){
    var b=document.createElement("button");b.className="chip";b.textContent=o.gb;b.setAttribute("aria-pressed",i===0);
    b.onclick=function(){cur.g=i;paint();box.querySelectorAll(".chip").forEach(function(x){x.setAttribute("aria-pressed",x===b)})};
    box.appendChild(b);
  });
  $("#dept").value="San Salvador";$("#addr").value="";$("#err").textContent="";$("#err3").textContent="";
  pos="";if(pin&&map){map.removeLayer(pin);pin=null}$("#mapOut").textContent="O toca el mapa para marcar tu ubicación";
  mode(false);syncDept();go(1);paint();$("#pd").showModal();
}
function paint(){
  $("#pdPhone").style.setProperty("--phone",COLORS[cur.c].c);
  $("#pdColorName").textContent=COLORS[cur.c].n;
  $("#pdPrice").textContent=fmt(cur.opts[cur.g].price);
}
function isSS(){return $("#dept").value==="San Salvador"}
function syncDept(){
  var ss=isSS();$("#ssBox").hidden=!ss;$("#otherBox").hidden=ss;
  var s=$("#cpoint");s.innerHTML="";
  if(!ss)(DEPT_POINTS[$("#dept").value]||[]).forEach(function(t){var o=document.createElement("option");o.textContent=t;s.appendChild(o)});
}
function mode(h){
  home=h;$("#mPoint").setAttribute("aria-pressed",!h);$("#mHome").setAttribute("aria-pressed",h);
  $("#pointBox").hidden=h;$("#homeBox").hidden=!h;if(h)initMap();
}
function initMap(){
  if(typeof L==="undefined"){$("#map").hidden=true;return}
  if(!map){
    map=L.map("map").setView([13.6929,-89.2182],12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
    map.on("click",function(e){setPos(e.latlng.lat,e.latlng.lng)});
  }
  setTimeout(function(){map.invalidateSize()},200);
}
function setPos(lat,lng){
  pos=lat.toFixed(5)+","+lng.toFixed(5);
  if(map){if(pin)pin.setLatLng([lat,lng]);else pin=L.circleMarker([lat,lng],{radius:9,color:"#5b3df5",fillOpacity:.8}).addTo(map)}
  $("#mapOut").textContent="Ubicación marcada ✓";
}
$("#geo").onclick=function(){
  if(!navigator.geolocation){$("#mapOut").textContent="Tu navegador no permite obtener la ubicación.";return}
  navigator.geolocation.getCurrentPosition(function(p){
    setPos(p.coords.latitude,p.coords.longitude);if(map)map.setView([p.coords.latitude,p.coords.longitude],16);
  },function(){$("#mapOut").textContent="No pudimos obtener tu ubicación. Toca el mapa para marcarla."});
};
$("#dept").onchange=syncDept;
$("#mPoint").onclick=function(){mode(false)};
$("#mHome").onclick=function(){mode(true)};

// Calendario: solo se pueden elegir los días permitidos
function pad(n){return n<10?"0"+n:""+n}
function iso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function allowed(){return isSS()?SS_DAYS:COURIER_DAYS}
function calendar(){
  var g=$("#calGrid");g.innerHTML="";
  ["L","M","M","J","V","S","D"].forEach(function(t){var s=document.createElement("span");s.textContent=t;g.appendChild(s)});
  var first=new Date(cur.y,cur.m,1),n=new Date(cur.y,cur.m+1,0).getDate();
  $("#monthName").textContent=first.toLocaleDateString("es",{month:"long",year:"numeric"});
  for(var i=0;i<(first.getDay()+6)%7;i++)g.appendChild(document.createElement("div"));
  var min=new Date();min.setHours(0,0,0,0);min.setDate(min.getDate()+LEAD_DAYS);
  var max=new Date();max.setDate(max.getDate()+MAX_DAYS);
  for(var d=1;d<=n;d++){
    var dt=new Date(cur.y,cur.m,d),b=document.createElement("button");
    b.className="day";b.textContent=d;
    var ok=allowed().indexOf(dt.getDay())>-1&&dt>=min&&dt<=max&&BLOCKED.indexOf(iso(dt))<0;
    b.disabled=!ok;if(ok)b.classList.add("ok");
    b.setAttribute("aria-pressed",cur.date===iso(dt));
    (function(dt){b.onclick=function(){cur.date=iso(dt);$("#err3").textContent="";calendar()}})(dt);
    g.appendChild(b);
  }
}
function shift(k){
  var d=new Date(cur.y,cur.m+k,1),t=new Date();
  if(d<new Date(t.getFullYear(),t.getMonth(),1))return;
  cur.y=d.getFullYear();cur.m=d.getMonth();calendar();
}
$("#prevM").onclick=function(){shift(-1)};
$("#nextM").onclick=function(){shift(1)};
function dlabel(s){var p=s.split("-");return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString("es",{weekday:"short",day:"numeric",month:"short"})}

$("#toS2").onclick=function(){go(2)};
$("#back2").onclick=function(){go(1)};
$("#back3").onclick=function(){go(2)};
$("#toS3").onclick=function(){
  var ss=isSS();
  if(ss&&home&&!$("#addr").value.trim()&&!pos){$("#err").textContent="Escribe tu dirección o marca tu ubicación en el mapa.";return}
  if(!ss&&!$("#cpoint").value){$("#err").textContent="Elige un punto de entrega.";return}
  $("#err").textContent="";cur.date=null;
  $("#hourBox").hidden=!ss;$("#courierNote").hidden=ss;
  $("#courierNote").textContent="La hora de entrega depende del horario de la mensajería: "+COURIER_HOURS+".";
  $("#dayNote").textContent=allowed().length?"Entregas los "+allowed().map(function(x){return DN[x]}).join(" y ")+".":"Por ahora no hay entregas a este departamento.";
  var t=new Date();t.setDate(t.getDate()+LEAD_DAYS);cur.y=t.getFullYear();cur.m=t.getMonth();
  calendar();go(3);
};
$("#add").onclick=function(){
  if(!cur.date){$("#err3").textContent="Elige un día en el calendario.";return}
  var ss=isSS(),o=cur.opts[cur.g],where=ss?(home?"A domicilio: "+($("#addr").value.trim()||"ubicación en el mapa"):$("#point").value):$("#cpoint").value;
  cart.push({name:cur.name,color:COLORS[cur.c].n,gb:o.gb,price:o.price,dept:$("#dept").value,place:ss?(home?"San Salvador - A domicilio":$("#point").value):$("#dept").value+" - "+$("#cpoint").value,where:where,map:ss&&home?pos:"",date:cur.date,hour:ss?$("#hour").value:""});
  save();renderCart();$("#pd").close();$("#cart").showModal();
};

function when(it){return dlabel(it.date)+" · "+(it.hour||"horario de la mensajería")}
function renderCart(){
  var ul=$("#cartList"),t=0;ul.innerHTML="";
  cart.forEach(function(it,i){
    var li=$("#itemTpl").content.cloneNode(true);
    li.querySelector(".in").textContent=it.name;
    li.querySelector(".ic").textContent=it.color+" · "+it.gb;
    li.querySelector(".id").textContent=it.dept+" · "+it.where+" · "+when(it);
    li.querySelector(".ip").textContent=fmt(it.price);
    li.querySelector(".rm").onclick=function(){cart.splice(i,1);save();renderCart()};
    ul.appendChild(li);t+=it.price;
  });
  $("#count").textContent=cart.length;$("#total").textContent=fmt(t);
  $("#empty").hidden=cart.length>0;$("#checkout").disabled=!cart.length;
}
$("#checkout").onclick=function(){
  var nm=$("#cName").value.trim(),ph=$("#cPhone").value.trim();
  if(!nm){$("#cErr").textContent="Escribe tu nombre.";return}
  if(ph.replace(/\D/g,"").length<8){$("#cErr").textContent="Escribe un teléfono válido.";return}
  $("#cErr").textContent="";
  if(SHEETS_URL){
    var b=$("#checkout");b.disabled=true;b.textContent="Enviando...";
    fetch(SHEETS_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify({name:nm,phone:ph,items:cart.map(function(it){return {name:it.name,color:it.color,gb:it.gb,price:it.price,dept:it.dept,place:it.place||it.dept,where:it.where,date:it.date,hour:it.hour||"Según mensajería",map:it.map||""}})})})
    .then(function(){$("#cart").close();$("#done").showModal()})
    .catch(function(){$("#cErr").textContent="No se pudo enviar el pedido. Intenta de nuevo."})
    .then(function(){b.disabled=!cart.length;b.textContent="Finalizar pedido"});
    return;
  }
  var m="Hola, quiero hacer este pedido en New Generation Digital:\nNombre: "+nm+"\nTeléfono: "+ph+"\n\n",t=0;
  cart.forEach(function(it,i){t+=it.price;
    m+=(i+1)+". "+it.name+", "+it.color+", "+it.gb+" - "+fmt(it.price)+"\n   Entrega: "+it.dept+", "+it.where+", "+when(it)+"\n";
    if(it.map)m+="   Mapa: https://www.google.com/maps?q="+it.map+"\n";
  });
  window.open("https://wa.me/"+WA+"?text="+encodeURIComponent(m+"Total: "+fmt(t)),"_blank","noopener");
  $("#cart").close();$("#done").showModal();
};
$("#doneOk").onclick=function(){cart=[];save();renderCart();$("#done").close()};
$("#openCart").onclick=function(){$("#cart").showModal()};
$("#pdClose").onclick=function(){$("#pd").close()};
$("#cartClose").onclick=function(){$("#cart").close()};
["pd","cart","done"].forEach(function(id){var d=$("#"+id);d.addEventListener("click",function(e){if(e.target===d)d.close()})});
renderCart();

// Modo día / noche
var root=document.documentElement;
function isDark(){var t=root.dataset.theme;return t?t==="dark":matchMedia("(prefers-color-scheme:dark)").matches}
function setTheme(t){root.dataset.theme=t;$("#theme").textContent=t==="dark"?"☀️":"🌙";try{localStorage.setItem("ngd_theme",t)}catch(e){}}
var savedTheme=null;try{savedTheme=localStorage.getItem("ngd_theme")}catch(e){}
setTheme(savedTheme||(isDark()?"dark":"light"));
$("#theme").onclick=function(){setTheme(isDark()?"light":"dark")};

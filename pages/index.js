import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJ_94Dts7VssZUQVt0ya385OtNtpmyKVXOLbVM5PiMHsvvsBs57-LxXc18BOdWew1Ddw/exec";

const CABANAS = ["Jacaranda", "Acacia", "Laurel"];
const TARIFA_BASE = 2500;
const METODOS_PAGO = ["BBVA Plebiya", "Efectivo"];
const METODOS_PAGO_GASTOS = ["Efectivo", "BBVA Plebiya", "Doc Juan paga"];
const TIPOS_TARIFA = [{ id: "base", label: "1 noche — $2,500" }, { id: "promo2", label: "2da noche al 50%" }, { id: "tarifa2", label: "2 noches (precio fijo)" }, { id: "manual", label: "Precio manual" }];
const PORCENTAJE_PAGO = [{ id: "100", label: "Pago total (100%)" }, { id: "50", label: "Anticipo (50%)" }];
const CATEGORIAS_GASTO = ["Limpieza","Gas","Internet","Entregas cabaña","Insumos","Cortesías","Campañas Facebook","Jardinería","Mantenimiento","Otro"];
const FESTIVOS_FIJOS = [[0,1],[1,5],[2,21],[4,1],[8,16],[10,20],[11,25]];
function esFestivo(f) { if (!f) return false; const d = new Date(f+"T12:00:00"); return FESTIVOS_FIJOS.some(([m,dd])=>m===d.getMonth()&&dd===d.getDate()); }
function nochesEnFestivo(ll,sa) { if(!ll||!sa)return 0; let c=0; const d=new Date(ll+"T12:00:00"),e=new Date(sa+"T12:00:00"); while(d<e){if(esFestivo(d.toISOString().split("T")[0]))c++;d.setDate(d.getDate()+1);}return c; }

const C={dark:"#4A3728",mid:"#6B4F3A",accent:"#8B6F4E",light:"#D4C4B0",bg:"#F7F3EE",border:"#E2D9CE",text:"#3A2D22",muted:"#9A8B7A",danger:"#C44B2B",success:"#5A7A3A",blue:"#3B6B8A",orange:"#C47A2B",purple:"#7A4A6B"};
const cabC={Jacaranda:C.purple,Acacia:C.orange,Laurel:C.dark};

function calcTotal(t,n,pm,tf){switch(t){case"base":return TARIFA_BASE*n;case"promo2":return n>=2?TARIFA_BASE+TARIFA_BASE*0.5+TARIFA_BASE*(n-2):TARIFA_BASE*n;case"tarifa2":return tf||0;case"manual":return pm||0;default:return 0;}}
function calcN(a,b){if(!a||!b)return 0;const d=Math.ceil((new Date(b)-new Date(a))/864e5);return d>0?d:0;}
function fmt$(n){return"$"+Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:2});}
function fmtF(f){if(!f)return"";return new Date(f+"T12:00:00").toLocaleDateString("es-MX",{weekday:"short",month:"short",day:"numeric"});}
function genFolio(){const n=new Date();return"CB-"+String(n.getFullYear()).slice(2)+String(n.getMonth()+1).padStart(2,"0")+String(n.getDate()).padStart(2,"0")+"-"+String(n.getHours()).padStart(2,"0")+String(n.getMinutes()).padStart(2,"0")+String(n.getSeconds()).padStart(2,"0");}
function autoSalida(ll,n){if(!ll||!n)return"";const d=new Date(ll+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().split("T")[0];}
function checkDisp(res,cab,ll,sa,ex){if(!ll||!sa)return{ok:true,who:null};const c=res.find((r,i)=>ex>=0&&i===ex?false:r.cabana===cab&&ll<r.salida&&sa>r.llegada&&r.estado!=="cancelada");return{ok:!c,who:c};}

// Google Sheets sync
async function gsRead(sheet){try{const r=await fetch(`${APPS_SCRIPT_URL}?action=read&sheet=${sheet}`);return(await r.json()).data||[];}catch(e){return null;}}
async function gsReplace(sheet,data){try{await fetch(`${APPS_SCRIPT_URL}?action=replace&sheet=${sheet}`,{method:"POST",body:JSON.stringify(data)});}catch(e){}}

// PDF
function genPDF(d){const W=595,H=842,ml=50,cw=W-100;const e=s=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");const t=(x,y,s,sz=10,c="#3A2D22",a="start",w="normal")=>`<text x="${x}" y="${y}" font-family="Helvetica,sans-serif" font-size="${sz}" fill="${c}" text-anchor="${a}" font-weight="${w}">${e(s)}</text>`;const r=(x,y,w,h,f,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" rx="${rx}"/>`;let el=[],y=50;el.push(r(0,0,W,110,"#4A3728"));el.push(r(0,106,W,6,"#8B6F4E"));el.push(t(W/2,40,"CLARO del BOSQUE",22,"#F0EBE3","middle","bold"));el.push(t(W/2,58,"Cabañas, Mazamitla",11,"#D4C4B0","middle"));el.push(t(W/2,80,"Recibo de Reservación",13,"#D4C4B0","middle"));el.push(t(W/2,96,`Folio: ${d.folio}`,9,"#D4C4B0","middle"));y=130;el.push(t(ml,y,`Fecha: ${d.fechaRegistro}`,9,"#9A8B7A"));y+=25;el.push(r(ml,y,cw,24,"#F0EBE3",4));el.push(t(ml+10,y+16,"HUÉSPED",10,"#4A3728","start","bold"));y+=34;el.push(t(ml,y,d.huesped,12,"#3A2D22","start","bold"));el.push(t(ml+300,y,d.telefono,11,"#3A2D22"));y+=20;el.push(t(ml,y,`${d.cabana} · ${d.huespedes} huéspedes`,10,"#6B4F3A"));y+=28;el.push(r(ml,y,cw,24,"#F0EBE3",4));el.push(t(ml+10,y+16,"ESTANCIA",10,"#4A3728","start","bold"));y+=34;el.push(t(ml,y,`${fmtF(d.llegada)} → ${fmtF(d.salida)} · ${d.noches} noches`,11,"#3A2D22","start","bold"));y+=18;el.push(t(ml,y,`Tarifa: ${d.tarifa}`,10,"#6B4F3A"));y+=28;el.push(r(ml,y,cw,24,"#F0EBE3",4));el.push(t(ml+10,y+16,"PAGO",10,"#4A3728","start","bold"));y+=38;[["Total:",fmt$(d.total)],[`Pagado (${d.porcentajePago}%):`,fmt$(d.anticipo)],["Método:",d.metodoPago],["Saldo:",fmt$(d.saldo)]].forEach(([lb,v],i)=>{el.push(t(ml+8,y,lb,10,"#6B4F3A"));el.push(t(ml+cw-8,y,v,11,i===3&&d.saldo>0?"#C44B2B":"#3A2D22","end","bold"));y+=24;});y+=12;el.push(r(ml+cw-200,y-12,200,32,"#4A3728",6));el.push(t(ml+cw-100,y+8,`TOTAL: ${fmt$(d.total)}`,15,"#fff","middle","bold"));y+=44;el.push(t(W/2,y,"Check-in: 3:00 PM | Check-out: 1:00 PM",9,"#9A8B7A","middle"));y+=14;el.push(t(W/2,y,"¡Gracias por su reservación!",10,"#4A3728","middle","bold"));el.push(r(0,H-26,W,26,"#4A3728"));el.push(t(W/2,H-9,"Claro del Bosque · Mazamitla",9,"#D4C4B0","middle"));return`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="white"/>${el.join("\n")}</svg>`;}

const iS={width:"100%",padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:16,background:"#FAFAF7",boxSizing:"border-box",WebkitAppearance:"none"};
const lS={display:"block",fontSize:12,color:C.muted,marginBottom:4,fontWeight:600};
const sS={background:"#fff",borderRadius:12,padding:16,marginBottom:12,border:`1px solid ${C.border}`};
const bP={width:"100%",padding:14,background:C.dark,color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer"};
const bDanger={...bP,background:C.danger};
const bCancel={padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:"#FFF3F0",color:C.danger};

export default function App(){
  const[vista,setVista]=useState("recepcion");
  const[reservas,setReservas]=useState([]);
  const[ingresos,setIngresos]=useState([]);
  const[gastos,setGastos]=useState([]);
  const[cortes,setCortes]=useState([]);
  const[cupones,setCupones]=useState([]);
  const[pdf,setPdf]=useState(null); // {svg, data} or null
  const[ok,setOk]=useState(false);
  const[syncing,setSyncing]=useState(false);
  const[lastSync,setLastSync]=useState(null);

  useEffect(()=>{(async()=>{
    setSyncing(true);
    const[r,i,g,c,cu]=await Promise.all([gsRead("Reservas"),gsRead("Ingresos"),gsRead("Gastos"),gsRead("CortesJuan"),gsRead("Cupones")]);
    if(r)setReservas(r.map(x=>({...x,total:Number(x.total)||0,anticipo:Number(x.anticipo)||0,saldo:Number(x.saldo)||0,noches:Number(x.noches)||0,huespedes:Number(x.huespedes)||2})));
    else try{setReservas(JSON.parse(localStorage.getItem("cdb-reservas")||"[]"));}catch(e){}
    if(i)setIngresos(i.map(x=>({...x,monto:Number(x.monto)||0})));
    else try{setIngresos(JSON.parse(localStorage.getItem("cdb-ingresos")||"[]"));}catch(e){}
    if(g)setGastos(g.map(x=>({...x,monto:Number(x.monto)||0})));
    else try{setGastos(JSON.parse(localStorage.getItem("cdb-gastos")||"[]"));}catch(e){}
    if(c)setCortes(c.map(x=>({...x,monto:Number(x.monto)||0})));
    else try{setCortes(JSON.parse(localStorage.getItem("cdb-cortes")||"[]"));}catch(e){}
    if(cu)setCupones(cu.map(x=>({...x,monto:Number(x.monto)||0,usado:x.usado==="true"||x.usado===true})));
    else try{setCupones(JSON.parse(localStorage.getItem("cdb-cupones")||"[]"));}catch(e){}
    setSyncing(false);setOk(true);setLastSync(new Date().toLocaleTimeString("es-MX"));
  })();},[]);

  const sv=useCallback(async(k,d,s)=>{
    s(d);localStorage.setItem(k,JSON.stringify(d));
    const m={"cdb-reservas":"Reservas","cdb-ingresos":"Ingresos","cdb-gastos":"Gastos","cdb-cortes":"CortesJuan","cdb-cupones":"Cupones"};
    if(m[k]){setSyncing(true);await gsReplace(m[k],d);setSyncing(false);setLastSync(new Date().toLocaleTimeString("es-MX"));}
  },[]);

  const tabs=[{id:"recepcion",l:"Recepción",i:"🏠"},{id:"reservas",l:"Reservas",i:"📋"},{id:"calendario",l:"Calendario",i:"📅"},{id:"ingresos",l:"Ingresos",i:"💰"},{id:"gastos",l:"Gastos",i:"🧾"},{id:"juan",l:"Juan",i:"🤝"},{id:"cupones",l:"Cupones",i:"🎟️"},{id:"resumen",l:"Resumen",i:"📊"}];

  if(!ok)return(<div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:C.dark}}><div style={{textAlign:"center",color:C.light}}><div style={{fontSize:18,fontWeight:700,letterSpacing:2}}>CLARO del BOSQUE</div><div style={{fontSize:11,color:C.accent,marginTop:4}}>Conectando con Google Sheets...</div></div></div>);

  return(<>
    <Head><title>Claro del Bosque</title><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="theme-color" content="#4A3728"/><link rel="manifest" href="/manifest.json"/></Head>
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"-apple-system,'Segoe UI',sans-serif",WebkitTextSizeAdjust:"100%"}}>
      <div style={{position:"sticky",top:0,zIndex:100}}>
        <header style={{background:`linear-gradient(135deg,#3A2D22,${C.dark},${C.mid})`,padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"space-between",height:42}}>
          <div><div style={{color:"#F0EBE3",fontSize:14,fontWeight:700,letterSpacing:1,fontFamily:"Georgia,serif"}}>CLARO <span style={{fontStyle:"italic",fontWeight:400,fontSize:11}}>del</span> BOSQUE</div><div style={{color:C.accent,fontSize:7,letterSpacing:3,textTransform:"uppercase"}}>Cabañas · Mazamitla</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>{syncing&&<span style={{fontSize:10,color:C.accent}}>⏳</span>}{lastSync&&!syncing&&<span style={{fontSize:8,color:"#ffffff66"}}>✓ {lastSync}</span>}</div>
        </header>
        <nav style={{background:"#fff",borderBottom:`1px solid ${C.border}`,display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setVista(t.id)} style={{flex:"0 0 auto",minWidth:48,padding:"6px 5px 4px",border:"none",cursor:"pointer",background:vista===t.id?"#F0EBE3":"transparent",borderBottom:vista===t.id?`3px solid ${C.dark}`:"3px solid transparent",color:vista===t.id?C.dark:C.muted,fontWeight:vista===t.id?700:400,fontSize:8,textAlign:"center"}}><div style={{fontSize:15,lineHeight:1}}>{t.i}</div>{t.l}</button>)}
        </nav>
      </div>
      <main style={{maxWidth:600,margin:"0 auto",padding:"12px 10px 30px"}}>
        {vista==="recepcion"&&<Recepcion {...{reservas,sv,setReservas,ingresos,setIngresos,cortes,setCortes}}/>}
        {vista==="reservas"&&<ReservasM {...{reservas,sv,setReservas,ingresos,setIngresos,cortes,setCortes,cupones,setCupones,setPdf}}/>}
        {vista==="calendario"&&<CalM reservas={reservas}/>}
        {vista==="ingresos"&&<IngrM {...{ingresos,sv,setIngresos}}/>}
        {vista==="gastos"&&<GastM {...{gastos,sv,setGastos,cortes,setCortes,reservas}}/>}
        {vista==="juan"&&<JuanM {...{cortes,sv,setCortes,reservas}}/>}
        {vista==="cupones"&&<CupM cupones={cupones}/>}
        {vista==="resumen"&&<ResumM {...{reservas,ingresos,gastos,cortes,cupones}}/>}
      </main>
      {pdf&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>{setPdf(null);setVista("recepcion");}}>
        <div style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:16,width:"100%",maxWidth:500,maxHeight:"85vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h3 style={{margin:0,color:C.dark,fontSize:16}}>Recibo generado ✅</h3>
          <button onClick={()=>{setPdf(null);setVista("recepcion");}} style={{background:"#eee",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div dangerouslySetInnerHTML={{__html:pdf.svg||pdf}} style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"auto"}}/>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
          {pdf.data&&<button onClick={()=>{const d=pdf.data;const msg=`🌲 *CLARO DEL BOSQUE*%0ACabañas, Mazamitla%0A━━━━━━━━━━━━━━%0A%0A📋 *Recibo de Reservación*%0AFolio: ${d.folio}%0A%0A👤 *Huésped:* ${d.huesped}%0A📞 ${d.telefono}%0A🏡 Cabaña: *${d.cabana}*%0A👥 ${d.huespedes} huésped(es)%0A%0A📅 *Llegada:* ${fmtF(d.llegada)} — 3:00 PM%0A📅 *Salida:* ${fmtF(d.salida)}%0A🌙 ${d.noches} noche(s)%0A%0A💰 *Total:* ${fmt$(d.total)}%0A✅ *Pagado:* ${fmt$(d.anticipo)} (${d.porcentajePago}%)%0A💳 Método: ${d.metodoPago}%0A${d.saldo>0?`⚠️ *Saldo pendiente:* ${fmt$(d.saldo)}%0A`:"✅ *Pagado completo*%0A"}%0ACheck-in: 3:00 PM | Check-out: 1:00 PM%0A¡Gracias por su reservación! 🌿`;const url=d.telefono?`https://wa.me/52${d.telefono.replace(/\D/g,"")}?text=${msg}`:`https://wa.me/?text=${msg}`;window.open(url,"_blank");setTimeout(()=>{setPdf(null);setVista("recepcion");},500);}} style={{width:"100%",padding:14,borderRadius:10,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,background:"#25D366",color:"#fff"}}>📲 Enviar por WhatsApp</button>}
          <button onClick={()=>{const b=new Blob([pdf.svg||pdf],{type:"image/svg+xml"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="recibo.svg";a.click();URL.revokeObjectURL(u);}} style={{width:"100%",padding:12,borderRadius:10,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:14,fontWeight:600,background:"#fff",color:C.dark}}>⬇ Descargar recibo</button>
          <button onClick={()=>{setPdf(null);setVista("recepcion");}} style={{width:"100%",padding:14,borderRadius:10,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,background:C.dark,color:"#fff"}}>✅ Listo</button>
        </div>
      </div></div>)}
    </div>
  </>);
}

// ===== RECEPCIÓN =====
function Recepcion({reservas,sv,setReservas,ingresos,setIngresos,cortes,setCortes}){
  const[cobrado,setCobrado]=useState(null);
  const hoy=new Date().toISOString().split("T")[0];
  const act=reservas.filter(r=>r.estado!=="cancelada");
  const todasLL=act.filter(r=>{const diff=Math.ceil((new Date(r.llegada+"T12:00:00")-new Date(hoy+"T12:00:00"))/864e5);return diff>=-30&&diff<=7;});
  const enCab=act.filter(r=>r.llegada<=hoy&&r.salida>hoy);
  const vis=[...enCab,...todasLL].filter((r,i,a)=>a.findIndex(x=>x.folio===r.folio)===i).sort((a,b)=>a.llegada.localeCompare(b.llegada));
  const pend=vis.filter(r=>r.saldo>0);

  const cobrar=(folio,metodo)=>{
    const idx=reservas.findIndex(r=>r.folio===folio);if(idx<0)return;
    const r=reservas[idx];const monto=r.saldo;const fecha=new Date().toLocaleString("es-MX");
    sv("cdb-reservas",reservas.map((res,i)=>i===idx?{...r,saldo:0,anticipo:r.total}:res),setReservas);
    sv("cdb-ingresos",[{fecha,concepto:`Recepción ${r.cabana} — ${r.huesped}`,monto,metodo,folio,tipo:"Saldo",id:Date.now()},...ingresos],setIngresos);
    if(metodo==="Efectivo")sv("cdb-cortes",[{fecha:hoy,tipo:"recibio",monto,concepto:`Cobro: ${r.cabana} — ${r.huesped}`,notas:`${fmtF(r.llegada)} al ${fmtF(r.salida)}`,id:Date.now()+1},...cortes],setCortes);
    setCobrado(folio);setTimeout(()=>setCobrado(null),3000);
  };

  return(<div>
    <h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 4px"}}>🏠 Recepción</h2>
    <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Cobra saldos y cierra reservaciones</div>
    {cobrado&&<div style={{padding:12,background:"#E8F0E0",borderRadius:10,marginBottom:12,textAlign:"center",fontSize:14,fontWeight:700,color:C.success}}>✅ Cobrado</div>}
    {pend.length===0?(<div style={{...sS,textAlign:"center",padding:24}}><div style={{fontSize:30,marginBottom:6}}>✅</div><div style={{fontSize:14,fontWeight:700,color:C.dark}}>Sin saldos pendientes</div></div>):pend.map(r=>{
      const color=cabC[r.cabana];const llegaHoy=r.llegada===hoy;const yaLlego=r.llegada<hoy;
      return(<div key={r.folio} style={{...sS,padding:0,overflow:"hidden",border:llegaHoy?`2px solid ${color}`:undefined}}>
        <div style={{background:color,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:"#fff",fontWeight:700,fontSize:14}}>{r.cabana}</div><div style={{color:"#ffffffbb",fontSize:11}}>{r.huesped}</div></div>{llegaHoy&&<span style={{background:"#fff",color,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>HOY</span>}{yaLlego&&<span style={{background:"#FFF3E0",color:C.orange,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>EN CABAÑA</span>}</div>
        <div style={{padding:"10px 12px"}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{fmtF(r.llegada)} → {fmtF(r.salida)} · {r.noches}n</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:10}}>{[["Total",r.total,C.dark],["Anticipó",r.anticipo,C.success],["Debe",r.saldo,C.danger]].map(([l,v,c])=><div key={l} style={{textAlign:"center",padding:6,background:"#F0EBE3",borderRadius:6}}><div style={{fontSize:8,color:C.muted}}>{l}</div><div style={{fontSize:l==="Debe"?16:13,fontWeight:800,color:c}}>{fmt$(v)}</div></div>)}</div>
          <div style={{display:"flex",gap:6}}><button onClick={()=>cobrar(r.folio,"BBVA Plebiya")} style={{flex:1,padding:11,borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:C.blue,color:"#fff"}}>🏦 BBVA</button><button onClick={()=>cobrar(r.folio,"Efectivo")} style={{flex:1,padding:11,borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:C.success,color:"#fff"}}>💵 Efectivo</button></div>
          <div style={{marginTop:4,fontSize:9,color:C.muted,textAlign:"center"}}>Efectivo → balance Doc Juan a tu favor</div>
        </div></div>);
    })}
    <h3 style={{fontSize:14,color:C.dark,margin:"14px 0 8px"}}>🏡 Cabañas</h3>
    {CABANAS.map(cab=>{const color=cabC[cab];const rc=vis.filter(r=>r.cabana===cab);const eu=act.find(r=>r.cabana===cab&&r.llegada<=hoy&&r.salida>hoy);
      return(<div key={cab} style={{...sS,padding:0,overflow:"hidden",marginBottom:8}}><div style={{background:color,padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"#fff",fontWeight:700,fontSize:13}}>{cab}</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:eu?"#fff":"rgba(255,255,255,.3)",color:eu?color:"#ffffffcc",fontWeight:700}}>{eu?"Ocupada":"Libre"}</span></div>
        {rc.length===0?<div style={{padding:10,fontSize:11,color:C.muted,textAlign:"center"}}>Sin reservaciones</div>:rc.map(r=><div key={r.folio} style={{padding:"8px 12px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:600}}>{r.huesped}</div><div style={{fontSize:10,color:C.muted}}>{fmtF(r.llegada)} → {fmtF(r.salida)}</div></div><span style={{fontSize:9,padding:"2px 7px",borderRadius:8,background:r.saldo>0?"#FFF3E0":"#E8F0E0",color:r.saldo>0?C.orange:C.success,fontWeight:700}}>{r.saldo>0?`$${r.saldo}`:"✓"}</span></div>)}
      </div>);})}
  </div>);
}

// ===== RESERVAS =====
function ReservasM({reservas,sv,setReservas,ingresos,setIngresos,cortes,setCortes,cupones,setCupones,setPdf}){
  const empty={huesped:"",telefono:"",cabana:"Jacaranda",huespedes:2,llegada:"",salida:"",tarifa:"base",precioManual:"",tarifaFija2:"",porcentajePago:"100",metodoPago:"BBVA Plebiya",notas:""};
  const[f,setF]=useState(empty);const[ei,setEi]=useState(-1);const[ns,setNs]=useState(1);const[nm,setNm]=useState("");const[cc,setCC]=useState(null);
  const ne=ns===0?(Number(nm)||0):ns;const noches=calcN(f.llegada,f.salida);const total=calcTotal(f.tarifa,noches,Number(f.precioManual),Number(f.tarifaFija2));
  const antic=f.porcentajePago==="100"?total:Math.round(total*0.5);const saldo=total-antic;const hoy=new Date().toISOString().split("T")[0];

  const hLL=v=>setF({...f,llegada:v,salida:autoSalida(v,ne)});
  const hNS=n=>{setNs(n);setNm("");if(f.llegada&&n>0)setF(p=>({...p,salida:autoSalida(p.llegada,n)}));};
  const hNM=v=>{setNm(v);setNs(0);const n=Number(v)||0;if(f.llegada&&n>0)setF(p=>({...p,salida:autoSalida(p.llegada,n)}));};

  const save=()=>{
    if(!f.huesped||!f.llegada||!f.salida||noches<=0){alert("Completa los campos.");return;}
    if(ei<0&&f.llegada<hoy){alert("No puedes reservar en fechas pasadas.");return;}
    const dp=checkDisp(reservas,f.cabana,f.llegada,f.salida,ei);if(!dp.ok){alert(`${f.cabana} ocupada por ${dp.who.huesped}`);return;}
    const folio=genFolio(),fecha=new Date().toLocaleString("es-MX"),tl=TIPOS_TARIFA.find(t=>t.id===f.tarifa)?.label||f.tarifa;
    const res={...f,noches,total,anticipo:antic,saldo,folio,fechaRegistro:fecha,tarifaLabel:tl,porcentajePago:f.porcentajePago,estado:"activa"};
    const nr=ei>=0?reservas.map((r,i)=>i===ei?{...r,...res,folio:r.folio}:r):[res,...reservas];
    sv("cdb-reservas",nr,setReservas);
    if(ei<0)sv("cdb-ingresos",[{fecha,concepto:`${f.cabana} — ${f.huesped}`,monto:antic,metodo:f.metodoPago,folio,tipo:f.porcentajePago==="100"?"Total":"Anticipo",id:Date.now()},...ingresos],setIngresos);
    const pdfData={folio,huesped:f.huesped,telefono:f.telefono,cabana:f.cabana,huespedes:f.huespedes,llegada:f.llegada,salida:f.salida,noches,tarifa:tl,total,porcentajePago:f.porcentajePago,anticipo:antic,saldo,metodoPago:f.metodoPago,fechaRegistro:fecha};
    setPdf({svg:genPDF(pdfData),data:pdfData});
    setF(empty);setEi(-1);setNs(1);setNm("");
  };

  const cancelar=folio=>{
    const idx=reservas.findIndex(r=>r.folio===folio);if(idx<0)return;const r=reservas[idx];
    const hAntes=(new Date(r.llegada+"T15:00:00")-new Date())/36e5;const m72=hAntes<72;const fecha=new Date().toLocaleString("es-MX");
    sv("cdb-reservas",reservas.map((res,i)=>i===idx?{...r,estado:"cancelada",canceladaEn:fecha,tipoCancelacion:m72?"pierde":"cupon"}:res),setReservas);
    if(!m72){
      const exp=new Date();exp.setMonth(exp.getMonth()+3);
      sv("cdb-cupones",[{id:"CUP-"+Date.now(),folio:r.folio,huesped:r.huesped,monto:r.anticipo,creado:fecha,expira:exp.toISOString().split("T")[0],usado:false,restriccion:"No aplica en días festivos"},...cupones],setCupones);
      sv("cdb-ingresos",[{fecha,concepto:`❌ Cancel ${r.cabana} — ${r.huesped} → Cupón`,monto:-r.anticipo,metodo:r.metodoPago,folio:r.folio,tipo:"Cancelación",id:Date.now()+2},...ingresos],setIngresos);
    }
    setCC(null);
  };

  const seg=(items,val,onChange,colors)=>(<div style={{display:"flex",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>{items.map((it,i)=>{const sel=val===it.v;const col=colors?colors[it.v]:null;return(<button key={it.v} onClick={()=>onChange(it.v)} disabled={it.dis} style={{flex:1,padding:"12px 4px",cursor:it.dis?"not-allowed":"pointer",fontSize:it.sz||15,fontWeight:700,border:"none",borderRight:i<items.length-1?`1px solid ${C.border}`:"none",background:sel?(col||C.dark):it.dis?"#FFF3F0":"#fff",color:sel?"#fff":it.dis?C.danger:C.dark,opacity:it.dis?0.5:1,textAlign:"center"}}><div>{it.l}</div>{it.sub&&<div style={{fontSize:9,marginTop:2,fontWeight:600,color:sel?"#ffffffcc":it.subC||C.muted}}>{it.sub}</div>}</button>);})}</div>);

  const activas=reservas.filter(r=>r.estado!=="cancelada");const canceladas=reservas.filter(r=>r.estado==="cancelada");

  return(<div>
    <h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 12px"}}>📋 Nueva Reservación</h2>
    <div style={sS}>
      <label style={lS}>Noches</label>
      {seg([{v:1,l:"1"},{v:2,l:"2"},{v:3,l:"3"},{v:4,l:"4"},{v:0,l:"Más",sz:12}],ns,hNS)}
      {ns===0&&<input type="number" min="5" style={{...iS,marginTop:8}} value={nm} onChange={e=>hNM(e.target.value)} placeholder="Noches"/>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        <div><label style={lS}>Llegada</label><input type="date" style={iS} value={f.llegada} min={hoy} onChange={e=>hLL(e.target.value)}/></div>
        <div><label style={lS}>Salida</label><input type="date" style={{...iS,background:"#F0EBE3",fontWeight:600}} value={f.salida} readOnly/></div>
      </div>
      <label style={{...lS,marginTop:12}}>Cabaña</label>
      {seg(CABANAS.map(c=>{const dp=checkDisp(reservas,c,f.llegada,f.salida,ei);const hf=f.llegada&&f.salida;return{v:c,l:c,sub:hf?(dp.ok?"✅ Libre":`❌ ${dp.who?.huesped?.split(" ")[0]||""}`):null,subC:dp.ok?C.success:C.danger,dis:hf&&!dp.ok};}),f.cabana,v=>setF({...f,cabana:v}),cabC)}
      {f.llegada&&f.salida&&noches>0&&<div style={{marginTop:10,padding:8,background:"#F0EBE3",borderRadius:8,fontSize:12,color:C.dark,textAlign:"center"}}><strong>{f.cabana}</strong> · {fmtF(f.llegada)} → {fmtF(f.salida)} · {noches}n{nochesEnFestivo(f.llegada,f.salida)>0?` · 🎆 ${nochesEnFestivo(f.llegada,f.salida)} festivo(s)`:""}</div>}
      <label style={{...lS,marginTop:12}}>Huésped *</label>
      <input style={iS} value={f.huesped} onChange={e=>setF({...f,huesped:e.target.value})} placeholder="Nombre completo"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
        <div><label style={lS}>Teléfono</label><input style={iS} value={f.telefono} onChange={e=>setF({...f,telefono:e.target.value})} placeholder="10 dígitos"/></div>
        <div><label style={lS}>Huéspedes</label><select style={iS} value={f.huespedes} onChange={e=>setF({...f,huespedes:+e.target.value})}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
      </div>
    </div>
    <div style={sS}>
      <label style={lS}>Tarifa</label><select style={iS} value={f.tarifa} onChange={e=>setF({...f,tarifa:e.target.value})}>{TIPOS_TARIFA.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
      {f.tarifa==="manual"&&<><label style={{...lS,marginTop:8}}>Precio</label><input type="number" style={iS} value={f.precioManual} onChange={e=>setF({...f,precioManual:e.target.value})} placeholder="$0"/></>}
      {f.tarifa==="tarifa2"&&<><label style={{...lS,marginTop:8}}>Precio 2 noches</label><input type="number" style={iS} value={f.tarifaFija2} onChange={e=>setF({...f,tarifaFija2:e.target.value})} placeholder="$0"/></>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
        <div><label style={lS}>Pago</label><select style={iS} value={f.porcentajePago} onChange={e=>setF({...f,porcentajePago:e.target.value})}>{PORCENTAJE_PAGO.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
        <div><label style={lS}>Método</label><select style={iS} value={f.metodoPago} onChange={e=>setF({...f,metodoPago:e.target.value})}>{METODOS_PAGO.map(m=><option key={m}>{m}</option>)}</select></div>
      </div>
      <label style={{...lS,marginTop:8}}>Notas</label><input style={iS} value={f.notas} onChange={e=>setF({...f,notas:e.target.value})} placeholder="Notas..."/>
      <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
        {[["TOTAL",fmt$(total),C.dark],["PAGADO",fmt$(antic),C.success],["SALDO",fmt$(saldo),saldo>0?C.danger:C.dark]].map(([l,v,c])=><div key={l} style={{textAlign:"center",padding:8,background:"#F0EBE3",borderRadius:8}}><div style={{fontSize:9,color:C.muted}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
      </div>
      <button onClick={save} style={{...bP,marginTop:12}}>{ei>=0?"✏️ Actualizar":"✅ Registrar y Recibo"}</button>
    </div>

    {cc&&(()=>{const r=reservas.find(x=>x.folio===cc);if(!r)return null;const hA=(new Date(r.llegada+"T15:00:00")-new Date())/36e5;const m72=hA<72;
      return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1001,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setCC(null)}><div style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:20,width:"100%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:"0 0 8px",color:C.danger,fontSize:16}}>❌ Cancelar</h3>
        <div style={{fontSize:14,fontWeight:700}}>{r.cabana} — {r.huesped}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{fmtF(r.llegada)} → {fmtF(r.salida)} · Anticipo: {fmt$(r.anticipo)}</div>
        {m72?<div style={{padding:12,background:"#FFF3F0",borderRadius:10,marginBottom:12,fontSize:13}}><strong style={{color:C.danger}}>⚠️ Menos de 72h</strong><div style={{color:"#666",marginTop:4}}>Pierde anticipo de {fmt$(r.anticipo)}</div></div>
        :<div style={{padding:12,background:"#FFF8E1",borderRadius:10,marginBottom:12,fontSize:13}}><strong style={{color:C.orange}}>🎟️ Más de 72h</strong><div style={{color:"#666",marginTop:4}}>Cupón por {fmt$(r.anticipo)} · 3 meses · No festivos</div></div>}
        <div style={{display:"flex",gap:8}}><button onClick={()=>setCC(null)} style={{flex:1,padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Volver</button><button onClick={()=>cancelar(cc)} style={{...bDanger,flex:1,padding:12}}>Cancelar</button></div>
      </div></div>);})()}

    <h3 style={{color:C.dark,fontSize:15,margin:"14px 0 8px"}}>Activas ({activas.length})</h3>
    {activas.length===0&&<div style={{color:C.muted,textAlign:"center",padding:24}}>Sin reservaciones</div>}
    {activas.map((r,i)=><div key={r.folio} style={{...sS,padding:"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,color:C.dark,fontSize:13}}>{r.cabana} — {r.huesped}<span style={{marginLeft:6,fontSize:9,padding:"2px 6px",borderRadius:10,background:r.saldo>0?"#FFF3E0":"#E8F0E0",color:r.saldo>0?C.orange:C.success}}>{r.saldo>0?`$${r.saldo}`:"✓"}</span></div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{fmtF(r.llegada)} → {fmtF(r.salida)} · {r.noches}n · {fmt$(r.total)}</div></div><div style={{display:"flex",gap:3,flexShrink:0}}><button onClick={()=>{const pD={folio:r.folio,huesped:r.huesped,telefono:r.telefono,cabana:r.cabana,huespedes:r.huespedes,llegada:r.llegada,salida:r.salida,noches:r.noches,tarifa:r.tarifaLabel,total:r.total,porcentajePago:r.porcentajePago,anticipo:r.anticipo,saldo:r.saldo,metodoPago:r.metodoPago,fechaRegistro:r.fechaRegistro};setPdf({svg:genPDF(pD),data:pD});}} style={{background:"#F0EBE3",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 8px",cursor:"pointer",fontSize:11}}>📄</button><button onClick={()=>setCC(r.folio)} style={bCancel}>❌</button></div></div></div>)}

    {canceladas.length>0&&<><h3 style={{color:C.muted,fontSize:13,margin:"14px 0 6px"}}>Canceladas ({canceladas.length})</h3>{canceladas.map(r=><div key={r.folio} style={{...sS,padding:"8px 12px",opacity:0.6}}><div style={{fontSize:12,fontWeight:600,color:C.muted}}><s>{r.cabana} — {r.huesped}</s><span style={{marginLeft:6,fontSize:9,padding:"2px 6px",borderRadius:10,background:"#FFF3F0",color:C.danger}}>{r.tipoCancelacion==="pierde"?"Perdió anticipo":"Cupón"}</span></div><div style={{fontSize:10,color:C.muted}}>{fmtF(r.llegada)} → {fmtF(r.salida)}</div></div>)}</>}
  </div>);
}

// ===== CALENDARIO =====
function CalM({reservas}){
  const[m,setM]=useState(new Date().getMonth());const[a,setA]=useState(new Date().getFullYear());
  const p1=new Date(a,m,1).getDay();const dias=new Date(a,m+1,0).getDate();const nom=new Date(a,m).toLocaleString("es-MX",{month:"long"});
  const act=reservas.filter(r=>r.estado!=="cancelada");const hoyD=new Date();
  const gR=d=>{const f=`${a}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return act.filter(r=>f>=r.llegada&&f<r.salida);};
  const cm=dir=>{let mm=m+dir,aa=a;if(mm>11){mm=0;aa++;}if(mm<0){mm=11;aa--;}setM(mm);setA(aa);};
  return(<div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><button onClick={()=>cm(-1)} style={{background:C.dark,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:16}}>◀</button><h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:16,textTransform:"capitalize"}}>{nom} {a}</h2><button onClick={()=>cm(1)} style={{background:C.dark,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:16}}>▶</button></div>
    <div style={{display:"flex",gap:8,marginBottom:6,justifyContent:"center"}}>{CABANAS.map(c=><span key={c} style={{fontSize:10,display:"flex",alignItems:"center",gap:3}}><span style={{width:8,height:8,borderRadius:"50%",background:cabC[c],display:"inline-block"}}/>{c}</span>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,background:"#fff",borderRadius:10,padding:4,border:`1px solid ${C.border}`}}>
      {["D","L","M","M","J","V","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:9,fontWeight:700,color:C.muted,padding:2}}>{d}</div>)}
      {Array(p1).fill(null).map((_,i)=><div key={"e"+i}/>)}
      {Array.from({length:dias},(_,i)=>i+1).map(d=>{const rd=gR(d);const hoy=d===hoyD.getDate()&&m===hoyD.getMonth()&&a===hoyD.getFullYear();const fStr=`${a}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;const fest=esFestivo(fStr);
        return(<div key={d} style={{minHeight:32,padding:1,borderRadius:4,background:fest?"#FFF8E1":hoy?"#F0EBE3":"#FAFAF7",border:hoy?`2px solid ${C.dark}`:"1px solid #eee"}}><div style={{fontSize:9,fontWeight:hoy?800:400,color:fest?C.orange:hoy?C.dark:"#555",textAlign:"center"}}>{d}</div>{rd.map((r,ri)=><div key={ri} style={{fontSize:5,background:cabC[r.cabana]||"#666",color:"#fff",borderRadius:2,padding:"0 1px",marginTop:1,overflow:"hidden",whiteSpace:"nowrap"}}>{r.cabana[0]}</div>)}</div>);})}
    </div>
    <div style={{marginTop:6,fontSize:10,color:C.muted,textAlign:"center"}}>🟡 = festivo</div>
  </div>);
}

// ===== INGRESOS =====
function IngrM({ingresos,sv,setIngresos}){
  const tB=ingresos.filter(i=>i.metodo==="BBVA Plebiya").reduce((s,i)=>s+i.monto,0);const tE=ingresos.filter(i=>i.metodo==="Efectivo").reduce((s,i)=>s+i.monto,0);const tT=ingresos.reduce((s,i)=>s+i.monto,0);
  const cancelar=idx=>{const ig=ingresos[idx];if(ig.monto<0)return;sv("cdb-ingresos",[{...ig,concepto:`❌ ${ig.concepto}`,monto:-ig.monto,tipo:"Cancelación",fecha:new Date().toLocaleString("es-MX"),id:Date.now()},...ingresos],setIngresos);};
  return(<div>
    <h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 12px"}}>💰 Ingresos</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>{[["BBVA",tB,C.blue],["Efect.",tE,C.success],["Total",tT,C.dark]].map(([l,m,c])=><div key={l} style={{background:"#fff",borderRadius:10,padding:8,textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:9,color:C.muted}}>{l}</div><div style={{fontSize:15,fontWeight:800,color:c}}>{fmt$(m)}</div></div>)}</div>
    {ingresos.length===0&&<div style={{color:C.muted,textAlign:"center",padding:24}}>Sin ingresos</div>}
    {ingresos.map((ig,i)=><div key={ig.id||i} style={{...sS,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:ig.monto<0?0.5:1}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:ig.monto<0?C.danger:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ig.concepto}</div><div style={{fontSize:10,color:C.muted}}>{ig.fecha}</div></div><div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}><span style={{fontWeight:700,color:ig.monto<0?C.danger:C.dark,fontSize:13}}>{fmt$(ig.monto)}</span>{ig.monto>0&&ig.tipo!=="Cancelación"&&<button onClick={()=>cancelar(i)} style={bCancel}>❌</button>}</div></div>)}
  </div>);
}

// ===== GASTOS =====
function GastM({gastos,sv,setGastos,cortes,setCortes,reservas}){
  const[f,setF]=useState({fecha:"",categoria:CATEGORIAS_GASTO[0],descripcion:"",monto:"",metodo:"Efectivo",limpiezaRef:""});const LM=550;
  const hoy=new Date().toISOString().split("T")[0];const lR=gastos.filter(g=>g.categoria==="Limpieza"&&g.limpiezaRef&&g.monto>0).map(g=>g.limpiezaRef);
  const act=reservas.filter(r=>r.estado!=="cancelada");const lP=act.filter(r=>r.salida&&r.salida<=hoy&&!lR.includes(r.folio));const isL=f.categoria==="Limpieza";
  const add=()=>{if(!f.monto||!f.fecha){alert("Fecha y monto");return;}sv("cdb-gastos",[{...f,monto:Number(f.monto),id:Date.now()},...gastos],setGastos);if(f.metodo==="Doc Juan paga")sv("cdb-cortes",[{fecha:f.fecha,tipo:"pago",monto:Number(f.monto),concepto:`Gasto: ${f.categoria}`,notas:"Auto",id:Date.now()+1},...cortes],setCortes);setF({fecha:"",categoria:CATEGORIAS_GASTO[0],descripcion:"",monto:"",metodo:"Efectivo",limpiezaRef:""});};
  const addL=r=>{sv("cdb-gastos",[{fecha:hoy,categoria:"Limpieza",descripcion:`Limpieza ${r.cabana} — ${r.huesped}`,monto:LM,metodo:"Doc Juan paga",limpiezaRef:r.folio,id:Date.now()},...gastos],setGastos);sv("cdb-cortes",[{fecha:hoy,tipo:"pago",monto:LM,concepto:`Limpieza: ${r.cabana} — ${r.huesped}`,notas:`${fmtF(r.llegada)} al ${fmtF(r.salida)}`,id:Date.now()+1},...cortes],setCortes);};
  const cancelarG=idx=>{const g=gastos[idx];if(g.monto<0)return;sv("cdb-gastos",[{...g,descripcion:`❌ ${g.descripcion||g.categoria}`,monto:-g.monto,id:Date.now()},...gastos],setGastos);if(g.metodo==="Doc Juan paga")sv("cdb-cortes",[{fecha:hoy,tipo:"pago",monto:-g.monto,concepto:`❌ Cancel: ${g.categoria}`,notas:"Reverso",id:Date.now()+1},...cortes],setCortes);};
  const tG=gastos.reduce((s,g)=>s+g.monto,0);
  return(<div>
    <h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 12px"}}>🧾 Gastos</h2>
    <div style={sS}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><label style={lS}>Fecha</label><input type="date" style={iS} value={f.fecha} onChange={e=>setF({...f,fecha:e.target.value})}/></div><div><label style={lS}>Categoría</label><select style={iS} value={f.categoria} onChange={e=>{const c=e.target.value;setF(c==="Limpieza"?{...f,categoria:c,monto:String(LM),metodo:"Doc Juan paga"}:{...f,categoria:c,limpiezaRef:""});}}>{CATEGORIAS_GASTO.map(c=><option key={c}>{c}</option>)}</select></div></div>
      {isL&&(<div style={{marginTop:10}}><label style={lS}>🧹 Pendientes — ${LM}</label>{lP.length===0?<div style={{padding:10,background:"#F0EBE3",borderRadius:8,textAlign:"center",color:C.muted,fontSize:12}}>✅ Al día</div>:lP.map(r=><div key={r.folio} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:"#fff",borderRadius:8,border:`1px solid ${C.border}`,marginBottom:4}}><div><div style={{fontSize:12,fontWeight:700}}><span style={{fontSize:9,padding:"1px 5px",borderRadius:6,background:cabC[r.cabana],color:"#fff",marginRight:4}}>{r.cabana}</span>{r.huesped}</div><div style={{fontSize:10,color:C.muted}}>{fmtF(r.llegada)} → {fmtF(r.salida)}</div></div><button onClick={()=>addL(r)} style={{padding:"7px 10px",borderRadius:8,border:"none",background:cabC[r.cabana],color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>🧹 {fmt$(LM)}</button></div>)}</div>)}
      {!isL&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}><div><label style={lS}>Descripción</label><input style={iS} value={f.descripcion} onChange={e=>setF({...f,descripcion:e.target.value})} placeholder="Detalle"/></div><div><label style={lS}>Monto</label><input type="number" style={iS} value={f.monto} onChange={e=>setF({...f,monto:e.target.value})} placeholder="$0"/></div></div>}
      <label style={{...lS,marginTop:10}}>¿Quién paga?</label>
      <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>{METODOS_PAGO_GASTOS.map((m,i)=><button key={m} onClick={()=>setF({...f,metodo:m})} style={{flex:1,padding:"10px 4px",border:"none",borderRight:i<2?`1px solid ${C.border}`:"none",background:f.metodo===m?C.dark:"#fff",color:f.metodo===m?"#fff":C.dark,fontSize:10,fontWeight:700,cursor:"pointer"}}>{m==="Doc Juan paga"?"🤝 Juan":m==="BBVA Plebiya"?"🏦 BBVA":"💵 Efect."}</button>)}</div>
      {!isL&&<button onClick={add} style={{...bP,marginTop:10}}>➕ Registrar</button>}
    </div>
    <div style={{background:C.dark,color:"#fff",borderRadius:10,padding:10,textAlign:"center",marginBottom:12}}><div style={{fontSize:9,opacity:.7}}>TOTAL GASTOS</div><div style={{fontSize:18,fontWeight:800}}>{fmt$(tG)}</div></div>
    {gastos.map((g,i)=><div key={g.id||i} style={{...sS,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:g.monto<0?0.5:1}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.categoria==="Limpieza"?"🧹 ":""}{g.descripcion||g.categoria}</div><div style={{fontSize:10,color:C.muted}}>{fmtF(g.fecha)} · <span style={{fontSize:9,padding:"1px 4px",borderRadius:6,background:g.metodo==="Doc Juan paga"?"#FFF3E0":"#E8F0E0",color:g.metodo==="Doc Juan paga"?C.orange:C.success}}>{g.metodo==="Doc Juan paga"?"Juan":g.metodo==="BBVA Plebiya"?"BBVA":"Ef."}</span></div></div><div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}><span style={{fontWeight:700,color:C.danger,fontSize:13}}>{g.monto<0?"+":"-"}{fmt$(Math.abs(g.monto))}</span>{g.monto>0&&<button onClick={()=>cancelarG(i)} style={bCancel}>❌</button>}</div></div>)}
  </div>);
}

// ===== DOC JUAN =====
function JuanM({cortes,sv,setCortes,reservas}){
  const[f,setF]=useState({fecha:"",tipo:"recibio",monto:"",concepto:"",notas:"",reservaRef:""});
  const tipos=[{id:"recibio",l:"Recibió"},{id:"entrego",l:"Entregó"},{id:"pago",l:"Pagó gasto"},{id:"corte",l:"Corte"}];
  const rAct=reservas.filter(r=>{const h=new Date();h.setDate(h.getDate()-30);return r.estado!=="cancelada"&&new Date(r.salida+"T12:00:00")>=h;});
  const hoy=new Date().toISOString().split("T")[0];
  const add=()=>{if(!f.monto||!f.fecha){alert("Fecha y monto");return;}let conc=f.concepto;if(f.tipo==="recibio"&&f.reservaRef){const rr=reservas.find(r=>r.folio===f.reservaRef);if(rr)conc=`Cobro ${rr.cabana} — ${rr.huesped}`;}sv("cdb-cortes",[{...f,concepto:conc,monto:Number(f.monto),id:Date.now()},...cortes],setCortes);setF({fecha:"",tipo:"recibio",monto:"",concepto:"",notas:"",reservaRef:""});};
  const cancelarC=idx=>{const c=cortes[idx];if(c.monto<0)return;sv("cdb-cortes",[{...c,concepto:`❌ ${c.concepto}`,monto:-c.monto,notas:"Reverso",id:Date.now()},...cortes],setCortes);};
  const rec=cortes.filter(c=>c.tipo==="recibio").reduce((s,c)=>s+c.monto,0);const ent=cortes.filter(c=>c.tipo==="entrego").reduce((s,c)=>s+c.monto,0);const pag=cortes.filter(c=>c.tipo==="pago").reduce((s,c)=>s+c.monto,0);const bal=rec-ent-pag;
  return(<div>
    <h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 12px"}}>🤝 Doc Juan</h2>
    <div style={{background:bal>0?`linear-gradient(135deg,${C.danger},${C.orange})`:bal<0?`linear-gradient(135deg,${C.blue},#5A9ABB)`:`linear-gradient(135deg,${C.dark},${C.mid})`,borderRadius:12,padding:14,color:"#fff",textAlign:"center",marginBottom:12}}>
      <div style={{fontSize:10,opacity:.8}}>BALANCE</div><div style={{fontSize:24,fontWeight:800}}>{fmt$(Math.abs(bal))}</div>
      <div style={{fontSize:11,marginTop:2}}>{bal>0?"Juan debe entregarle":bal<0?"Le debes a Juan":"A mano ✅"}</div>
      <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:6,fontSize:10,opacity:.9,flexWrap:"wrap"}}><span>Rec: {fmt$(rec)}</span><span>Ent: {fmt$(ent)}</span><span>Pagó: {fmt$(pag)}</span></div>
    </div>
    <div style={sS}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><label style={lS}>Fecha</label><input type="date" style={iS} value={f.fecha} onChange={e=>setF({...f,fecha:e.target.value})}/></div>
        <div><label style={lS}>Tipo</label><select style={iS} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value,reservaRef:""})}>{tipos.map(t=><option key={t.id} value={t.id}>{t.l}</option>)}</select></div>
        <div><label style={lS}>Monto</label><input type="number" style={iS} value={f.monto} onChange={e=>setF({...f,monto:e.target.value})} placeholder="$0"/></div>
        {f.tipo==="recibio"?<div><label style={lS}>Reserva</label><select style={iS} value={f.reservaRef} onChange={e=>{const fo=e.target.value;const rr=reservas.find(r=>r.folio===fo);setF(p=>({...p,reservaRef:fo,monto:rr&&!p.monto?String(rr.saldo>0?rr.saldo:rr.total):p.monto}));}}><option value="">—</option>{rAct.map(r=><option key={r.folio} value={r.folio}>{r.cabana} — {r.huesped}</option>)}</select></div>
        :<div><label style={lS}>Concepto</label><input style={iS} value={f.concepto} onChange={e=>setF({...f,concepto:e.target.value})}/></div>}
      </div>
      <button onClick={add} style={{...bP,marginTop:10}}>➕ Registrar</button>
    </div>
    {cortes.map((c,i)=><div key={c.id||i} style={{...sS,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:c.monto<0?0.5:1}}><div style={{flex:1,minWidth:0}}><span style={{fontSize:9,padding:"1px 5px",borderRadius:6,background:c.tipo==="recibio"?"#FFF3E0":c.tipo==="entrego"?"#E8F0E0":"#E3EEF5",color:c.tipo==="recibio"?C.orange:c.tipo==="entrego"?C.success:C.blue}}>{tipos.find(t=>t.id===c.tipo)?.l||c.tipo}</span><div style={{fontSize:11,color:"#555",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.concepto}</div><div style={{fontSize:9,color:C.muted}}>{fmtF(c.fecha)}</div></div><div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}><span style={{fontWeight:700,fontSize:13,color:c.tipo==="recibio"?C.orange:c.tipo==="entrego"?C.success:C.blue}}>{fmt$(c.monto)}</span>{c.monto>0&&c.notas!=="Auto"&&c.notas!=="Reverso"&&<button onClick={()=>cancelarC(i)} style={bCancel}>❌</button>}</div></div>)}
  </div>);
}

// ===== CUPONES =====
function CupM({cupones}){
  const hoy=new Date().toISOString().split("T")[0];const activos=cupones.filter(c=>!c.usado&&c.expira>=hoy);const vencidos=cupones.filter(c=>!c.usado&&c.expira<hoy);
  return(<div>
    <h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 12px"}}>🎟️ Cupones</h2>
    {cupones.length===0&&<div style={{...sS,textAlign:"center",padding:24,color:C.muted}}>No hay cupones</div>}
    {activos.length>0&&<h3 style={{fontSize:13,color:C.success,marginBottom:6}}>✅ Activos ({activos.length})</h3>}
    {activos.map(c=><div key={c.id} style={{...sS,padding:"10px 12px",borderLeft:`4px solid ${C.success}`}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:14,fontWeight:700}}>{c.huesped}</div><div style={{fontSize:11,color:C.muted}}>Folio: {c.folio}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:C.success}}>{fmt$(c.monto)}</div><div style={{fontSize:9,color:C.muted}}>Vence: {fmtF(c.expira)}</div></div></div><div style={{marginTop:6,padding:"4px 8px",background:"#FFF8E1",borderRadius:6,fontSize:10,color:C.orange}}>{c.restriccion}</div></div>)}
    {vencidos.length>0&&<><h3 style={{fontSize:13,color:C.danger,margin:"12px 0 6px"}}>⏰ Vencidos</h3>{vencidos.map(c=><div key={c.id} style={{...sS,padding:"8px 12px",opacity:0.5}}><div style={{fontSize:12,color:C.muted}}><s>{c.huesped} — {fmt$(c.monto)}</s> · Venció {fmtF(c.expira)}</div></div>)}</>}
  </div>);
}

// ===== RESUMEN =====
function ResumM({reservas,ingresos,gastos,cortes,cupones}){
  const act=reservas.filter(r=>r.estado!=="cancelada");const tI=ingresos.reduce((s,i)=>s+i.monto,0);const tG=gastos.reduce((s,g)=>s+g.monto,0);const ut=tI-tG;
  const pend=act.filter(r=>r.saldo>0);const tP=pend.reduce((s,r)=>s+r.saldo,0);
  const card=(ic,l,v,c)=><div style={{background:"#fff",borderRadius:10,padding:10,textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:16}}>{ic}</div><div style={{fontSize:9,color:C.muted}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:c}}>{typeof v==="number"?fmt$(v):v}</div></div>;
  return(<div>
    <h2 style={{color:C.dark,fontFamily:"Georgia,serif",fontSize:18,margin:"0 0 12px"}}>📊 Resumen</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>{card("💰","INGRESOS",tI,C.success)}{card("🧾","GASTOS",tG,C.danger)}{card("📈","UTILIDAD",ut,ut>=0?C.dark:C.danger)}{card("⏳","PENDIENTES",tP,C.orange)}</div>
    {pend.length>0&&<div style={{background:"#FFF3E0",borderRadius:10,padding:10,border:"1px solid #FFE0B2"}}><div style={{fontWeight:700,color:C.orange,fontSize:12,marginBottom:4}}>⚠️ Saldos</div>{pend.map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:11,borderBottom:"1px solid #FFE0B2"}}><span>{r.cabana} — {r.huesped}</span><span style={{fontWeight:700,color:C.orange}}>{fmt$(r.saldo)}</span></div>)}</div>}
  </div>);
}

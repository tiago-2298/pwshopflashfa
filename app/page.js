'use client';
import { useState, useEffect } from 'react';

const GRADES_ORDRE = ['Patron','Co-Patronne','Manager','Responsable','Commercial Expert','Commercial Confirmé','Commercial Débutant'];
const GRADES_REVENTE = ['Patron','Co-Patronne','Manager','Responsable'];
const GRADES_STATS_ALL = ['Patron','Co-Patronne','Manager'];
const GRADE_COLORS = {'Patron':'#d4af37','Co-Patronne':'#c9a84c','Manager':'#c0392b','Responsable':'#8e44ad','Commercial Expert':'#2980b9','Commercial Confirmé':'#16a085','Commercial Débutant':'#7f8c8d'};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
:root{
  --p:#9b1a1a; --p2:#c9a84c; --p-glow:rgba(155,26,26,0.35);
  --bg:#040508; --panel:rgba(14,16,22,0.7);
  --glass:rgba(255,255,255,0.025); --glass-b:rgba(255,255,255,0.07);
  --txt:#eee8dc; --muted:#6e6a60; --radius:24px;
  --success:#10b981; --error:#ef4444;
}
*{box-sizing:border-box;margin:0;padding:0;outline:none;-webkit-tap-highlight-color:transparent;}
body{
  background-color:var(--bg);
  background-image:radial-gradient(at 5% 10%,rgba(155,26,26,0.09) 0,transparent 50%),radial-gradient(at 95% 90%,rgba(26,39,68,0.12) 0,transparent 50%),radial-gradient(at 50% 50%,rgba(201,168,76,0.03) 0,transparent 60%);
  color:var(--txt);height:100vh;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;
}
.app{display:flex;height:100vh;width:100vw;position:relative;}

/* ── DOCK ── */
.dock-wrap{padding:18px;height:100vh;display:flex;align-items:center;flex-shrink:0;}
.dock{
  width:86px;height:96vh;
  background:rgba(6,7,12,0.65);backdrop-filter:blur(28px);
  border:1px solid var(--glass-b);border-radius:38px;
  display:flex;flex-direction:column;align-items:center;
  padding:28px 0;transition:width 0.3s cubic-bezier(0.4,0,0.2,1);
  z-index:100;box-shadow:0 24px 60px rgba(0,0,0,0.65),inset 0 1px 0 rgba(255,255,255,0.04);overflow:hidden;
}
.dock:hover{width:232px;}
.dock:hover .nav-label{opacity:1;transform:translateX(0);display:block;}
.dock:hover .nav-icon{margin-right:14px;}
.dock:hover .user-info{display:block;}
.dock:hover .user-pill{width:86%;padding:10px 14px;border-radius:18px;height:auto;}
.dock:hover .dock-logo-text{opacity:1;display:block;}

.dock-logo{margin-bottom:28px;display:flex;align-items:center;padding:0 10px;min-height:36px;}
.dock-logo-icon{font-size:20px;flex-shrink:0;filter:drop-shadow(0 0 8px rgba(201,168,76,0.4));}
.dock-logo-text{display:none;opacity:0;transition:0.3s;white-space:nowrap;margin-left:12px;font-size:13px;font-weight:900;letter-spacing:0.1em;color:var(--p2);}

.nav-btn{display:flex;align-items:center;justify-content:center;width:80%;padding:13px;margin-bottom:5px;border-radius:18px;border:1px solid transparent;background:transparent;color:var(--muted);cursor:pointer;transition:all 0.25s;overflow:hidden;}
.dock:hover .nav-btn{justify-content:flex-start;padding-left:20px;}
.nav-icon{font-size:1.35rem;transition:0.25s;z-index:2;flex-shrink:0;}
.nav-label{font-size:0.9rem;font-weight:700;opacity:0;transform:translateX(-10px);transition:0.25s;white-space:nowrap;display:none;}
.nav-btn:hover{background:var(--glass);color:var(--txt);}
.nav-btn.active{background:linear-gradient(135deg,var(--p),#7a1414);color:#fff;box-shadow:0 10px 28px var(--p-glow);}
.nav-btn:active{transform:scale(0.95);}

.dock-footer{margin-top:auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 8px;}
.user-pill{background:rgba(0,0,0,0.45);border:1px solid var(--glass-b);padding:10px;border-radius:50px;display:flex;align-items:center;gap:10px;width:48px;height:48px;overflow:hidden;transition:all 0.3s;}
.user-avatar{width:30px;height:30px;background:linear-gradient(135deg,var(--p),#7a1414);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;flex-shrink:0;font-size:13px;box-shadow:0 4px 12px var(--p-glow);}
.user-info{display:none;white-space:nowrap;}
.u-name{font-size:0.78rem;font-weight:800;display:block;color:var(--txt);}
.u-role{font-size:0.63rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;}
.logout-btn{background:none;border:none;color:var(--muted);cursor:pointer;padding:11px;border-radius:16px;transition:0.2s;width:80%;display:flex;align-items:center;justify-content:center;}
.dock:hover .logout-btn{justify-content:flex-start;padding-left:20px;}
.logout-btn:hover{background:rgba(155,26,26,0.12);color:#f87171;}

/* ── MAIN ── */
.main{flex:1;overflow-y:auto;padding:40px;scroll-behavior:smooth;}
.main::-webkit-scrollbar{width:4px;}
.main::-webkit-scrollbar-thumb{background:var(--glass-b);border-radius:4px;}
.fade-in{animation:fadeIn 0.38s cubic-bezier(0.2,0.8,0.2,1);}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes pop{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}

/* ── TOAST ── */
.toast{position:fixed;top:26px;left:50%;z-index:9999;padding:14px 28px;border-radius:50px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px;backdrop-filter:blur(20px);box-shadow:0 20px 50px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.08);animation:toastBounce 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;}
@keyframes toastBounce{0%{transform:translate(-50%,-150%);opacity:0;}70%{transform:translate(-50%,8px);}100%{transform:translate(-50%,0);opacity:1;}}

/* ── CARDS ── */
.card{background:var(--panel);border:1px solid var(--glass-b);border-radius:var(--radius);padding:24px;position:relative;overflow:hidden;transition:0.25s;}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--p),var(--p2),transparent);opacity:0;transition:0.3s;}
.card:hover::before{opacity:1;}
.card:hover{border-color:rgba(155,26,26,0.2);transform:translateY(-2px);}
.card-title{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;}

/* ── KPI ── */
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;}
.kpi{background:rgba(8,10,16,0.8);border:1px solid var(--glass-b);border-radius:22px;padding:22px 24px;transition:0.25s;position:relative;overflow:hidden;}
.kpi::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(201,168,76,0.04),transparent 60%);pointer-events:none;}
.kpi:hover{border-color:rgba(201,168,76,0.2);transform:translateY(-2px);}
.kpi-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.09em;margin-bottom:10px;}
.kpi-val{font-size:30px;font-weight:900;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.02em;}

/* ── TABLE ── */
.tbl{width:100%;border-collapse:collapse;font-size:13px;}
.tbl th{text-align:left;padding:10px 14px;color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid var(--glass-b);}
.tbl td{padding:13px 14px;border-bottom:1px solid rgba(255,255,255,0.03);}
.tbl tr:hover td{background:var(--glass);}

/* ── FORMS ── */
.label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:7px;display:block;font-weight:700;}
.inp{width:100%;padding:12px 16px;border-radius:14px;border:1px solid var(--glass-b);background:rgba(0,0,0,0.3);color:var(--txt);font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;transition:0.25s;box-sizing:border-box;}
.inp:focus{border-color:rgba(155,26,26,0.5);background:rgba(155,26,26,0.05);box-shadow:0 0 0 3px rgba(155,26,26,0.1);}
.inp option{background:#0a0a0f;}
.btn-p{background:linear-gradient(135deg,var(--p),#7a1414);border:none;border-radius:14px;color:#fff;font-weight:800;font-size:15px;padding:14px 20px;cursor:pointer;width:100%;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:0.02em;transition:0.25s;box-shadow:0 8px 24px var(--p-glow);text-transform:uppercase;}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 14px 32px var(--p-glow);}
.btn-p:active{transform:scale(0.97);}
.btn-p:disabled{background:rgba(255,255,255,0.05);color:var(--muted);box-shadow:none;cursor:not-allowed;transform:none;}
.btn-ghost{background:var(--glass);border:1px solid var(--glass-b);border-radius:12px;color:var(--txt);font-weight:600;font-size:13px;padding:11px 16px;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;}
.btn-ghost:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);}
.pill{font-size:12px;padding:5px 13px;border-radius:20px;border:1px solid var(--glass-b);background:transparent;color:var(--muted);cursor:pointer;transition:0.2s;font-family:'Plus Jakarta Sans',sans-serif;}
.pill.on,.pill:hover{background:rgba(155,26,26,0.14);border-color:rgba(155,26,26,0.4);color:#f87171;}

/* ── PANIER ── */
.panier-item{display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);border:1px solid var(--glass-b);border-radius:12px;padding:10px 14px;margin-bottom:7px;transition:0.2s;}
.panier-item:hover{border-color:rgba(255,255,255,0.1);}

/* ── ANNUAIRE ── */
.emp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:14px;}
.emp-card{background:var(--panel);border:1px solid var(--glass-b);border-radius:22px;padding:20px;transition:0.2s;}
.emp-card:hover{border-color:rgba(201,168,76,0.18);transform:translateY(-1px);}

/* ── RÈGLEMENT ── */
.reg{background:var(--panel);border:1px solid var(--glass-b);border-radius:20px;overflow:hidden;margin-bottom:10px;}
.reg-h{background:rgba(26,39,68,0.35);padding:14px 22px;font-weight:800;font-size:13px;border-bottom:1px solid var(--glass-b);letter-spacing:0.02em;}
.reg-b{padding:16px 22px;display:flex;flex-direction:column;gap:10px;}
.reg-p{display:flex;gap:10px;font-size:13px;color:var(--muted);line-height:1.6;}

/* ── PAGE TITLE ── */
.pg-title{font-size:32px;font-weight:900;letter-spacing:-0.01em;margin-bottom:4px;}
.pg-sub{color:var(--muted);font-size:14px;margin-bottom:26px;}

/* ── BARS ── */
.bars{display:flex;align-items:flex-end;gap:5px;height:90px;}
.bar-item{flex:1;border-radius:6px 6px 0 0;min-height:3px;background:linear-gradient(to top,var(--p),rgba(155,26,26,0.2));transition:height 0.6s cubic-bezier(0.4,0,0.2,1);}
.bar-item:hover{background:linear-gradient(to top,#c0392b,rgba(192,57,43,0.3));}

/* ── LOGIN ── */
.login-page{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;}
.login-wrap{
  background:rgba(6,7,12,0.85);backdrop-filter:blur(32px);
  border:1px solid var(--glass-b);border-radius:36px;
  padding:50px 44px;width:390px;
  box-shadow:0 40px 90px rgba(0,0,0,0.75);
  position:relative;overflow:hidden;
  animation:pop 0.5s cubic-bezier(0.2,0.8,0.2,1);
}
.login-wrap::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--p),var(--p2),transparent);}
.login-logo{text-align:center;margin-bottom:40px;}
.login-icon{font-size:50px;display:block;margin-bottom:12px;filter:drop-shadow(0 0 16px rgba(201,168,76,0.3));}
.login-name{font-size:28px;font-weight:900;letter-spacing:0.12em;color:var(--txt);}
.login-name span{color:var(--p2);}
.login-tagline{font-size:10px;color:var(--muted);letter-spacing:0.2em;text-transform:uppercase;margin-top:5px;}
.login-sep{width:36px;height:2px;background:linear-gradient(90deg,var(--p),var(--p2));margin:14px auto 0;border-radius:2px;}
.err-box{background:rgba(155,26,26,0.1);border:1px solid rgba(155,26,26,0.3);border-radius:12px;padding:12px 16px;color:#f87171;font-size:13px;margin-bottom:16px;}
`;

async function api(action,data={}){
  const res=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});
  return res.json();
}

function PanierForm({objets,mode,employe,grade,onSuccess}){
  const [cNom,setCNom]=useState('');
  const [cTel,setCTel]=useState('');
  const [cIban,setCIban]=useState('');
  const [sel,setSel]=useState('');
  const [qty,setQty]=useState(1);
  const [panier,setPanier]=useState([]);
  const [cat,setCat]=useState('');
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState({t:'',x:''});

  const cats=[...new Set(objets.map(o=>o.categorie))].sort();
  const list=(cat?objets.filter(o=>o.categorie===cat):objets).sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
  const total=panier.reduce((s,i)=>s+i.prix*i.quantite,0);

  function add(){
    if(!sel||qty<1){setMsg({t:'e',x:'Sélectionnez un objet.'});return;}
    const o=objets.find(x=>x.nom===sel);if(!o)return;
    const prix=mode==='rachat'?o.prixAchat:o.prixRevente;
    const ex=panier.find(p=>p.objet===sel);
    if(ex)setPanier(panier.map(p=>p.objet===sel?{...p,quantite:p.quantite+qty}:p));
    else setPanier([...panier,{objet:sel,quantite:qty,prix}]);
    setSel('');setQty(1);setMsg({t:'',x:''});
  }

  async function valider(){
    if(!cNom||!cTel||(mode==='rachat'&&!cIban)){setMsg({t:'e',x:'Infos client incomplètes.'});return;}
    if(!panier.length){setMsg({t:'e',x:'Panier vide.'});return;}
    setLoading(true);
    const res=await api(mode,{employe,grade,clientNom:cNom,clientTel:cTel,clientIban:cIban,articles:panier});
    setLoading(false);
    if(res.ok){
      const m=res.totalDuClient??res.totalRevente??0;
      setMsg({t:'s',x:`✅ ${mode==='rachat'?`Total à payer : ${m} $`:`Encaissé : ${m} $`}`});
      setPanier([]);setCNom('');setCTel('');setCIban('');
      if(onSuccess)onSuccess();
    }else setMsg({t:'e',x:res.error||'Erreur.'});
  }

  return(
    <div style={{maxWidth:620,display:'flex',flexDirection:'column',gap:14}}>
      {/* Client */}
      <div className="card">
        <div className="card-title">Informations client</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label className="label">Nom & Prénom</label><input className="inp" value={cNom} onChange={e=>setCNom(e.target.value)} placeholder="Bob Smith"/></div>
          <div><label className="label">Téléphone</label><input className="inp" value={cTel} onChange={e=>setCTel(e.target.value)} placeholder="555-0123"/></div>
          {mode==='rachat'&&<div style={{gridColumn:'1/-1'}}><label className="label">IBAN</label><input className="inp" value={cIban} onChange={e=>setCIban(e.target.value)} placeholder="LS64321..."/></div>}
        </div>
      </div>

      {/* Sélection */}
      <div className="card">
        <div className="card-title">Ajouter un objet</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          {['', ...cats].map(c=><button key={c} onClick={()=>setCat(c)} className={`pill${cat===c?' on':''}`}>{c||'Tous'}</button>)}
        </div>
        <div style={{display:'flex',gap:8}}>
          <select className="inp" style={{flex:1}} value={sel} onChange={e=>setSel(e.target.value)}>
            <option value="">— Sélectionner un objet —</option>
            {list.map(o=><option key={o.nom} value={o.nom}>{o.nom} — {mode==='rachat'?o.prixAchat:o.prixRevente} $</option>)}
          </select>
          <input type="number" className="inp" style={{width:74,textAlign:'center'}} value={qty} min={1} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))}/>
          <button onClick={add} className="btn-ghost">+ Ajouter</button>
        </div>
      </div>

      {/* Panier */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div className="card-title" style={{margin:0}}>Panier</div>
          {panier.length>0&&<span style={{fontSize:12,padding:'3px 12px',borderRadius:20,background:'rgba(155,26,26,0.14)',border:'1px solid rgba(155,26,26,0.3)',color:'#f87171'}}>{panier.length} article{panier.length>1?'s':''}</span>}
        </div>
        {!panier.length
          ?<div style={{textAlign:'center',color:'var(--muted)',padding:'28px 0',fontSize:14}}>Le panier est vide</div>
          :<>
            {panier.map((item,i)=>(
              <div key={i} className="panier-item">
                <span style={{fontSize:14}}><span style={{color:'var(--muted)',fontFamily:'monospace'}}>{item.quantite}×</span> {item.objet}</span>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <span style={{color:'var(--p2)',fontFamily:'monospace',fontWeight:700}}>{(item.prix*item.quantite).toFixed(0)} $</span>
                  <button onClick={()=>setPanier(panier.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--p)',cursor:'pointer',fontSize:20,lineHeight:1,opacity:0.7}}>×</button>
                </div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid var(--glass-b)',paddingTop:14,marginTop:8}}>
              <span style={{color:'var(--muted)',fontSize:13}}>Total {mode==='rachat'?'à payer au client':'encaissé'}</span>
              <span style={{color:'var(--p)',fontSize:28,fontWeight:900,fontFamily:'monospace',textShadow:'0 0 20px var(--p-glow)'}}>{total.toFixed(0)} $</span>
            </div>
          </>
        }
      </div>

      {msg.x&&<div style={{background:msg.t==='s'?'rgba(16,185,129,0.08)':'rgba(155,26,26,0.1)',border:`1px solid ${msg.t==='s'?'rgba(16,185,129,0.25)':'rgba(155,26,26,0.3)'}`,borderRadius:12,padding:'12px 16px',fontSize:13,color:msg.t==='s'?'#10b981':'#f87171'}}>{msg.x}</div>}
      <button onClick={valider} disabled={loading||!panier.length} className="btn-p" style={{opacity:loading||!panier.length?0.4:1}}>
        {loading?'Enregistrement…':mode==='rachat'?'🚀 Valider le rachat':'🏷️ Valider la revente'}
      </button>
    </div>
  );
}

export default function Home(){
  const [view,setView]=useState('login');
  const [session,setSession]=useState(null);
  const [tab,setTab]=useState('dashboard');
  const [objets,setObjets]=useState([]);
  const [stats,setStats]=useState(null);
  const [employes,setEmployes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loginErr,setLoginErr]=useState('');
  const [user,setUser]=useState('');
  const [pass,setPass]=useState('');
  const [search,setSearch]=useState('');
  const [fGrade,setFGrade]=useState('');
  const [toast,setToast]=useState(null);

  function notify(text,ok=true){setToast({text,ok});setTimeout(()=>setToast(null),3500);}

  async function login(e){
    e.preventDefault();setLoading(true);setLoginErr('');
    const r=await api('login',{username:user,password:pass});
    setLoading(false);
    if(r.ok){setSession(r);setView('app');load(r);}
    else setLoginErr(r.error||'Identifiant ou mot de passe incorrect.');
  }

  async function load(s){
    const sx=s||session;
    const [o,st,em]=await Promise.all([api('objets'),api('stats',{nom:sx.nom,grade:sx.grade}),api('employes',{grade:sx.grade})]);
    setObjets(o);setStats(st);setEmployes(em);
  }

  const NAV=[
    {id:'dashboard',e:'📊',l:'Dashboard'},
    {id:'rachat',e:'🛍️',l:'Rachat'},
    {id:'revente',e:'🏷️',l:'Revente',r:true},
    {id:'annuaire',e:'👥',l:'Annuaire'},
    {id:'reglement',e:'📜',l:'Règlement'},
  ];
  const canRevente=GRADES_REVENTE.includes(session?.grade);
  const canAll=GRADES_STATS_ALL.includes(session?.grade);

  if(view==='login') return(
    <div className="app">
      <style jsx global>{CSS}</style>
      <div className="login-page">
        <div className="login-wrap">
          <div className="login-logo">
            <span className="login-icon">♟</span>
            <div className="login-name">PAWN<span>OPOLY</span></div>
            <div className="login-tagline">Buy · Sell · Loan</div>
            <div className="login-sep"/>
          </div>
          {loginErr&&<div className="err-box">{loginErr}</div>}
          <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:13}}>
            <div><label className="label">Identifiant</label><input className="inp" value={user} onChange={e=>setUser(e.target.value)} placeholder="john_doe" required/></div>
            <div><label className="label">Mot de passe</label><input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required/></div>
            <button type="submit" disabled={loading} className="btn-p" style={{marginTop:6,opacity:loading?0.6:1}}>{loading?'Connexion…':'Se connecter'}</button>
          </form>
          <div style={{textAlign:'center',marginTop:26,color:'var(--muted)',fontSize:11,letterSpacing:'0.06em'}}>PAWNOPOLY © 2025 — ACCÈS RÉSERVÉ</div>
        </div>
      </div>
    </div>
  );

  return(
    <div className="app">
      <style jsx global>{CSS}</style>

      {toast&&<div className="toast" style={{background:toast.ok?'rgba(16,185,129,0.12)':'rgba(155,26,26,0.15)',color:toast.ok?'#10b981':'#f87171',border:`1px solid ${toast.ok?'rgba(16,185,129,0.25)':'rgba(155,26,26,0.35)'}`}}>{toast.text}</div>}

      {/* DOCK */}
      <div className="dock-wrap">
        <div className="dock">
          <div className="dock-logo">
            <span className="dock-logo-icon">♟</span>
            <span className="dock-logo-text">PAWNOPOLY</span>
          </div>

          {NAV.map(n=>{
            if(n.r&&!canRevente)return null;
            return(
              <button key={n.id} onClick={()=>setTab(n.id)} className={`nav-btn${tab===n.id?' active':''}`}>
                <span className="nav-icon">{n.e}</span>
                <span className="nav-label">{n.l}</span>
              </button>
            );
          })}

          <div className="dock-footer">
            <div className="user-pill">
              <div className="user-avatar">{session?.nom?.[0]||'?'}</div>
              <div className="user-info">
                <span className="u-name">{session?.nom}</span>
                <span className="u-role">{session?.grade}</span>
              </div>
            </div>
            <button onClick={()=>{setSession(null);setView('login');}} className="logout-btn">
              <span className="nav-icon">🚪</span>
              <span className="nav-label">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="main">

        {/* ── DASHBOARD ── */}
        {tab==='dashboard'&&(
          <div className="fade-in">
            <div className="pg-title">Bonjour, {session?.nom} 👋</div>
            <div className="pg-sub">Votre tableau de bord</div>

            <div className="kpi-row">
              <div className="kpi"><div className="kpi-label">Bénéfices apportés</div><div className="kpi-val" style={{color:'var(--p2)'}}>{stats?.benefice?.toFixed(0)||0} $</div></div>
              <div className="kpi"><div className="kpi-label">Transactions</div><div className="kpi-val" style={{color:'var(--p)'}}>{stats?.transactions||0}</div></div>
              <div className="kpi"><div className="kpi-label">Objets rachetés</div><div className="kpi-val" style={{color:'#60a5fa'}}>{stats?.objetsRachetes||0}</div></div>
            </div>

            {stats?.history?.length>0&&(
              <div className="card" style={{marginBottom:16}}>
                <div className="card-title">Mes dernières transactions</div>
                <div className="bars">
                  {(()=>{const h=stats.history.slice(0,16);const mx=Math.max(...h.map(x=>x.benefice),1);return h.map((item,i)=><div key={i} className="bar-item" style={{height:`${Math.max(5,(item.benefice/mx)*100)}%`}} title={`${item.objet} — ${item.benefice} $`}/>);})()}
                </div>
              </div>
            )}

            {canAll&&stats?.classement?.length>0&&(
              <div className="card">
                <div className="card-title">🏆 Classement des employés</div>
                <table className="tbl">
                  <thead><tr><th style={{width:40}}>#</th><th>Employé</th><th>Grade</th><th style={{textAlign:'right'}}>Bénéfices</th><th style={{textAlign:'right'}}>Transactions</th></tr></thead>
                  <tbody>
                    {stats.classement.map((e,i)=>(
                      <tr key={e.nom}>
                        <td style={{color:'var(--muted)',fontWeight:700}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                        <td style={{fontWeight:700}}>{e.nom}</td>
                        <td><span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,0.05)',border:'1px solid var(--glass-b)',color:GRADE_COLORS[e.grade]||'var(--muted)',fontWeight:600}}>{e.grade}</span></td>
                        <td style={{textAlign:'right',color:'var(--p2)',fontFamily:'monospace',fontWeight:700}}>{e.benefice.toFixed(0)} $</td>
                        <td style={{textAlign:'right',color:'var(--muted)'}}>{e.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── RACHAT ── */}
        {tab==='rachat'&&(
          <div className="fade-in">
            <div className="pg-title">Rachat d'objets 🛍️</div>
            <div className="pg-sub">Enregistrer un nouveau rachat client</div>
            <PanierForm objets={objets} mode="rachat" employe={session?.nom} grade={session?.grade} onSuccess={()=>{load();notify('Rachat enregistré avec succès !');}}/>
          </div>
        )}

        {/* ── REVENTE ── */}
        {tab==='revente'&&canRevente&&(
          <div className="fade-in">
            <div className="pg-title">Revente d'objets 🏷️</div>
            <div className="pg-sub">Accès Responsable et supérieurs</div>
            <PanierForm objets={objets} mode="revente" employe={session?.nom} grade={session?.grade} onSuccess={()=>notify('Revente enregistrée !')}/>
          </div>
        )}

        {/* ── ANNUAIRE ── */}
        {tab==='annuaire'&&(
          <div className="fade-in">
            <div className="pg-title">Annuaire 👥</div>
            <div className="pg-sub">{employes.length} employé{employes.length>1?'s':''} enregistré{employes.length>1?'s':''}</div>
            <div style={{display:'flex',gap:10,marginBottom:18}}>
              <input className="inp" style={{flex:1}} placeholder="🔍 Rechercher un employé…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <select className="inp" style={{width:210}} value={fGrade} onChange={e=>setFGrade(e.target.value)}>
                <option value="">Tous les grades</option>
                {GRADES_ORDRE.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="emp-grid">
              {[...employes]
                .filter(e=>e.nom.toLowerCase().includes(search.toLowerCase())&&(fGrade?e.grade===fGrade:true))
                .sort((a,b)=>GRADES_ORDRE.indexOf(a.grade)-GRADES_ORDRE.indexOf(b.grade))
                .map(emp=>(
                  <div key={emp.username} className="emp-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,var(--p),#7a1414)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:15,color:'#fff',flexShrink:0,boxShadow:'0 4px 12px var(--p-glow)'}}>{emp.nom[0]}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{emp.nom}</div>
                          <div style={{color:'var(--muted)',fontSize:11}}>@{emp.username}</div>
                        </div>
                      </div>
                      <span style={{fontSize:10,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,0.05)',border:'1px solid var(--glass-b)',color:GRADE_COLORS[emp.grade]||'var(--muted)',fontWeight:700,letterSpacing:'0.03em',whiteSpace:'nowrap'}}>{emp.grade}</span>
                    </div>
                    <div style={{borderTop:'1px solid var(--glass-b)',paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'var(--muted)'}}>Téléphone</span><span style={{fontFamily:'monospace'}}>{emp.tel}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span style={{color:'var(--muted)'}}>IBAN</span><span style={{fontFamily:'monospace',fontSize:11}}>{emp.iban}</span></div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── RÈGLEMENT ── */}
        {tab==='reglement'&&(
          <div className="fade-in" style={{maxWidth:700}}>
            <div className="pg-title">Règlement Intérieur 📜</div>
            <div className="pg-sub">Document officiel — applicable à tous les employés</div>
            <div style={{background:'rgba(155,26,26,0.08)',border:'1px solid rgba(155,26,26,0.22)',borderRadius:14,padding:'12px 18px',color:'#f87171',fontSize:13,marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
              <span>⚠️</span><span>La lecture et le respect de ce règlement sont obligatoires pour tout employé du Pawnopoly.</span>
            </div>
            {[
              {t:'1. Comportement & Professionnalisme',p:['Toujours se présenter avec courtoisie et professionnalisme face aux clients.','Le vouvoiement est de mise lors des interactions avec les clients.','Tout comportement irrespectueux envers un client ou un collègue est passible de sanction.','La tenue vestimentaire doit être propre et adaptée à notre image.']},
              {t:'2. Gestion des Rachats',p:['Chaque rachat doit être enregistré via le dashboard dès la transaction.',"Vérifiez toujours l'identité du client (nom, téléphone, IBAN) avant d'enregistrer.",'Ne jamais racheter un objet à un prix non validé par la direction.',"En cas de doute sur la valeur d'un objet, contactez immédiatement un Responsable."]},
              {t:'3. Gestion des Reventes',p:['La revente est réservée aux grades Responsable et supérieurs.','Les prix de revente sont fixés par la direction et ne peuvent être modifiés sans accord.','Tout écart de caisse doit être signalé dans les 24h.']},
              {t:'4. Confidentialité',p:["Les informations clients (nom, téléphone, IBAN) sont strictement confidentielles.",'Il est interdit de partager ces données en dehors du cadre professionnel.','Les statistiques et bénéfices du shop ne doivent pas être divulgués à des tiers.']},
              {t:'5. Hiérarchie & Remontée d\'informations',p:['Respectez la chaîne : Commercial → Responsable → Manager → Co-Patronne → Patron.','Tout problème avec un client doit être remonté au grade supérieur disponible.','Les décisions de la direction sont finales et doivent être respectées.']},
              {t:'6. Sanctions',p:['Tout manquement peut entraîner un avertissement, une rétrogradation ou un licenciement.','Les fraudes ou malversations financières entraîneront un licenciement immédiat.','La direction se réserve le droit de modifier ce règlement à tout moment.']},
            ].map(s=>(
              <div key={s.t} className="reg">
                <div className="reg-h">{s.t}</div>
                <div className="reg-b">{s.p.map((p,i)=><div key={i} className="reg-p"><span style={{color:'var(--p)',flexShrink:0,fontWeight:700}}>›</span><span>{p}</span></div>)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

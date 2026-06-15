'use client';
import { useState, useEffect } from 'react';

const GRADES_ORDRE = ['Patron','Co-Patronne','Manager','Responsable','Commercial Expert','Commercial Confirmé','Commercial Débutant'];
const GRADES_REVENTE = ['Patron','Co-Patronne','Manager','Responsable'];
const GRADES_STATS_ALL = ['Patron','Co-Patronne','Manager'];
const GRADE_COLORS = {
  'Patron':'#c9a84c','Co-Patronne':'#b8860b','Manager':'#8b1a1a',
  'Responsable':'#6b2d8b','Commercial Expert':'#1a4a7a','Commercial Confirmé':'#1a6b6b','Commercial Débutant':'#4a4a6b',
};

async function api(action, data={}) {
  const res = await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});
  return res.json();
}

function PanierForm({objets,mode,employe,grade,onSuccess}) {
  const [clientNom,setClientNom]=useState('');
  const [clientTel,setClientTel]=useState('');
  const [clientIban,setClientIban]=useState('');
  const [objetSel,setObjetSel]=useState('');
  const [quantite,setQuantite]=useState(1);
  const [panier,setPanier]=useState([]);
  const [catFilter,setCatFilter]=useState('');
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState({type:'',text:''});

  const categories=[...new Set(objets.map(o=>o.categorie))].sort();
  const objetsFiltres=catFilter?objets.filter(o=>o.categorie===catFilter):objets;
  const objetsTries=[...objetsFiltres].sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
  const totalDisplay=panier.reduce((s,i)=>s+i.prix*i.quantite,0);

  function ajouterPanier(){
    if(!objetSel||quantite<1){setMsg({type:'err',text:'Sélectionnez un objet.'});return;}
    const obj=objets.find(o=>o.nom===objetSel);
    if(!obj)return;
    const prix=mode==='rachat'?obj.prixAchat:obj.prixRevente;
    const ex=panier.find(p=>p.objet===objetSel);
    if(ex)setPanier(panier.map(p=>p.objet===objetSel?{...p,quantite:p.quantite+quantite}:p));
    else setPanier([...panier,{objet:objetSel,quantite,prix}]);
    setObjetSel('');setQuantite(1);setMsg({type:'',text:''});
  }

  async function valider(){
    if(!clientNom||!clientTel||(mode==='rachat'&&!clientIban)){setMsg({type:'err',text:'Remplissez les infos client.'});return;}
    if(panier.length===0){setMsg({type:'err',text:'Panier vide.'});return;}
    setLoading(true);
    const res=await api(mode,{employe,grade,clientNom,clientTel,clientIban,articles:panier});
    setLoading(false);
    if(res.ok){
      const montant=res.totalDuClient??res.totalRevente??0;
      setMsg({type:'ok',text:`✅ Enregistré ! ${mode==='rachat'?`Total à payer : ${montant} $`:`Encaissé : ${montant} $`}`});
      setPanier([]);setClientNom('');setClientTel('');setClientIban('');
      if(onSuccess)onSuccess();
    }else{setMsg({type:'err',text:res.error||'Erreur.'});}
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:640}}>
      <div className="glass-card">
        <div className="card-title">Informations client</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label className="field-label">Nom & Prénom</label><input className="field-input" value={clientNom} onChange={e=>setClientNom(e.target.value)} placeholder="Bob Smith"/></div>
          <div><label className="field-label">Téléphone</label><input className="field-input" value={clientTel} onChange={e=>setClientTel(e.target.value)} placeholder="555-0123"/></div>
          {mode==='rachat'&&<div style={{gridColumn:'1/-1'}}><label className="field-label">IBAN</label><input className="field-input" value={clientIban} onChange={e=>setClientIban(e.target.value)} placeholder="LS64321..."/></div>}
        </div>
      </div>

      <div className="glass-card">
        <div className="card-title">Ajouter un objet</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          {['', ...categories].map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)} className={`cat-pill${catFilter===c?' active':''}`}>{c||'Tous'}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <select className="field-input" style={{flex:1}} value={objetSel} onChange={e=>setObjetSel(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {objetsTries.map(o=><option key={o.nom} value={o.nom}>{o.nom} ({mode==='rachat'?o.prixAchat:o.prixRevente} $)</option>)}
          </select>
          <input type="number" className="field-input" style={{width:70,textAlign:'center'}} value={quantite} min={1} onChange={e=>setQuantite(Math.max(1,parseInt(e.target.value)||1))}/>
          <button onClick={ajouterPanier} className="btn-ghost">+ Ajouter</button>
        </div>
      </div>

      <div className="glass-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div className="card-title" style={{margin:0}}>Panier</div>
          {panier.length>0&&<span style={{fontSize:12,color:'var(--accent)',background:'rgba(139,26,26,0.15)',padding:'3px 10px',borderRadius:20,border:'1px solid rgba(139,26,26,0.3)'}}>{panier.length} article{panier.length>1?'s':''}</span>}
        </div>
        {panier.length===0
          ?<div style={{textAlign:'center',color:'var(--muted)',padding:'24px 0',fontSize:14}}>Panier vide</div>
          :<>
            {panier.map((item,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'9px 14px',marginBottom:6,border:'1px solid var(--border)'}}>
                <span style={{fontSize:14}}><span style={{color:'var(--muted)',fontFamily:'monospace'}}>{item.quantite}×</span> {item.objet}</span>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{color:'var(--gold)',fontFamily:'monospace',fontWeight:700}}>{(item.prix*item.quantite).toFixed(0)} $</span>
                  <button onClick={()=>setPanier(panier.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:18,lineHeight:1,padding:0}}>×</button>
                </div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid var(--border)',paddingTop:12,marginTop:8}}>
              <span style={{color:'var(--muted)',fontSize:14}}>Total {mode==='rachat'?'à payer au client':'encaissé'}</span>
              <span style={{color:'var(--accent)',fontSize:26,fontWeight:900,fontFamily:'monospace'}}>{totalDisplay.toFixed(0)} $</span>
            </div>
          </>
        }
      </div>

      {msg.text&&<div style={{background:msg.type==='ok'?'rgba(16,185,129,0.1)':'rgba(139,26,26,0.12)',border:`1px solid ${msg.type==='ok'?'rgba(16,185,129,0.3)':'rgba(139,26,26,0.35)'}`,borderRadius:10,padding:'11px 16px',fontSize:14,color:msg.type==='ok'?'#10b981':'#f87171'}}>{msg.text}</div>}

      <button onClick={valider} disabled={loading||panier.length===0} className="btn-primary" style={{opacity:loading||panier.length===0?0.5:1,fontSize:16,padding:'14px 20px'}}>
        {loading?'Enregistrement…':mode==='rachat'?'🚀 Valider le rachat':'🏷️ Valider la revente'}
      </button>
    </div>
  );
}

export default function Home() {
  const [view,setView]=useState('login');
  const [session,setSession]=useState(null);
  const [tab,setTab]=useState('dashboard');
  const [objets,setObjets]=useState([]);
  const [stats,setStats]=useState(null);
  const [employes,setEmployes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loginErr,setLoginErr]=useState('');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [searchEmp,setSearchEmp]=useState('');
  const [filterGrade,setFilterGrade]=useState('');
  const [toast,setToast]=useState(null);

  function notify(text,type='success'){
    setToast({text,type});
    setTimeout(()=>setToast(null),3500);
  }

  async function handleLogin(e){
    e.preventDefault();setLoading(true);setLoginErr('');
    const res=await api('login',{username,password});
    setLoading(false);
    if(res.ok){setSession(res);setView('app');chargerDonnees(res);}
    else setLoginErr(res.error||'Erreur.');
  }

  async function chargerDonnees(sess){
    const s=sess||session;
    const [obj,st,emp]=await Promise.all([
      api('objets'),
      api('stats',{nom:s.nom,grade:s.grade}),
      api('employes',{grade:s.grade}),
    ]);
    setObjets(obj);setStats(st);setEmployes(emp);
  }

  const navItems=[
    {id:'dashboard',label:'Dashboard',emoji:'📊'},
    {id:'rachat',label:'Rachat',emoji:'🛍️'},
    {id:'revente',label:'Revente',emoji:'🏷️',restricted:true},
    {id:'annuaire',label:'Annuaire',emoji:'👥'},
    {id:'reglement',label:'Règlement',emoji:'📜'},
  ];

  const canRevente=GRADES_REVENTE.includes(session?.grade);
  const canSeeAll=GRADES_STATS_ALL.includes(session?.grade);

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if(view==='login') return (
    <div className="app">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
        :root {
          --bg: #0a0c10;
          --panel: rgba(15,18,25,0.85);
          --glass: rgba(255,255,255,0.03);
          --glass-b: rgba(255,255,255,0.07);
          --border: rgba(255,255,255,0.08);
          --txt: #f0ece4;
          --muted: #8a8070;
          --accent: #8b1a1a;
          --accent-light: #b52222;
          --gold: #c9a84c;
          --navy: #1a2744;
          --cream: #f5f0e8;
          --success: #10b981;
          --radius: 20px;
        }
        *{box-sizing:border-box;margin:0;padding:0;outline:none;-webkit-tap-highlight-color:transparent;}
        body{background:var(--bg);background-image:radial-gradient(at 15% 20%,rgba(139,26,26,0.07) 0,transparent 50%),radial-gradient(at 85% 80%,rgba(26,39,68,0.1) 0,transparent 50%);color:var(--txt);font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh;}
        .app{display:flex;height:100vh;width:100vw;position:relative;overflow:hidden;}

        /* DOCK */
        .dock-wrap{padding:16px;height:100vh;display:flex;align-items:center;flex-shrink:0;}
        .dock{width:76px;height:96vh;background:rgba(8,10,16,0.7);backdrop-filter:blur(24px);border:1px solid var(--glass-b);border-radius:32px;display:flex;flex-direction:column;align-items:center;padding:24px 0;transition:width 0.3s cubic-bezier(0.4,0,0.2,1);z-index:100;box-shadow:0 20px 60px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.05);overflow:hidden;}
        .dock:hover{width:220px;}
        .dock:hover .nav-label{opacity:1;transform:translateX(0);display:block;}
        .dock:hover .nav-icon{margin-right:12px;}
        .dock:hover .user-info{display:block;}
        .dock:hover .user-pill{width:85%;padding:10px 14px;border-radius:16px;height:auto;}

        .logo-box{margin-bottom:24px;width:46px;height:46px;display:flex;align-items:center;justify-content:center;transition:0.3s;}
        .dock:hover .logo-box{width:auto;height:auto;}
        .logo-text{font-size:22px;font-weight:900;letter-spacing:0.05em;color:var(--gold);white-space:nowrap;display:none;}
        .dock:hover .logo-text{display:block;}
        .logo-icon{font-size:22px;display:block;}
        .dock:hover .logo-icon{display:none;}

        .nav-btn{display:flex;align-items:center;justify-content:center;width:80%;padding:12px;margin-bottom:6px;border-radius:16px;border:1px solid transparent;background:transparent;color:var(--muted);cursor:pointer;transition:all 0.2s;position:relative;}
        .dock:hover .nav-btn{justify-content:flex-start;padding-left:18px;}
        .nav-icon{font-size:1.3rem;transition:0.3s;flex-shrink:0;}
        .nav-label{font-size:0.9rem;font-weight:700;opacity:0;transform:translateX(-8px);transition:0.3s;white-space:nowrap;display:none;}
        .nav-btn:hover{background:var(--glass);color:var(--txt);}
        .nav-btn.active{background:linear-gradient(135deg,var(--accent),#a52828);color:#fff;box-shadow:0 8px 24px rgba(139,26,26,0.35);border-color:transparent;}
        .nav-btn:active{transform:scale(0.96);}

        .dock-footer{margin-top:auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 8px;}
        .user-pill{background:rgba(0,0,0,0.4);border:1px solid var(--glass-b);padding:10px;border-radius:50px;display:flex;align-items:center;gap:10px;width:46px;height:46px;overflow:hidden;transition:all 0.3s;cursor:pointer;}
        .user-avatar{width:28px;height:28px;background:linear-gradient(135deg,var(--accent),#a52828);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;flex-shrink:0;font-size:12px;}
        .user-info{display:none;white-space:nowrap;}
        .u-name{font-size:0.78rem;font-weight:800;display:block;color:var(--txt);}
        .u-role{font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;}
        .logout-btn{background:none;border:none;color:var(--muted);cursor:pointer;padding:8px;border-radius:12px;font-size:1.2rem;transition:0.2s;width:80%;}
        .logout-btn:hover{background:rgba(139,26,26,0.15);color:var(--accent);}

        /* MAIN */
        .main{flex:1;overflow-y:auto;padding:36px;scroll-behavior:smooth;}
        .main::-webkit-scrollbar{width:4px;}
        .main::-webkit-scrollbar-track{background:transparent;}
        .main::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
        .fade-in{animation:fadeIn 0.35s cubic-bezier(0.2,0.8,0.2,1);}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

        /* CARDS */
        .glass-card{background:rgba(12,15,22,0.6);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:var(--radius);padding:22px;margin-bottom:0;}
        .glass-card:hover{border-color:rgba(255,255,255,0.12);}
        .card-title{font-size:15px;font-weight:700;color:var(--txt);margin-bottom:16px;letter-spacing:0.01em;}

        /* KPI */
        .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
        .kpi-card{background:rgba(12,15,22,0.7);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;transition:0.2s;}
        .kpi-card:hover{border-color:rgba(201,168,76,0.3);transform:translateY(-1px);}
        .kpi-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;}
        .kpi-value{font-size:28px;font-weight:900;font-family:monospace;letter-spacing:-0.02em;}

        /* TABLE */
        .data-table{width:100%;border-collapse:collapse;font-size:14px;}
        .data-table th{text-align:left;padding:10px 12px;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--border);}
        .data-table td{padding:12px;border-bottom:1px solid rgba(255,255,255,0.04);}
        .data-table tr:hover td{background:rgba(255,255,255,0.02);}

        /* FORM */
        .field-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px;display:block;}
        .field-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--txt);font-size:14px;box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;}
        .field-input:focus{border-color:rgba(139,26,26,0.5);background:rgba(139,26,26,0.05);}
        .field-input option{background:#0a0c10;}

        /* BUTTONS */
        .btn-primary{background:linear-gradient(135deg,var(--accent),#a52828);border:none;border-radius:12px;color:#fff;font-weight:800;font-size:14px;padding:11px 18px;cursor:pointer;width:100%;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;letter-spacing:0.02em;box-shadow:0 6px 20px rgba(139,26,26,0.3);}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(139,26,26,0.4);}
        .btn-primary:active{transform:scale(0.98);}
        .btn-ghost{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:10px;color:var(--txt);font-weight:600;font-size:13px;padding:10px 16px;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;}
        .btn-ghost:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.14);}

        /* PILLS */
        .cat-pill{font-size:12px;padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;transition:0.2s;font-family:'Plus Jakarta Sans',sans-serif;}
        .cat-pill.active,.cat-pill:hover{background:rgba(139,26,26,0.15);border-color:rgba(139,26,26,0.4);color:#f87171;}
        .grade-pill{font-size:11px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.06);border:1px solid var(--border);font-weight:600;letter-spacing:0.03em;}

        /* BADGE RANG */
        .rank-badge{font-size:11px;padding:2px 8px;border-radius:20px;background:linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05));border:1px solid rgba(201,168,76,0.25);color:var(--gold);font-weight:700;}

        /* TOAST */
        .toast{position:fixed;top:28px;left:50%;transform:translateX(-50%);padding:13px 28px;border-radius:50px;z-index:9999;animation:toastIn 0.45s cubic-bezier(0.175,0.885,0.32,1.275) forwards;box-shadow:0 16px 40px rgba(0,0,0,0.7);display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px;backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);}
        @keyframes toastIn{from{transform:translate(-50%,-120%);opacity:0;}70%{transform:translate(-50%,6px);}to{transform:translate(-50%,0);opacity:1;}}
        .toast-success{background:rgba(16,185,129,0.15);color:#10b981;border-color:rgba(16,185,129,0.3);}
        .toast-error{background:rgba(139,26,26,0.2);color:#f87171;border-color:rgba(139,26,26,0.4);}

        /* BAR CHART */
        .bar-wrap{display:flex;align-items:flex-end;gap:6px;height:120px;padding-top:16px;}
        .bar{flex:1;background:linear-gradient(to top,var(--accent),rgba(139,26,26,0.4));border-radius:6px 6px 0 0;min-height:4px;transition:0.3s;position:relative;}
        .bar:hover{background:linear-gradient(to top,var(--accent-light),rgba(165,40,40,0.5));}
        .bar-label{font-size:9px;color:var(--muted);text-align:center;margin-top:4px;}

        /* ANNUAIRE */
        .emp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;}
        .emp-card{background:rgba(12,15,22,0.6);border:1px solid var(--border);border-radius:var(--radius);padding:18px;transition:0.2s;}
        .emp-card:hover{border-color:rgba(201,168,76,0.2);transform:translateY(-1px);}

        /* RÈGLEMENT */
        .reg-section{background:rgba(12,15,22,0.6);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:10px;}
        .reg-header{background:rgba(26,39,68,0.4);padding:14px 20px;font-weight:700;font-size:14px;border-bottom:1px solid var(--border);}
        .reg-body{padding:16px 20px;display:flex;flex-direction:column;gap:10px;}
        .reg-point{display:flex;gap:10px;font-size:13px;color:var(--muted);}

        /* LOGIN PAGE */
        .login-page{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:radial-gradient(at 20% 30%,rgba(139,26,26,0.08) 0,transparent 50%),radial-gradient(at 80% 70%,rgba(26,39,68,0.12) 0,transparent 50%);}
        .login-card{background:rgba(10,12,18,0.9);border:1px solid var(--glass-b);border-radius:28px;padding:44px 40px;width:380px;backdrop-filter:blur(20px);box-shadow:0 32px 80px rgba(0,0,0,0.7);}
        .login-logo{text-align:center;margin-bottom:36px;}
        .login-logo-icon{font-size:48px;display:block;margin-bottom:10px;}
        .login-title{font-size:28px;font-weight:900;letter-spacing:0.1em;color:var(--cream);}
        .login-sub{font-size:11px;color:var(--muted);letter-spacing:0.12em;text-transform:uppercase;margin-top:4px;}
        .login-divider{width:40px;height:2px;background:linear-gradient(90deg,var(--accent),var(--gold));margin:16px auto 0;border-radius:2px;}
        .login-form{display:flex;flex-direction:column;gap:14px;}
        .login-err{background:rgba(139,26,26,0.12);border:1px solid rgba(139,26,26,0.35);border-radius:10px;padding:11px 16px;color:#f87171;font-size:13px;}
        .page-title{font-size:30px;font-weight:900;letter-spacing:0.02em;margin-bottom:4px;}
        .page-sub{color:var(--muted);font-size:14px;margin-bottom:24px;}
      `}</style>

      <div className="login-page">
        <div className="login-card fade-in">
          <div className="login-logo">
            <span className="login-logo-icon">♟</span>
            <div className="login-title">PAWNOPOLY</div>
            <div className="login-sub">Espace Employé</div>
            <div className="login-divider"></div>
          </div>

          {loginErr&&<div className="login-err" style={{marginBottom:14}}>{loginErr}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div><label className="field-label">Identifiant</label><input className="field-input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="john_doe" required/></div>
            <div><label className="field-label">Mot de passe</label><input className="field-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/></div>
            <button type="submit" disabled={loading} className="btn-primary" style={{marginTop:6,padding:'13px 20px',fontSize:15,opacity:loading?0.6:1}}>
              {loading?'Connexion…':'Se connecter'}
            </button>
          </form>

          <div style={{textAlign:'center',marginTop:24,color:'var(--muted)',fontSize:12,opacity:0.6}}>Pawnopoly © 2025 — Accès réservé</div>
        </div>
      </div>
    </div>
  );

  // ── APP ────────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
        :root{--bg:#0a0c10;--panel:rgba(15,18,25,0.85);--glass:rgba(255,255,255,0.03);--glass-b:rgba(255,255,255,0.07);--border:rgba(255,255,255,0.08);--txt:#f0ece4;--muted:#8a8070;--accent:#8b1a1a;--accent-light:#b52222;--gold:#c9a84c;--navy:#1a2744;--cream:#f5f0e8;--success:#10b981;--radius:20px;}
        *{box-sizing:border-box;margin:0;padding:0;outline:none;-webkit-tap-highlight-color:transparent;}
        body{background:var(--bg);background-image:radial-gradient(at 15% 20%,rgba(139,26,26,0.07) 0,transparent 50%),radial-gradient(at 85% 80%,rgba(26,39,68,0.1) 0,transparent 50%);color:var(--txt);font-family:'Plus Jakarta Sans',sans-serif;height:100vh;overflow:hidden;}
        .app{display:flex;height:100vh;width:100vw;position:relative;}
        .dock-wrap{padding:16px;height:100vh;display:flex;align-items:center;flex-shrink:0;}
        .dock{width:76px;height:96vh;background:rgba(8,10,16,0.7);backdrop-filter:blur(24px);border:1px solid var(--glass-b);border-radius:32px;display:flex;flex-direction:column;align-items:center;padding:24px 0;transition:width 0.3s cubic-bezier(0.4,0,0.2,1);z-index:100;box-shadow:0 20px 60px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.05);overflow:hidden;}
        .dock:hover{width:220px;}
        .dock:hover .nav-label{opacity:1;transform:translateX(0);display:block;}
        .dock:hover .nav-icon{margin-right:12px;}
        .dock:hover .user-info{display:block;}
        .dock:hover .user-pill{width:85%;padding:10px 14px;border-radius:16px;height:auto;}
        .logo-box{margin-bottom:24px;display:flex;align-items:center;justify-content:center;padding:0 12px;}
        .logo-icon{font-size:22px;flex-shrink:0;}
        .logo-text{font-size:14px;font-weight:900;letter-spacing:0.06em;color:var(--gold);white-space:nowrap;opacity:0;transform:translateX(-8px);transition:0.3s;display:none;margin-left:10px;}
        .dock:hover .logo-text{opacity:1;transform:translateX(0);display:block;}
        .nav-btn{display:flex;align-items:center;justify-content:center;width:80%;padding:12px;margin-bottom:6px;border-radius:16px;border:1px solid transparent;background:transparent;color:var(--muted);cursor:pointer;transition:all 0.2s;}
        .dock:hover .nav-btn{justify-content:flex-start;padding-left:18px;}
        .nav-icon{font-size:1.3rem;transition:0.3s;flex-shrink:0;}
        .nav-label{font-size:0.9rem;font-weight:700;opacity:0;transform:translateX(-8px);transition:0.3s;white-space:nowrap;display:none;}
        .nav-btn:hover{background:var(--glass);color:var(--txt);}
        .nav-btn.active{background:linear-gradient(135deg,var(--accent),#a52828);color:#fff;box-shadow:0 8px 24px rgba(139,26,26,0.35);}
        .nav-btn:active{transform:scale(0.96);}
        .dock-footer{margin-top:auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 8px;}
        .user-pill{background:rgba(0,0,0,0.4);border:1px solid var(--glass-b);padding:10px;border-radius:50px;display:flex;align-items:center;gap:10px;width:46px;height:46px;overflow:hidden;transition:all 0.3s;}
        .user-avatar{width:28px;height:28px;background:linear-gradient(135deg,var(--accent),#a52828);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;flex-shrink:0;font-size:12px;}
        .user-info{display:none;white-space:nowrap;}
        .u-name{font-size:0.78rem;font-weight:800;display:block;color:var(--txt);}
        .u-role{font-size:0.65rem;color:var(--muted);text-transform:uppercase;}
        .logout-btn{background:none;border:none;color:var(--muted);cursor:pointer;padding:10px;border-radius:12px;font-size:1.2rem;transition:0.2s;width:80%;display:flex;align-items:center;justify-content:center;}
        .dock:hover .logout-btn{justify-content:flex-start;padding-left:18px;}
        .logout-btn:hover{background:rgba(139,26,26,0.15);color:#f87171;}
        .main{flex:1;overflow-y:auto;padding:36px;scroll-behavior:smooth;}
        .main::-webkit-scrollbar{width:4px;}
        .main::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
        .fade-in{animation:fadeIn 0.35s cubic-bezier(0.2,0.8,0.2,1);}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .glass-card{background:rgba(12,15,22,0.6);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:var(--radius);padding:22px;}
        .card-title{font-size:15px;font-weight:700;color:var(--txt);margin-bottom:16px;}
        .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
        .kpi-card{background:rgba(12,15,22,0.7);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;transition:0.2s;}
        .kpi-card:hover{border-color:rgba(201,168,76,0.3);transform:translateY(-1px);}
        .kpi-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;}
        .kpi-value{font-size:28px;font-weight:900;font-family:monospace;}
        .data-table{width:100%;border-collapse:collapse;font-size:14px;}
        .data-table th{text-align:left;padding:10px 12px;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--border);}
        .data-table td{padding:12px;border-bottom:1px solid rgba(255,255,255,0.04);}
        .data-table tr:hover td{background:rgba(255,255,255,0.02);}
        .field-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px;display:block;}
        .field-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--txt);font-size:14px;box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;}
        .field-input:focus{border-color:rgba(139,26,26,0.5);background:rgba(139,26,26,0.05);}
        .field-input option{background:#0a0c10;}
        .btn-primary{background:linear-gradient(135deg,var(--accent),#a52828);border:none;border-radius:12px;color:#fff;font-weight:800;font-size:14px;padding:11px 18px;cursor:pointer;width:100%;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;box-shadow:0 6px 20px rgba(139,26,26,0.3);}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(139,26,26,0.4);}
        .btn-ghost{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:10px;color:var(--txt);font-weight:600;font-size:13px;padding:10px 16px;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;}
        .btn-ghost:hover{background:rgba(255,255,255,0.08);}
        .cat-pill{font-size:12px;padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;transition:0.2s;font-family:'Plus Jakarta Sans',sans-serif;}
        .cat-pill.active,.cat-pill:hover{background:rgba(139,26,26,0.15);border-color:rgba(139,26,26,0.4);color:#f87171;}
        .grade-pill{font-size:11px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.06);border:1px solid var(--border);font-weight:600;}
        .emp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;}
        .emp-card{background:rgba(12,15,22,0.6);border:1px solid var(--border);border-radius:var(--radius);padding:18px;transition:0.2s;}
        .emp-card:hover{border-color:rgba(201,168,76,0.2);transform:translateY(-1px);}
        .reg-section{background:rgba(12,15,22,0.6);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:10px;}
        .reg-header{background:rgba(26,39,68,0.4);padding:14px 20px;font-weight:700;font-size:14px;border-bottom:1px solid var(--border);}
        .reg-body{padding:16px 20px;display:flex;flex-direction:column;gap:10px;}
        .reg-point{display:flex;gap:10px;font-size:13px;color:var(--muted);}
        .toast{position:fixed;top:28px;left:50%;transform:translateX(-50%);padding:13px 28px;border-radius:50px;z-index:9999;animation:toastIn 0.45s cubic-bezier(0.175,0.885,0.32,1.275) forwards;box-shadow:0 16px 40px rgba(0,0,0,0.7);display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px;backdrop-filter:blur(16px);}
        @keyframes toastIn{from{transform:translate(-50%,-120%);opacity:0;}70%{transform:translate(-50%,6px);}to{transform:translate(-50%,0);opacity:1;}}
        .page-title{font-size:30px;font-weight:900;letter-spacing:0.01em;margin-bottom:4px;}
        .page-sub{color:var(--muted);font-size:14px;margin-bottom:24px;}
        .bar-wrap{display:flex;align-items:flex-end;gap:5px;height:100px;}
        .bar{flex:1;background:linear-gradient(to top,var(--accent),rgba(139,26,26,0.3));border-radius:5px 5px 0 0;min-height:3px;transition:height 0.5s;}
        .bar:hover{background:linear-gradient(to top,var(--accent-light),rgba(165,40,40,0.5));}
      `}</style>

      {toast&&<div className={`toast ${toast.type==='ok'?'':''}` } style={{background:toast.type==='ok'?'rgba(16,185,129,0.15)':'rgba(139,26,26,0.2)',color:toast.type==='ok'?'#10b981':'#f87171',border:`1px solid ${toast.type==='ok'?'rgba(16,185,129,0.3)':'rgba(139,26,26,0.4)'}`}}>{toast.text}</div>}

      {/* DOCK */}
      <div className="dock-wrap">
        <div className="dock">
          <div className="logo-box">
            <span className="logo-icon">♟</span>
            <span className="logo-text">PAWNOPOLY</span>
          </div>

          {navItems.map(item=>{
            if(item.restricted&&!canRevente)return null;
            return(
              <button key={item.id} onClick={()=>setTab(item.id)} className={`nav-btn${tab===item.id?' active':''}`}>
                <span className="nav-icon">{item.emoji}</span>
                <span className="nav-label">{item.label}</span>
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
              <span className="nav-label" style={{opacity:1,display:'none'}}>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="main">

        {/* DASHBOARD */}
        {tab==='dashboard'&&(
          <div className="fade-in">
            <div className="page-title">Bonjour, {session?.nom} 👋</div>
            <div className="page-sub">Tableau de bord</div>

            <div className="kpi-grid">
              <div className="kpi-card"><div className="kpi-label">Bénéfices apportés</div><div className="kpi-value" style={{color:'var(--gold)'}}>{stats?.benefice?.toFixed(0)||0} $</div></div>
              <div className="kpi-card"><div className="kpi-label">Transactions</div><div className="kpi-value" style={{color:'var(--accent-light)'}}>{stats?.transactions||0}</div></div>
              <div className="kpi-card"><div className="kpi-label">Objets rachetés</div><div className="kpi-value" style={{color:'#60a5fa'}}>{stats?.objetsRachetes||0}</div></div>
            </div>

            {stats?.history?.length>0&&(
              <div className="glass-card" style={{marginBottom:16}}>
                <div className="card-title">Mes dernières transactions</div>
                <div className="bar-wrap">
                  {stats.history.slice(0,14).map((h,i)=>{
                    const max=Math.max(...stats.history.slice(0,14).map(x=>x.benefice),1);
                    return <div key={i} className="bar" style={{height:`${Math.max(4,(h.benefice/max)*100)}%`}} title={`${h.objet} — ${h.benefice} $`}/>;
                  })}
                </div>
              </div>
            )}

            {canSeeAll&&stats?.classement&&(
              <div className="glass-card">
                <div className="card-title">🏆 Classement des employés</div>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Employé</th><th>Grade</th><th style={{textAlign:'right'}}>Bénéfices</th><th style={{textAlign:'right'}}>Transactions</th></tr></thead>
                  <tbody>
                    {stats.classement.map((e,i)=>(
                      <tr key={e.nom}>
                        <td style={{color:'var(--muted)',width:40}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                        <td style={{fontWeight:700}}>{e.nom}</td>
                        <td><span className="grade-pill" style={{color:GRADE_COLORS[e.grade]||'var(--muted)'}}>{e.grade}</span></td>
                        <td style={{textAlign:'right',color:'var(--gold)',fontFamily:'monospace',fontWeight:700}}>{e.benefice.toFixed(0)} $</td>
                        <td style={{textAlign:'right',color:'var(--muted)'}}>{e.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RACHAT */}
        {tab==='rachat'&&(
          <div className="fade-in">
            <div className="page-title">Rachat d'objets 🛍️</div>
            <div className="page-sub">Enregistrer un nouveau rachat client</div>
            <PanierForm objets={objets} mode="rachat" employe={session?.nom} grade={session?.grade} onSuccess={()=>{chargerDonnees();notify('Rachat enregistré !','ok');}}/>
          </div>
        )}

        {/* REVENTE */}
        {tab==='revente'&&canRevente&&(
          <div className="fade-in">
            <div className="page-title">Revente d'objets 🏷️</div>
            <div className="page-sub">Accès Responsable et supérieurs uniquement</div>
            <PanierForm objets={objets} mode="revente" employe={session?.nom} grade={session?.grade} onSuccess={()=>{notify('Revente enregistrée !','ok');}}/>
          </div>
        )}

        {/* ANNUAIRE */}
        {tab==='annuaire'&&(
          <div className="fade-in">
            <div className="page-title">Annuaire 👥</div>
            <div className="page-sub">{employes.length} employé{employes.length>1?'s':''}</div>
            <div style={{display:'flex',gap:10,marginBottom:18}}>
              <input className="field-input" style={{flex:1}} placeholder="🔍 Rechercher…" value={searchEmp} onChange={e=>setSearchEmp(e.target.value)}/>
              <select className="field-input" style={{width:210}} value={filterGrade} onChange={e=>setFilterGrade(e.target.value)}>
                <option value="">Tous les grades</option>
                {GRADES_ORDRE.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="emp-grid">
              {[...employes]
                .filter(e=>e.nom.toLowerCase().includes(searchEmp.toLowerCase())&&(filterGrade?e.grade===filterGrade:true))
                .sort((a,b)=>GRADES_ORDRE.indexOf(a.grade)-GRADES_ORDRE.indexOf(b.grade))
                .map(emp=>(
                  <div key={emp.username} className="emp-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),#a52828)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:'#fff',flexShrink:0}}>{emp.nom[0]}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14}}>{emp.nom}</div>
                          <div style={{color:'var(--muted)',fontSize:11,marginTop:1}}>@{emp.username}</div>
                        </div>
                      </div>
                      <span className="grade-pill" style={{color:GRADE_COLORS[emp.grade]||'var(--muted)'}}>{emp.grade}</span>
                    </div>
                    <div style={{borderTop:'1px solid var(--border)',paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'var(--muted)'}}>Téléphone</span><span style={{fontFamily:'monospace'}}>{emp.tel}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}><span style={{color:'var(--muted)'}}>IBAN</span><span style={{fontFamily:'monospace',fontSize:11}}>{emp.iban}</span></div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* RÈGLEMENT */}
        {tab==='reglement'&&(
          <div className="fade-in" style={{maxWidth:720}}>
            <div className="page-title">Règlement Intérieur 📜</div>
            <div className="page-sub">Document officiel — applicable à tous les employés</div>
            <div style={{background:'rgba(139,26,26,0.08)',border:'1px solid rgba(139,26,26,0.25)',borderRadius:12,padding:'12px 18px',color:'#f87171',fontSize:13,marginBottom:16}}>
              ⚠️ La lecture et le respect de ce règlement sont obligatoires pour tout employé.
            </div>
            {[
              {titre:'1. Comportement & Professionnalisme',points:['Toujours se présenter avec courtoisie et professionnalisme face aux clients.','Le vouvoiement est de mise lors des interactions avec les clients.','Tout comportement irrespectueux envers un client ou un collègue est passible de sanction.','La tenue vestimentaire doit être propre et adaptée à notre image.']},
              {titre:'2. Gestion des Rachats',points:['Chaque rachat doit être enregistré via le dashboard dès la transaction.',"Vérifiez toujours l'identité du client (nom, téléphone, IBAN) avant d'enregistrer.",'Ne jamais racheter un objet à un prix non validé par la direction.',"En cas de doute sur la valeur d'un objet, contacter immédiatement un Responsable."]},
              {titre:'3. Gestion des Reventes',points:['La revente est réservée aux grades Responsable et supérieurs.','Les prix de revente sont fixés par la direction et ne peuvent être modifiés sans accord.','Tout écart de caisse doit être signalé dans les 24h.']},
              {titre:'4. Confidentialité',points:["Les informations des clients (nom, téléphone, IBAN) sont strictement confidentielles.",'Il est interdit de partager ces données en dehors du cadre professionnel.','Les statistiques et bénéfices du shop ne doivent pas être divulgués à des tiers.']},
              {titre:'5. Hiérarchie',points:['Respectez la chaîne hiérarchique : Commercial → Responsable → Manager → Co-Patronne → Patron.','Tout problème avec un client doit être remonté au grade supérieur disponible.','Les décisions de la direction sont finales et doivent être respectées.']},
              {titre:'6. Sanctions',points:['Tout manquement au règlement peut entraîner un avertissement, une rétrogradation ou un licenciement.','Les fraudes ou malversations financières entraîneront un licenciement immédiat.','La direction se réserve le droit de modifier ce règlement à tout moment.']},
            ].map(s=>(
              <div key={s.titre} className="reg-section">
                <div className="reg-header">{s.titre}</div>
                <div className="reg-body">{s.points.map((p,i)=><div key={i} className="reg-point"><span style={{color:'var(--accent)',flexShrink:0}}>›</span><span>{p}</span></div>)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

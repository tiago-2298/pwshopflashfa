'use client';
import { useState, useEffect, useRef } from 'react';

const GRADES_ORDRE  = ['Patron','Co-Patronne','Responsable','Commercial Expert','Commercial Confirmé','Commercial Débutant'];
const GRADES_REVENTE= ['Patron','Co-Patronne'];
const GRADES_ADMIN  = ['Patron','Co-Patronne'];
const GRADES_STATS  = ['Patron','Co-Patronne','Responsable'];
const GRADE_COLORS  = {
  'Patron':'#d4af37','Co-Patronne':'#c9a84c',
  'Responsable':'#8e44ad','Commercial Expert':'#2980b9',
  'Commercial Confirmé':'#16a085','Commercial Débutant':'#7f8c8d'
};
const PAIE_LABEL = {
  'Patron':'Base fixe','Co-Patronne':'Base fixe',
  'Responsable':'Base + 45%','Commercial Expert':'33% des bénéfices',
  'Commercial Confirmé':'30% des bénéfices','Commercial Débutant':'27% des bénéfices'
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
:root{
  --p:#9b1a1a;--p2:#c9a84c;--p-glow:rgba(155,26,26,0.28);
  --bg:#040508;--panel:rgba(14,16,22,0.75);
  --glass:rgba(255,255,255,0.025);--glass-b:rgba(255,255,255,0.07);
  --txt:#eee8dc;--muted:#6e6a60;--radius:22px;
  --ok:#10b981;--err:#ef4444;
}
*{box-sizing:border-box;margin:0;padding:0;outline:none;-webkit-tap-highlight-color:transparent;}
body{background:var(--bg);background-image:radial-gradient(at 5% 10%,rgba(155,26,26,0.08) 0,transparent 50%),radial-gradient(at 95% 90%,rgba(26,39,68,0.1) 0,transparent 50%);color:var(--txt);height:100vh;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;}
.app{display:flex;height:100vh;width:100vw;}
.dock-wrap{padding:16px;height:100vh;display:flex;align-items:center;flex-shrink:0;}
.dock{width:82px;height:96vh;background:rgba(6,7,12,0.7);backdrop-filter:blur(28px);border:1px solid var(--glass-b);border-radius:36px;display:flex;flex-direction:column;align-items:center;padding:26px 0;transition:width 0.3s cubic-bezier(0.4,0,0.2,1);z-index:100;box-shadow:0 24px 60px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04);overflow:hidden;}
.dock:hover{width:230px;}
.dock:hover .nl{opacity:1;transform:translateX(0);display:block;}
.dock:hover .ni{margin-right:13px;}
.dock:hover .ui{display:block;}
.dock:hover .up{width:86%;padding:10px 14px;border-radius:18px;height:auto;}
.dock:hover .lt{opacity:1;display:block;}
.dl{margin-bottom:24px;display:flex;align-items:center;padding:0 10px;min-height:34px;}
.li{font-size:20px;flex-shrink:0;filter:drop-shadow(0 0 8px rgba(201,168,76,0.35));}
.lt{display:none;opacity:0;transition:0.3s;white-space:nowrap;margin-left:11px;font-size:13px;font-weight:900;letter-spacing:0.1em;color:var(--p2);}
.nb{display:flex;align-items:center;justify-content:center;width:80%;padding:11px;margin-bottom:4px;border-radius:16px;border:1px solid transparent;background:transparent;color:var(--muted);cursor:pointer;transition:all 0.22s;overflow:hidden;}
.dock:hover .nb{justify-content:flex-start;padding-left:18px;}
.ni{font-size:1.25rem;transition:0.22s;flex-shrink:0;}
.nl{font-size:0.87rem;font-weight:700;opacity:0;transform:translateX(-10px);transition:0.22s;white-space:nowrap;display:none;}
.nb:hover{background:var(--glass);color:var(--txt);}
.nb.on{background:linear-gradient(135deg,var(--p),#7a1414);color:#fff;box-shadow:0 8px 24px var(--p-glow);}
.nb:active{transform:scale(0.95);}
.df{margin-top:auto;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 8px;}
.up{background:rgba(0,0,0,0.4);border:1px solid var(--glass-b);padding:10px;border-radius:50px;display:flex;align-items:center;gap:10px;width:46px;height:46px;overflow:hidden;transition:all 0.3s;}
.ua{width:30px;height:30px;background:linear-gradient(135deg,var(--p),#7a1414);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;flex-shrink:0;font-size:13px;box-shadow:0 4px 12px var(--p-glow);}
.ui{display:none;white-space:nowrap;}
.un{font-size:0.77rem;font-weight:800;display:block;color:var(--txt);}
.ur{font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;}
.lob{background:none;border:none;color:var(--muted);cursor:pointer;padding:10px;border-radius:14px;transition:0.2s;width:80%;display:flex;align-items:center;justify-content:center;}
.dock:hover .lob{justify-content:flex-start;padding-left:18px;}
.lob:hover{background:rgba(155,26,26,0.12);color:#f87171;}
.main{flex:1;overflow-y:auto;padding:36px;scroll-behavior:smooth;}
.main::-webkit-scrollbar{width:4px;}
.main::-webkit-scrollbar-thumb{background:var(--glass-b);border-radius:4px;}
.fi{animation:fi 0.35s cubic-bezier(0.2,0.8,0.2,1);}
@keyframes fi{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes pop{from{opacity:0;transform:scale(0.9);}50%{transform:scale(1.02);}to{opacity:1;transform:scale(1);}}
.toast{position:fixed;top:24px;left:50%;z-index:9999;padding:13px 26px;border-radius:50px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px;backdrop-filter:blur(20px);box-shadow:0 20px 50px rgba(0,0,0,0.75);border:1px solid rgba(255,255,255,0.08);animation:tb 0.48s cubic-bezier(0.175,0.885,0.32,1.275) forwards;}
@keyframes tb{0%{transform:translate(-50%,-130%);opacity:0;}70%{transform:translate(-50%,7px);}100%{transform:translate(-50%,0);opacity:1;}}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;}
.modal{background:rgba(10,12,18,0.96);border:1px solid var(--glass-b);border-radius:28px;padding:34px;width:440px;max-width:92vw;box-shadow:0 40px 80px rgba(0,0,0,0.8);animation:pop 0.35s ease;position:relative;overflow:hidden;}
.modal::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--p),var(--p2),transparent);}
.card{background:var(--panel);border:1px solid var(--glass-b);border-radius:var(--radius);padding:22px;position:relative;overflow:hidden;transition:border-color 0.2s;}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--p),var(--p2),transparent);opacity:0;transition:0.3s;}
.card:hover::before{opacity:1;}
.ct{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;}
.kr{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:16px;}
.kc{background:rgba(8,10,16,0.85);border:1px solid var(--glass-b);border-radius:20px;padding:18px 20px;transition:0.22s;}
.kc:hover{border-color:rgba(201,168,76,0.2);transform:translateY(-2px);}
.kl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.09em;margin-bottom:7px;}
.kv{font-size:26px;font-weight:900;letter-spacing:-0.02em;}
.tbl{width:100%;border-collapse:collapse;font-size:13px;}
.tbl th{text-align:left;padding:9px 12px;color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid var(--glass-b);}
.tbl td{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,0.03);}
.tbl tr:hover td{background:var(--glass);}
.lbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;display:block;font-weight:700;}
.inp{width:100%;padding:11px 15px;border-radius:13px;border:1px solid var(--glass-b);background:rgba(0,0,0,0.3);color:var(--txt);font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;transition:0.22s;box-sizing:border-box;}
.inp:focus{border-color:rgba(155,26,26,0.5);background:rgba(155,26,26,0.04);box-shadow:0 0 0 3px rgba(155,26,26,0.08);}
.inp option{background:#08090f;}
.bp{background:linear-gradient(135deg,var(--p),#7a1414);border:none;border-radius:13px;color:#fff;font-weight:800;font-size:14px;padding:12px 18px;cursor:pointer;width:100%;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:0.02em;transition:0.22s;box-shadow:0 7px 22px var(--p-glow);text-transform:uppercase;}
.bp:hover{transform:translateY(-2px);box-shadow:0 12px 30px var(--p-glow);}
.bp:active{transform:scale(0.97);}
.bp:disabled{background:rgba(255,255,255,0.04);color:var(--muted);box-shadow:none;cursor:not-allowed;transform:none;}
.bg{background:var(--glass);border:1px solid var(--glass-b);border-radius:12px;color:var(--txt);font-weight:600;font-size:13px;padding:10px 15px;cursor:pointer;white-space:nowrap;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;}
.bg:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);}
.pill{font-size:12px;padding:5px 12px;border-radius:20px;border:1px solid var(--glass-b);background:transparent;color:var(--muted);cursor:pointer;transition:0.2s;font-family:'Plus Jakarta Sans',sans-serif;}
.pill.on,.pill:hover{background:rgba(155,26,26,0.13);border-color:rgba(155,26,26,0.38);color:#f87171;}
.pi{display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.22);border:1px solid var(--glass-b);border-radius:11px;padding:10px 14px;margin-bottom:6px;}
.eg{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:13px;}
.ec{background:var(--panel);border:1px solid var(--glass-b);border-radius:20px;padding:18px;transition:0.22s;cursor:pointer;}
.ec:hover{border-color:rgba(201,168,76,0.18);transform:translateY(-1px);}
.atab{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
.at{padding:8px 17px;border-radius:20px;border:1px solid var(--glass-b);background:transparent;color:var(--muted);cursor:pointer;font-size:13px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;transition:0.2s;}
.at.on{background:linear-gradient(135deg,var(--p),#7a1414);color:#fff;border-color:transparent;box-shadow:0 6px 18px var(--p-glow);}
.reg{background:var(--panel);border:1px solid var(--glass-b);border-radius:20px;overflow:hidden;margin-bottom:10px;}
.rh{background:rgba(26,39,68,0.3);padding:13px 20px;font-weight:800;font-size:13px;border-bottom:1px solid var(--glass-b);}
.rb{padding:14px 20px;display:flex;flex-direction:column;gap:9px;}
.rp{display:flex;gap:9px;font-size:13px;color:var(--muted);line-height:1.6;}
.pg{font-size:30px;font-weight:900;letter-spacing:-0.01em;margin-bottom:4px;}
.ps{color:var(--muted);font-size:14px;margin-bottom:22px;}
.srch{position:relative;}
.srch input{padding-left:36px;}
.srch::before{content:'🔍';position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;z-index:1;}

/* Fiche de paie */
.paie-card{background:linear-gradient(135deg,rgba(155,26,26,0.08),rgba(201,168,76,0.05));border:1px solid rgba(201,168,76,0.2);border-radius:20px;padding:22px;margin-bottom:16px;}
.paie-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);}
.paie-row:last-child{border:none;padding-top:12px;margin-top:4px;}
.paie-total{font-size:28px;font-weight:900;color:var(--p2);font-family:monospace;}

.lp{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;}
.lw{background:rgba(6,7,12,0.88);backdrop-filter:blur(32px);border:1px solid var(--glass-b);border-radius:34px;padding:48px 42px;width:385px;box-shadow:0 40px 90px rgba(0,0,0,0.75);position:relative;overflow:hidden;animation:pop 0.45s ease;}
.lw::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--p),var(--p2),transparent);}
`;

async function api(action,data={}){
  const r=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});
  return r.json();
}

function ObjetSelector({objets,onAdd,mode}){
  const [search,setSearch]=useState('');
  const [cat,setCat]=useState('');
  const [sel,setSel]=useState('');
  const [qty,setQty]=useState(1);
  const cats=[...new Set(objets.map(o=>o.categorie))].sort();
  const filtered=objets.filter(o=>(!cat||o.categorie===cat)&&(!search||o.nom.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
  const selObj=objets.find(o=>o.nom===sel);
  const prix=selObj?(mode==='rachat'?selObj.prixAchat:mode==='rachatPart'?selObj.prixPartenaire:mode==='revente'?selObj.prixRevente:selObj.prixVente||selObj.prixRevente):0;
  const benefice=selObj?(mode==='rachat'?selObj.beneficeStd:mode==='rachatPart'?selObj.beneficePart:mode==='vente'?(selObj.prixVente-selObj.prixAchat):0):0;

  function handleAdd(){
    if(!sel||qty<1)return;
    onAdd({objet:sel,quantite:qty,prix});
    setSel('');setQty(1);
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {['', ...cats].map(c=><button key={c} onClick={()=>setCat(c)} className={`pill${cat===c?' on':''}`}>{c||'Tous'}</button>)}
      </div>
      <div className="srch"><input className="inp" placeholder="Rechercher un objet…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:180}}>
          <select className="inp" value={sel} onChange={e=>setSel(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {filtered.map(o=><option key={o.nom} value={o.nom}>{o.nom}</option>)}
          </select>
        </div>
        {sel&&(
          <div style={{display:'flex',gap:8}}>
            <div style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.22)',borderRadius:10,padding:'10px 13px',fontSize:12,color:'var(--p2)',fontWeight:700,fontFamily:'monospace',textAlign:'center'}}>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>Prix</div>
              {prix} $
            </div>
            {benefice>0&&<div style={{background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:10,padding:'10px 13px',fontSize:12,color:'var(--ok)',fontWeight:700,fontFamily:'monospace',textAlign:'center'}}>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>Bénéf.</div>
              {benefice} $
            </div>}
          </div>
        )}
        <input type="number" className="inp" style={{width:70,textAlign:'center'}} value={qty} min={1} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))}/>
        <button onClick={handleAdd} disabled={!sel} className="bg">+ Ajouter</button>
      </div>
    </div>
  );
}

function ConfirmModal({data,onConfirm,onCancel}){
  if(!data)return null;
  return(
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:38,marginBottom:10}}>🔐</div>
          <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>{data.titre}</div>
          <div style={{color:'var(--muted)',fontSize:14,lineHeight:1.6}}>{data.texte}</div>
        </div>
        <div style={{background:'rgba(0,0,0,0.3)',borderRadius:13,padding:14,marginBottom:18,fontSize:13,display:'flex',flexDirection:'column',gap:6}}>{data.details}</div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onCancel} className="bg" style={{flex:1,padding:'12px'}}>Annuler</button>
          <button onClick={onConfirm} className="bp" style={{flex:1}}>✅ Confirmer</button>
        </div>
      </div>
    </div>
  );
}

function TransactionModule({title,subtitle,objets,mode,employe,grade,partenaires,onSuccess}){
  const [cNom,setCNom]=useState('');
  const [cTel,setCTel]=useState('');
  const [cIban,setCIban]=useState('');
  const [entreprise,setEntreprise]=useState('');
  const [panier,setPanier]=useState([]);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState({t:'',x:''});
  const [confirm,setConfirm]=useState(null);

  const total=panier.reduce((s,i)=>s+i.prix*i.quantite,0);
  const needClient=mode==='rachat'||mode==='vente';
  const needIban=mode==='rachat';
  const needEntreprise=mode==='rachatPart';

  function addToCart(item){
    const ex=panier.find(p=>p.objet===item.objet);
    if(ex)setPanier(panier.map(p=>p.objet===item.objet?{...p,quantite:p.quantite+item.quantite}:p));
    else setPanier([...panier,item]);
  }

  function demanderValidation(){
    if(needClient&&(!cNom||!cTel)){setMsg({t:'e',x:'Remplissez les infos client.'});return;}
    if(needIban&&!cIban){setMsg({t:'e',x:'IBAN requis.'});return;}
    if(needEntreprise&&!entreprise){setMsg({t:'e',x:'Sélectionnez une entreprise.'});return;}
    if(!panier.length){setMsg({t:'e',x:'Panier vide.'});return;}
    setConfirm({
      titre:'Confirmer la transaction',
      texte:`Validation du ${mode==='rachat'?'rachat standard':mode==='rachatPart'?'rachat partenaire':mode==='revente'?'revente':'vente catalogue'}.`,
      details:<>
        {needClient&&<div>👤 Client : <strong>{cNom}</strong> — {cTel}</div>}
        {needEntreprise&&<div>🏢 Entreprise : <strong>{entreprise}</strong></div>}
        <div>📦 {panier.length} article{panier.length>1?'s':''} — <strong style={{color:'var(--p2)'}}>{total.toFixed(0)} $</strong></div>
      </>,
    });
  }

  async function valider(){
    setConfirm(null);setLoading(true);
    const payload={employe,grade,articles:panier};
    if(needClient){payload.clientNom=cNom;payload.clientTel=cTel;}
    if(needIban)payload.clientIban=cIban;
    if(needEntreprise)payload.entreprise=entreprise;
    const actionMap={rachat:'rachat',rachatPart:'rachatPartenaire',revente:'revente',vente:'vente'};
    const res=await api(actionMap[mode],payload);
    setLoading(false);
    if(res.ok){
      const m=res.totalDuClient??res.total??0;
      setMsg({t:'s',x:`✅ Validé ! Total : ${m.toFixed(0)} $`});
      setPanier([]);setCNom('');setCTel('');setCIban('');setEntreprise('');
      if(onSuccess)onSuccess();
    }else setMsg({t:'e',x:res.error||'Erreur serveur.'});
  }

  return(
    <div className="fi">
      <div className="pg">{title}</div>
      <div className="ps">{subtitle}</div>
      <ConfirmModal data={confirm} onConfirm={valider} onCancel={()=>setConfirm(null)}/>
      <div style={{maxWidth:640,display:'flex',flexDirection:'column',gap:14}}>
        {(needClient||needEntreprise)&&(
          <div className="card">
            <div className="ct">{needEntreprise?'Entreprise partenaire':'Informations client'}</div>
            {needEntreprise
              ?<select className="inp" value={entreprise} onChange={e=>setEntreprise(e.target.value)}>
                <option value="">— Sélectionner l'entreprise —</option>
                {partenaires.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              :<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label className="lbl">Nom & Prénom</label><input className="inp" value={cNom} onChange={e=>setCNom(e.target.value)} placeholder="Bob Smith"/></div>
                <div><label className="lbl">Téléphone</label><input className="inp" value={cTel} onChange={e=>setCTel(e.target.value)} placeholder="555-0123"/></div>
                {needIban&&<div style={{gridColumn:'1/-1'}}><label className="lbl">IBAN</label><input className="inp" value={cIban} onChange={e=>setCIban(e.target.value)} placeholder="LS64321..."/></div>}
              </div>
            }
          </div>
        )}
        <div className="card">
          <div className="ct">Ajouter un objet</div>
          <ObjetSelector objets={objets} onAdd={addToCart} mode={mode}/>
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:13}}>
            <div className="ct" style={{margin:0}}>Panier</div>
            {panier.length>0&&<span style={{fontSize:12,padding:'3px 10px',borderRadius:20,background:'rgba(155,26,26,0.13)',border:'1px solid rgba(155,26,26,0.28)',color:'#f87171'}}>{panier.length} article{panier.length>1?'s':''}</span>}
          </div>
          {!panier.length
            ?<div style={{textAlign:'center',color:'var(--muted)',padding:'24px 0',fontSize:14}}>Panier vide</div>
            :<>
              {panier.map((item,i)=>(
                <div key={i} className="pi">
                  <span style={{fontSize:14}}><span style={{color:'var(--muted)',fontFamily:'monospace'}}>{item.quantite}×</span> {item.objet}</span>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{color:'var(--p2)',fontFamily:'monospace',fontWeight:700}}>{(item.prix*item.quantite).toFixed(0)} $</span>
                    <button onClick={()=>setPanier(panier.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--p)',cursor:'pointer',fontSize:20,lineHeight:1,opacity:0.7}}>×</button>
                  </div>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid var(--glass-b)',paddingTop:13,marginTop:8}}>
                <span style={{color:'var(--muted)',fontSize:13}}>Total</span>
                <span style={{color:'var(--p)',fontSize:26,fontWeight:900,fontFamily:'monospace',textShadow:'0 0 20px var(--p-glow)'}}>{total.toFixed(0)} $</span>
              </div>
            </>
          }
        </div>
        {msg.x&&<div style={{background:msg.t==='s'?'rgba(16,185,129,0.07)':'rgba(155,26,26,0.09)',border:`1px solid ${msg.t==='s'?'rgba(16,185,129,0.22)':'rgba(155,26,26,0.28)'}`,borderRadius:12,padding:'11px 16px',fontSize:13,color:msg.t==='s'?'#10b981':'#f87171'}}>{msg.x}</div>}
        <button onClick={demanderValidation} disabled={loading||!panier.length} className="bp" style={{opacity:loading||!panier.length?0.4:1,padding:'14px',fontSize:15}}>
          {loading?'Enregistrement…':{rachat:'🚀 Valider le rachat',rachatPart:'🤝 Valider le rachat partenaire',revente:'🔄 Valider la revente',vente:'🏪 Valider la vente'}[mode]}
        </button>
      </div>
    </div>
  );
}

function AdminForm({fields,onSubmit,btnLabel}){
  const init=Object.fromEntries(fields.map(f=>[f.key,f.default||'']));
  const [form,setForm]=useState(init);
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState('');
  async function submit(e){
    e.preventDefault();setLoading(true);setMsg('');
    const r=await onSubmit(form);setLoading(false);
    if(r?.ok){setMsg('✅ Ajouté avec succès !');setForm(init);}
    else setMsg('❌ '+(r?.error||'Erreur.'));
  }
  return(
    <form onSubmit={submit} style={{maxWidth:500,display:'flex',flexDirection:'column',gap:12}}>
      {fields.map(f=>(
        <div key={f.key}>
          <label className="lbl">{f.label}</label>
          {f.type==='select'
            ?<select className="inp" value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} required={f.required}>
              <option value="">— Choisir —</option>
              {f.options.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            :<input className="inp" type={f.type||'text'} placeholder={f.placeholder} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} required={f.required}/>
          }
        </div>
      ))}
      {msg&&<div style={{fontSize:13,padding:'10px 14px',borderRadius:11,background:msg.startsWith('✅')?'rgba(16,185,129,0.07)':'rgba(155,26,26,0.09)',border:`1px solid ${msg.startsWith('✅')?'rgba(16,185,129,0.2)':'rgba(155,26,26,0.25)'}`,color:msg.startsWith('✅')?'#10b981':'#f87171'}}>{msg}</div>}
      <button type="submit" disabled={loading} className="bp" style={{opacity:loading?0.6:1}}>{loading?'Enregistrement…':btnLabel}</button>
    </form>
  );
}

export default function Home(){
  const [view,setView]=useState('login');
  const [session,setSession]=useState(null);
  const [tab,setTab]=useState('dashboard');
  const [objets,setObjets]=useState([]);
  const [catalogue,setCatalogue]=useState([]);
  const [partenaires,setPartenaires]=useState([]);
  const [stats,setStats]=useState(null);
  const [employes,setEmployes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loginErr,setLoginErr]=useState('');
  const [user,setUser]=useState('');
  const [pass,setPass]=useState('');
  const [toast,setToast]=useState(null);
  const [empModal,setEmpModal]=useState(null);
  const [adminTab,setAdminTab]=useState('employes');
  const [search,setSearch]=useState('');
  const [fGrade,setFGrade]=useState('');
  const timerRef=useRef(null);

  useEffect(()=>{
    if(view!=='app')return;
    const reset=()=>{
      clearTimeout(timerRef.current);
      timerRef.current=setTimeout(()=>{notify('Session expirée après 8h','err');logout();},8*60*60*1000);
    };
    reset();
    window.addEventListener('mousemove',reset);
    window.addEventListener('keydown',reset);
    return()=>{clearTimeout(timerRef.current);window.removeEventListener('mousemove',reset);window.removeEventListener('keydown',reset);};
  },[view]);

  function notify(text,t='ok'){setToast({text,t});setTimeout(()=>setToast(null),3500);}

  async function login(e){
    e.preventDefault();setLoading(true);setLoginErr('');
    const r=await api('login',{username:user,password:pass});
    setLoading(false);
    if(r.ok){setSession(r);setView('app');loadAll(r);}
    else setLoginErr(r.error||'Identifiant ou mot de passe incorrect.');
  }

  async function loadAll(s){
    const sx=s||session;
    const [o,c,p,st,em]=await Promise.all([
      api('objets'),api('catalogue'),api('partenaires'),
      api('stats',{nom:sx.nom,grade:sx.grade}),
      api('employes',{grade:sx.grade}),
    ]);
    setObjets(Array.isArray(o)?o:[]);
    setCatalogue(Array.isArray(c)?c:[]);
    setPartenaires(Array.isArray(p)?p:[]);
    setStats(st);
    setEmployes(Array.isArray(em)?em:[]);
  }

  function logout(){setSession(null);setView('login');setUser('');setPass('');}

  const canRevente=GRADES_REVENTE.includes(session?.grade);
  const canAdmin=GRADES_ADMIN.includes(session?.grade);
  const canStats=GRADES_STATS.includes(session?.grade);

  const NAV=[
    {id:'dashboard',e:'📊',l:'Dashboard'},
    {id:'rachat',e:'🛍️',l:'Rachat Standard'},
    {id:'rachatPart',e:'🤝',l:'Rachat Partenaire'},
    {id:'vente',e:'🏪',l:'Vente Catalogue'},
    {id:'revente',e:'🔄',l:'Revente',r:'revente'},
    {id:'annuaire',e:'👥',l:'Annuaire'},
    {id:'admin',e:'⚙️',l:'Administration',r:'admin'},
    {id:'reglement',e:'📜',l:'Règlement'},
  ];

  if(view==='login') return(
    <div className="app"><style jsx global>{CSS}</style>
      <div className="lp">
        <div className="lw">
          <div style={{textAlign:'center',marginBottom:36}}>
            <div style={{fontSize:46,marginBottom:10,filter:'drop-shadow(0 0 16px rgba(201,168,76,0.3))'}}>♟</div>
            <div style={{fontSize:25,fontWeight:900,letterSpacing:'0.12em'}}>PAWN<span style={{color:'var(--p2)'}}>OPOLY</span></div>
            <div style={{fontSize:10,color:'var(--muted)',letterSpacing:'0.2em',textTransform:'uppercase',marginTop:4}}>Buy · Sell · Loan</div>
            <div style={{width:32,height:2,background:'linear-gradient(90deg,var(--p),var(--p2))',margin:'11px auto 0',borderRadius:2}}/>
          </div>
          {loginErr&&<div style={{background:'rgba(155,26,26,0.1)',border:'1px solid rgba(155,26,26,0.3)',borderRadius:12,padding:'11px 15px',color:'#f87171',fontSize:13,marginBottom:14}}>{loginErr}</div>}
          <form onSubmit={login} style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label className="lbl">Identifiant</label><input className="inp" value={user} onChange={e=>setUser(e.target.value)} placeholder="john_doe" required/></div>
            <div><label className="lbl">Mot de passe</label><input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required/></div>
            <button type="submit" disabled={loading} className="bp" style={{marginTop:6,padding:'13px',fontSize:15,opacity:loading?0.6:1}}>{loading?'Connexion…':'Se connecter'}</button>
          </form>
          <div style={{textAlign:'center',marginTop:22,color:'var(--muted)',fontSize:11,letterSpacing:'0.06em'}}>PAWNOPOLY © 2025 — ACCÈS RÉSERVÉ</div>
        </div>
      </div>
    </div>
  );

  return(
    <div className="app"><style jsx global>{CSS}</style>
      {toast&&<div className="toast" style={{background:toast.t==='ok'?'rgba(16,185,129,0.12)':'rgba(155,26,26,0.15)',color:toast.t==='ok'?'#10b981':'#f87171',border:`1px solid ${toast.t==='ok'?'rgba(16,185,129,0.25)':'rgba(155,26,26,0.35)'}`}}>{toast.text}</div>}

      {/* Modal fiche employé */}
      {empModal&&(
        <div className="overlay" onClick={()=>setEmpModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
              <div style={{position:'relative'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,var(--p),#7a1414)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:20,color:'#fff',boxShadow:'0 4px 14px var(--p-glow)'}}>{empModal.nom[0]}</div>
                <div style={{position:'absolute',bottom:0,right:0,width:12,height:12,borderRadius:'50%',background:empModal.isOnline?'var(--ok)':'var(--muted)',border:'2px solid #0a0c12'}}/>
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:17,marginBottom:4}}>{empModal.nom}</div>
                <span style={{fontSize:11,padding:'2px 9px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid var(--glass-b)',color:GRADE_COLORS[empModal.grade]||'var(--muted)',fontWeight:700}}>{empModal.grade}</span>
              </div>
              <div style={{marginLeft:'auto',fontSize:12,color:empModal.isOnline?'var(--ok)':'var(--muted)'}}>{empModal.isOnline?'🟢 En ligne':'⚫ Hors ligne'}</div>
            </div>

            {/* Fiche de paie */}
            <div className="paie-card">
              <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14,fontWeight:700}}>
                💰 Fiche de paie — Semaine en cours
              </div>
              {empModal.paie?.base>0&&(
                <div className="paie-row">
                  <span style={{color:'var(--muted)',fontSize:13}}>Salaire de base</span>
                  <span style={{fontFamily:'monospace',fontWeight:700}}>{empModal.paie.base.toLocaleString()} $</span>
                </div>
              )}
              <div className="paie-row">
                <span style={{color:'var(--muted)',fontSize:13}}>Bénéfices rapportés</span>
                <span style={{fontFamily:'monospace',fontWeight:700}}>{empModal.benefTotalSemaine?.toFixed(0)||0} $</span>
              </div>
              {empModal.paie?.taux>0&&(
                <div className="paie-row">
                  <span style={{color:'var(--muted)',fontSize:13}}>Commission ({Math.round((empModal.paie.taux||0)*100)}%)</span>
                  <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--ok)'}}>{empModal.paie.commission?.toFixed(0)||0} $</span>
                </div>
              )}
              <div className="paie-row" style={{borderTop:'1px solid rgba(201,168,76,0.2)',marginTop:4}}>
                <span style={{fontWeight:800,fontSize:14}}>Total à percevoir</span>
                <span className="paie-total">{empModal.paie?.total?.toLocaleString()||0} $</span>
              </div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:10,textAlign:'center'}}>{PAIE_LABEL[empModal.grade]||''}</div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <div className="kc"><div className="kl">Bénéfices totaux</div><div className="kv" style={{color:'var(--p2)',fontSize:20}}>{empModal.beneficeTotal?.toFixed(0)||0} $</div></div>
              <div className="kc"><div className="kl">Transactions</div><div className="kv" style={{color:'var(--p)',fontSize:20}}>{empModal.transactions||0}</div></div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:13,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)'}}>Téléphone</span><span style={{fontFamily:'monospace'}}>{empModal.tel}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)'}}>IBAN</span><span style={{fontFamily:'monospace',fontSize:11}}>{empModal.iban}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)'}}>Dernière connexion</span><span style={{fontSize:12}}>{empModal.derniereConnexion}</span></div>
            </div>
            <button onClick={()=>setEmpModal(null)} className="bg" style={{width:'100%',padding:'11px'}}>Fermer</button>
          </div>
        </div>
      )}

      {/* DOCK */}
      <div className="dock-wrap">
        <div className="dock">
          <div className="dl"><span className="li">♟</span><span className="lt">PAWNOPOLY</span></div>
          {NAV.map(n=>{
            if(n.r==='revente'&&!canRevente)return null;
            if(n.r==='admin'&&!canAdmin)return null;
            return(
              <button key={n.id} onClick={()=>setTab(n.id)} className={`nb${tab===n.id?' on':''}`}>
                <span className="ni">{n.e}</span><span className="nl">{n.l}</span>
              </button>
            );
          })}
          <div className="df">
            <div className="up">
              <div className="ua">{session?.nom?.[0]||'?'}</div>
              <div className="ui"><span className="un">{session?.nom}</span><span className="ur">{session?.grade}</span></div>
            </div>
            <button onClick={()=>{clearTimeout(timerRef.current);logout();}} className="lob">
              <span className="ni">🚪</span><span className="nl">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <main className="main">

        {/* DASHBOARD */}
        {tab==='dashboard'&&(
          <div className="fi">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
              <div className="pg">Bonjour, {session?.nom} 👋</div>
              <button onClick={()=>loadAll()} className="bg">🔄 Sync</button>
            </div>
            <div className="ps">Semaine du {stats?.semaine?.debut} au {stats?.semaine?.fin}</div>

            {/* Fiche de paie personnelle */}
            {stats?.paie&&(
              <div className="paie-card" style={{marginBottom:16}}>
                <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14,fontWeight:700}}>💰 Ma fiche de paie — semaine en cours</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {stats.paie.base>0&&<div><div className="kl">Base</div><div style={{fontWeight:800,fontSize:18,fontFamily:'monospace'}}>{stats.paie.base.toLocaleString()} $</div></div>}
                  <div><div className="kl">Bénéf. rapportés</div><div style={{fontWeight:800,fontSize:18,fontFamily:'monospace',color:'var(--ok)'}}>{stats.benefTotalSemaine?.toFixed(0)||0} $</div></div>
                  {stats.paie.taux>0&&<div><div className="kl">Commission ({Math.round(stats.paie.taux*100)}%)</div><div style={{fontWeight:800,fontSize:18,fontFamily:'monospace',color:'var(--ok)'}}>{stats.paie.commission?.toFixed(0)||0} $</div></div>}
                </div>
                <div style={{borderTop:'1px solid rgba(201,168,76,0.2)',marginTop:14,paddingTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:800,fontSize:14}}>Total à percevoir cette semaine</span>
                  <span className="paie-total">{stats.paie.total?.toLocaleString()||0} $</span>
                </div>
              </div>
            )}

            <div className="kr">
              <div className="kc"><div className="kl">Bénéfices totaux</div><div className="kv" style={{color:'var(--p2)'}}>{stats?.benefice?.toFixed(0)||0} $</div></div>
              <div className="kc">
                <div className="kl">Cette semaine {stats?.evoBenef!=null&&<span style={{color:stats.evoBenef>=0?'var(--ok)':'var(--err)',fontSize:11,marginLeft:4}}>{stats.evoBenef>=0?'↑':'↓'}{Math.abs(stats.evoBenef)}%</span>}</div>
                <div className="kv" style={{color:'var(--p)'}}>{stats?.benefSemaine?.toFixed(0)||0} $</div>
              </div>
              <div className="kc"><div className="kl">Objets rachetés</div><div className="kv" style={{color:'#60a5fa'}}>{stats?.objetsRachetes||0}</div></div>
            </div>

            {stats?.topObjet&&stats.topObjet!=='—'&&(
              <div className="card" style={{marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
                <div style={{fontSize:30}}>🏆</div>
                <div><div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>Objet le + racheté ce mois</div><div style={{fontWeight:800,fontSize:15}}>{stats.topObjet}</div></div>
              </div>
            )}

            {canStats&&stats?.caGlobal!=null&&(
              <div className="kc" style={{marginBottom:14}}><div className="kl">💵 CA Global du shop</div><div className="kv" style={{color:'var(--p2)'}}>{stats.caGlobal.toFixed(0)} $</div></div>
            )}

            {stats?.history?.length>0&&(
              <div className="card" style={{marginBottom:14}}>
                <div className="ct">Mes 10 dernières transactions</div>
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Objet</th><th>Type</th><th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>Bénéfice</th></tr></thead>
                  <tbody>
                    {stats.history.slice(0,10).map((h,i)=>(
                      <tr key={i}>
                        <td style={{color:'var(--muted)',fontSize:12}}>{h.date}</td>
                        <td style={{fontWeight:600}}>{h.objet}</td>
                        <td><span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,0.05)',border:'1px solid var(--glass-b)',color:'var(--muted)'}}>{h.type||'rachat'}</span></td>
                        <td style={{textAlign:'right',fontFamily:'monospace'}}>{h.totalClient?.toFixed(0)||0} $</td>
                        <td style={{textAlign:'right',color:'var(--p2)',fontFamily:'monospace',fontWeight:700}}>{h.benefice?.toFixed(0)||0} $</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canStats&&stats?.classement?.length>0&&(
              <div className="card">
                <div className="ct">🏆 Classement des employés</div>
                <table className="tbl">
                  <thead><tr><th style={{width:36}}>#</th><th>Employé</th><th>Grade</th><th style={{textAlign:'right'}}>Bénéfices</th><th style={{textAlign:'right'}}>Tx</th></tr></thead>
                  <tbody>
                    {stats.classement.map((e,i)=>(
                      <tr key={e.nom}>
                        <td style={{color:'var(--muted)',fontWeight:700}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                        <td style={{fontWeight:700}}>{e.nom}</td>
                        <td><span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,0.05)',border:'1px solid var(--glass-b)',color:GRADE_COLORS[e.grade]||'var(--muted)',fontWeight:700}}>{e.grade}</span></td>
                        <td style={{textAlign:'right',color:'var(--p2)',fontFamily:'monospace',fontWeight:700}}>{e.benefice?.toFixed(0)||0} $</td>
                        <td style={{textAlign:'right',color:'var(--muted)'}}>{e.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab==='rachat'&&<TransactionModule title="Rachat Standard 🛍️" subtitle="Rachat classique d'un objet client" objets={objets} mode="rachat" employe={session?.nom} grade={session?.grade} partenaires={partenaires} onSuccess={()=>{loadAll();notify('Rachat enregistré !');}}/>}
        {tab==='rachatPart'&&<TransactionModule title="Rachat Partenaire 🤝" subtitle="Prix majoré pour les entreprises partenaires" objets={objets} mode="rachatPart" employe={session?.nom} grade={session?.grade} partenaires={partenaires} onSuccess={()=>{loadAll();notify('Rachat partenaire enregistré !');}}/>}
        {tab==='vente'&&<TransactionModule title="Vente Catalogue 🏪" subtitle="Vendre les produits du catalogue" objets={catalogue} mode="vente" employe={session?.nom} grade={session?.grade} partenaires={partenaires} onSuccess={()=>{loadAll();notify('Vente enregistrée !');}}/>}
        {tab==='revente'&&canRevente&&<TransactionModule title="Revente Interne 🔄" subtitle="Patron / Co-Patronne uniquement" objets={objets} mode="revente" employe={session?.nom} grade={session?.grade} partenaires={partenaires} onSuccess={()=>notify('Revente enregistrée !')}/>}

        {/* ANNUAIRE */}
        {tab==='annuaire'&&(
          <div className="fi">
            <div className="pg">Annuaire 👥</div>
            <div className="ps">{employes.length} employé{employes.length>1?'s':''}</div>
            <div style={{display:'flex',gap:10,marginBottom:18}}>
              <div className="srch" style={{flex:1}}><input className="inp" placeholder="Rechercher un employé…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <select className="inp" style={{width:210}} value={fGrade} onChange={e=>setFGrade(e.target.value)}>
                <option value="">Tous les grades</option>
                {GRADES_ORDRE.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="eg">
              {[...employes]
                .filter(e=>e.nom.toLowerCase().includes(search.toLowerCase())&&(fGrade?e.grade===fGrade:true))
                .sort((a,b)=>GRADES_ORDRE.indexOf(a.grade)-GRADES_ORDRE.indexOf(b.grade))
                .map(emp=>(
                  <div key={emp.username} className="ec" onClick={()=>setEmpModal(emp)}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{position:'relative'}}>
                          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--p),#7a1414)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:'#fff',boxShadow:'0 4px 12px var(--p-glow)'}}>{emp.nom[0]}</div>
                          <div style={{position:'absolute',bottom:0,right:0,width:9,height:9,borderRadius:'50%',background:emp.isOnline?'var(--ok)':'var(--muted)',border:'2px solid var(--bg)'}}/>
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14}}>{emp.nom}</div>
                          <div style={{color:'var(--muted)',fontSize:11,marginTop:1}}>@{emp.username}</div>
                        </div>
                      </div>
                      <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,0.05)',border:'1px solid var(--glass-b)',color:GRADE_COLORS[emp.grade]||'var(--muted)',fontWeight:700,whiteSpace:'nowrap'}}>{emp.grade}</span>
                    </div>
                    <div style={{borderTop:'1px solid var(--glass-b)',paddingTop:9,display:'flex',justifyContent:'space-between',fontSize:12}}>
                      <span style={{color:'var(--p2)',fontFamily:'monospace',fontWeight:700}}>{emp.paie?.total?.toLocaleString()||0} $ <span style={{color:'var(--muted)',fontWeight:400,fontFamily:'sans-serif'}}>/ sem.</span></span>
                      <span style={{color:emp.isOnline?'var(--ok)':'var(--muted)'}}>{emp.isOnline?'🟢':'⚫'} {emp.transactions||0} tx</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ADMIN */}
        {tab==='admin'&&canAdmin&&(
          <div className="fi">
            <div className="pg">Administration ⚙️</div>
            <div className="ps">Gestion des employés, objets, catalogue et partenaires</div>
            <div className="atab">
              {[{id:'employes',l:'👤 Employés'},{id:'objets',l:'📦 Objets'},{id:'catalogue',l:'🏪 Catalogue'},{id:'partenaires',l:'🤝 Partenaires'}].map(a=>(
                <button key={a.id} onClick={()=>setAdminTab(a.id)} className={`at${adminTab===a.id?' on':''}`}>{a.l}</button>
              ))}
            </div>
            {adminTab==='employes'&&(
              <div className="card">
                <div className="ct">Ajouter un employé</div>
                <AdminForm fields={[
                  {key:'username',label:'Identifiant',placeholder:'john_doe',required:true},
                  {key:'password',label:'Mot de passe',placeholder:'••••••••',required:true},
                  {key:'nom',label:'Nom & Prénom',placeholder:'John Doe',required:true},
                  {key:'gradeNew',label:'Grade',type:'select',options:GRADES_ORDRE,required:true},
                  {key:'dateNaissance',label:'Date de naissance',placeholder:'01/01/1990',required:true},
                  {key:'tel',label:'Téléphone',placeholder:'555-0123'},
                  {key:'iban',label:'IBAN',placeholder:'LS64321...'},
                ]} onSubmit={f=>api('addEmploye',{...f,grade:session?.grade})} btnLabel="➕ Ajouter l'employé"/>
              </div>
            )}
            {adminTab==='objets'&&(
              <div className="card">
                <div className="ct">Ajouter un objet rachetable</div>
                <AdminForm fields={[
                  {key:'nom',label:"Nom de l'objet",placeholder:'Montre en or',required:true},
                  {key:'prixAchat',label:'Prix achat standard ($)',type:'number',placeholder:'500',required:true},
                  {key:'prixPartenaire',label:'Prix achat partenaire ($)',type:'number',placeholder:'650',required:true},
                  {key:'beneficeStd',label:'Bénéfice standard ($)',type:'number',placeholder:'400',required:true},
                  {key:'beneficePart',label:'Bénéfice partenaire ($)',type:'number',placeholder:'250',required:true},
                  {key:'prixRevente',label:'Prix revente ($)',type:'number',placeholder:'900',required:true},
                  {key:'categorie',label:'Catégorie',placeholder:'Bijoux',required:true},
                ]} onSubmit={f=>api('addObjet',{...f,grade:session?.grade})} btnLabel="➕ Ajouter l'objet"/>
              </div>
            )}
            {adminTab==='catalogue'&&(
              <div className="card">
                <div className="ct">Ajouter un article catalogue</div>
                <AdminForm fields={[
                  {key:'nom',label:"Nom de l'article",placeholder:'Rolex Submariner',required:true},
                  {key:'prixAchat',label:"Prix d'achat ($)",type:'number',placeholder:'800',required:true},
                  {key:'prixVente',label:'Prix de vente ($)',type:'number',placeholder:'1200',required:true},
                  {key:'categorie',label:'Catégorie',placeholder:'Montres',required:true},
                  {key:'image',label:'URL image',placeholder:'https://...'},
                ]} onSubmit={f=>api('addCatalogue',{...f,grade:session?.grade})} btnLabel="➕ Ajouter au catalogue"/>
              </div>
            )}
            {adminTab==='partenaires'&&(
              <div className="card">
                <div className="ct">Ajouter un partenaire</div>
                <AdminForm fields={[{key:'nom',label:"Nom de l'entreprise",placeholder:'Mechanic Inc.',required:true}]} onSubmit={f=>api('addPartenaire',{...f,grade:session?.grade})} btnLabel="➕ Ajouter le partenaire"/>
              </div>
            )}
          </div>
        )}

        {/* RÈGLEMENT */}
        {tab==='reglement'&&(
          <div className="fi" style={{maxWidth:700}}>
            <div className="pg">Règlement Intérieur 📜</div>
            <div className="ps">Document officiel — applicable à tous les employés</div>
            <div style={{background:'rgba(155,26,26,0.07)',border:'1px solid rgba(155,26,26,0.2)',borderRadius:13,padding:'11px 17px',color:'#f87171',fontSize:13,marginBottom:16,display:'flex',gap:9}}>
              <span>⚠️</span><span>La lecture et le respect de ce règlement sont obligatoires pour tout employé.</span>
            </div>
            {[
              {t:'1. Comportement & Professionnalisme',p:['Toujours se présenter avec courtoisie et professionnalisme.','Le vouvoiement est de mise avec les clients.','Tout comportement irrespectueux est passible de sanction.']},
              {t:'2. Gestion des Rachats',p:['Chaque rachat doit être enregistré dès la transaction.',"Vérifiez toujours l'identité du client avant d'enregistrer.",'Ne jamais racheter à un prix non validé par la direction.']},
              {t:'3. Revente & Vente',p:['La revente interne est réservée au Patron et Co-Patronne.','Les prix sont fixés par la direction.','Tout écart de caisse doit être signalé dans les 24h.']},
              {t:'4. Confidentialité',p:["Les informations clients sont strictement confidentielles.",'Il est interdit de partager ces données hors du cadre professionnel.']},
              {t:'5. Hiérarchie',p:['Commercial → Responsable → Co-Patronne → Patron.','Les décisions de la direction sont finales.']},
              {t:'6. Sanctions',p:['Tout manquement peut entraîner avertissement, rétrogradation ou licenciement.','Les fraudes entraîneront un licenciement immédiat.']},
            ].map(s=>(
              <div key={s.t} className="reg">
                <div className="rh">{s.t}</div>
                <div className="rb">{s.p.map((p,i)=><div key={i} className="rp"><span style={{color:'var(--p)',flexShrink:0,fontWeight:700}}>›</span><span>{p}</span></div>)}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

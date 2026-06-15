'use client';
import { useState, useEffect } from 'react';

// ─── Grades ────────────────────────────────────────────────────────
const GRADES_ORDRE = ['Patron','Co-Patronne','Manager','Responsable','Commercial Expert','Commercial Confirmé','Commercial Débutant'];
const GRADES_REVENTE = ['Patron','Co-Patronne','Manager','Responsable'];
const GRADES_STATS_ALL = ['Patron','Co-Patronne','Manager'];

const GRADE_COLORS = {
  'Patron':              '#f59e0b',
  'Co-Patronne':         '#f97316',
  'Manager':             '#ef4444',
  'Responsable':         '#a855f7',
  'Commercial Expert':   '#3b82f6',
  'Commercial Confirmé': '#06b6d4',
  'Commercial Débutant': '#6b7280',
};

// ─── API helper ────────────────────────────────────────────────────
async function api(action, data = {}) {
  const res = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  return res.json();
}

// ─── Styles inline ─────────────────────────────────────────────────
const S = {
  // Layout
  page:    { minHeight:'100vh', background:'#0f0f13', color:'#e8e8f0', fontFamily:'system-ui,sans-serif' },
  sidebar: { position:'fixed', left:0, top:0, height:'100vh', width:200, background:'#17171e', borderRight:'1px solid #2a2a38', display:'flex', flexDirection:'column', zIndex:100 },
  main:    { marginLeft:200, padding:28 },

  // Cards
  card:    { background:'#1e1e28', border:'1px solid #2a2a38', borderRadius:14, padding:20 },
  cardSm:  { background:'#17171e', border:'1px solid #2a2a38', borderRadius:10, padding:14 },

  // Inputs
  input:   { width:'100%', background:'#17171e', border:'1px solid #2a2a38', borderRadius:8, padding:'9px 12px', color:'#e8e8f0', fontSize:14, boxSizing:'border-box' },
  select:  { width:'100%', background:'#17171e', border:'1px solid #2a2a38', borderRadius:8, padding:'9px 12px', color:'#e8e8f0', fontSize:14, boxSizing:'border-box' },

  // Buttons
  btn:     { background:'#e63946', border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:14, padding:'10px 18px', cursor:'pointer', width:'100%' },
  btnGray: { background:'#2a2a38', border:'none', borderRadius:8, color:'#e8e8f0', fontWeight:500, fontSize:13, padding:'8px 14px', cursor:'pointer' },

  // Text
  label:   { fontSize:11, color:'#6b6b85', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5, display:'block' },
  muted:   { color:'#6b6b85', fontSize:13 },
  title:   { fontSize:28, fontWeight:700, marginBottom:4 },
  red:     { color:'#e63946' },
  green:   { color:'#2ecc71' },
};

// ─── Composant panier partagé ───────────────────────────────────────
function PanierForm({ objets, mode, employe, grade, onSuccess }) {
  const [clientNom,  setClientNom]  = useState('');
  const [clientTel,  setClientTel]  = useState('');
  const [clientIban, setClientIban] = useState('');
  const [objetSel,   setObjetSel]   = useState('');
  const [quantite,   setQuantite]   = useState(1);
  const [panier,     setPanier]     = useState([]);
  const [catFilter,  setCatFilter]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const [msg,        setMsg]        = useState({ type:'', text:'' });

  const categories = [...new Set(objets.map(o => o.categorie))].sort();
  const objetsFiltres = catFilter ? objets.filter(o => o.categorie === catFilter) : objets;
  const objetsTries = [...objetsFiltres].sort((a,b) => a.nom.localeCompare(b.nom,'fr'));

  const totalDisplay = panier.reduce((s, i) => s + i.prix * i.quantite, 0);

  function ajouterPanier() {
    if (!objetSel || quantite < 1) { setMsg({ type:'err', text:'Sélectionnez un objet.' }); return; }
    const obj = objets.find(o => o.nom === objetSel);
    if (!obj) return;
    const prix = mode === 'rachat' ? obj.prixAchat : obj.prixRevente;
    const ex = panier.find(p => p.objet === objetSel);
    if (ex) setPanier(panier.map(p => p.objet === objetSel ? { ...p, quantite: p.quantite + quantite } : p));
    else setPanier([...panier, { objet: objetSel, quantite, prix }]);
    setObjetSel(''); setQuantite(1); setMsg({ type:'', text:'' });
  }

  async function valider() {
    if (!clientNom || !clientTel || (mode === 'rachat' && !clientIban)) { setMsg({ type:'err', text:'Remplissez les infos client.' }); return; }
    if (panier.length === 0) { setMsg({ type:'err', text:'Panier vide.' }); return; }
    setLoading(true);
    const res = await api(mode, { employe, grade, clientNom, clientTel, clientIban, articles: panier });
    setLoading(false);
    if (res.ok) {
      const montant = res.totalDuClient ?? res.totalRevente ?? 0;
      setMsg({ type:'ok', text: `✅ Enregistré ! ${mode === 'rachat' ? `Total à payer : ${montant} $` : `Encaissé : ${montant} $`}` });
      setPanier([]); setClientNom(''); setClientTel(''); setClientIban('');
      if (onSuccess) onSuccess(montant);
    } else {
      setMsg({ type:'err', text: res.error || 'Erreur.' });
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:620 }}>
      {/* Client */}
      <div style={S.card}>
        <div style={{ fontWeight:600, marginBottom:14 }}>Informations client</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <span style={S.label}>Nom & Prénom</span>
            <input style={S.input} value={clientNom} onChange={e=>setClientNom(e.target.value)} placeholder="Bob Smith" />
          </div>
          <div>
            <span style={S.label}>Téléphone</span>
            <input style={S.input} value={clientTel} onChange={e=>setClientTel(e.target.value)} placeholder="555-0123" />
          </div>
          {mode === 'rachat' && (
            <div style={{ gridColumn:'1/-1' }}>
              <span style={S.label}>IBAN</span>
              <input style={S.input} value={clientIban} onChange={e=>setClientIban(e.target.value)} placeholder="LS64321..." />
            </div>
          )}
        </div>
      </div>

      {/* Sélection objet */}
      <div style={S.card}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Ajouter un objet</div>
        {/* Filtre catégorie */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          {['', ...categories].map(c => (
            <button key={c} onClick={()=>setCatFilter(c)} style={{ ...S.btnGray, background: catFilter===c ? '#e63946' : '#2a2a38', color: catFilter===c ? '#fff' : '#e8e8f0', fontSize:12, padding:'5px 10px' }}>
              {c || 'Tous'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select style={{ ...S.select, flex:1 }} value={objetSel} onChange={e=>setObjetSel(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {objetsTries.map(o => (
              <option key={o.nom} value={o.nom}>{o.nom} ({mode==='rachat' ? o.prixAchat : o.prixRevente} $)</option>
            ))}
          </select>
          <input type="number" style={{ ...S.input, width:70, textAlign:'center' }} value={quantite} min={1} onChange={e=>setQuantite(Math.max(1,parseInt(e.target.value)||1))} />
          <button onClick={ajouterPanier} style={{ ...S.btnGray, whiteSpace:'nowrap' }}>+ Ajouter</button>
        </div>
      </div>

      {/* Panier */}
      <div style={S.card}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Panier {panier.length > 0 && <span style={{ ...S.red, fontSize:13 }}>({panier.length} article{panier.length>1?'s':''})</span>}</div>
        {panier.length === 0
          ? <div style={{ ...S.muted, textAlign:'center', padding:'20px 0' }}>Panier vide</div>
          : <>
              {panier.map((item,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#17171e', borderRadius:8, padding:'8px 12px', marginBottom:6 }}>
                  <span style={{ fontSize:14 }}><span style={{ color:'#6b6b85', fontFamily:'monospace' }}>{item.quantite}×</span> {item.objet}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ ...S.green, fontFamily:'monospace', fontWeight:600 }}>{(item.prix*item.quantite).toFixed(0)} $</span>
                    <button onClick={()=>setPanier(panier.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:'#e63946', cursor:'pointer', fontSize:16, padding:0 }}>×</button>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #2a2a38', paddingTop:12, marginTop:8 }}>
                <span style={S.muted}>Total {mode==='rachat'?'à payer':'encaissé'}</span>
                <span style={{ ...S.red, fontSize:22, fontWeight:700, fontFamily:'monospace' }}>{totalDisplay.toFixed(0)} $</span>
              </div>
            </>
        }
      </div>

      {/* Messages */}
      {msg.text && (
        <div style={{ background: msg.type==='ok' ? 'rgba(46,204,113,0.1)' : 'rgba(230,57,70,0.1)', border:`1px solid ${msg.type==='ok'?'rgba(46,204,113,0.3)':'rgba(230,57,70,0.3)'}`, borderRadius:8, padding:'10px 14px', fontSize:14, color: msg.type==='ok'?'#2ecc71':'#e63946' }}>
          {msg.text}
        </div>
      )}

      <button onClick={valider} disabled={loading||panier.length===0} style={{ ...S.btn, opacity: loading||panier.length===0 ? 0.5 : 1, fontSize:16, padding:'13px 18px' }}>
        {loading ? 'Enregistrement…' : mode==='rachat' ? '🚀 Valider le rachat' : '🏷️ Valider la revente'}
      </button>
    </div>
  );
}

// ─── Mini bar chart SVG ─────────────────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.v), 1);
  const W = 560, H = 140, pad = 30;
  const bw = Math.min(32, (W - pad*2) / data.length - 4);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
      {data.map((d,i) => {
        const x = pad + i * ((W - pad*2) / data.length) + ((W - pad*2) / data.length - bw) / 2;
        const barH = Math.max(2, (d.v / max) * (H - 30));
        const y = H - 20 - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={barH} fill="#e63946" rx={4} opacity={0.85} />
            <text x={x + bw/2} y={H - 4} textAnchor="middle" fill="#6b6b85" fontSize={10}>{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function Home() {
  const [view,    setView]    = useState('login');
  const [session, setSession] = useState(null); // { nom, grade, tel, iban }
  const [tab,     setTab]     = useState('dashboard');
  const [objets,  setObjets]  = useState([]);
  const [stats,   setStats]   = useState(null);
  const [employes,setEmployes]= useState([]);
  const [loading, setLoading] = useState(false);
  const [loginErr,setLoginErr]= useState('');

  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Annuaire search
  const [searchEmp, setSearchEmp] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  // ── Login ────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setLoginErr('');
    const res = await api('login', { username, password });
    setLoading(false);
    if (res.ok) {
      setSession(res);
      setView('app');
      chargerDonnees(res);
    } else {
      setLoginErr(res.error || 'Erreur.');
    }
  }

  async function chargerDonnees(sess) {
    const s = sess || session;
    const [obj, st, emp] = await Promise.all([
      api('objets'),
      api('stats', { nom: s.nom, grade: s.grade }),
      api('employes', { grade: s.grade }),
    ]);
    setObjets(obj);
    setStats(st);
    setEmployes(emp);
  }

  // ── Nav items ─────────────────────────────────────────────────────
  const navItems = [
    { id:'dashboard',  label:'Dashboard',  emoji:'📊' },
    { id:'rachat',     label:'Rachat',     emoji:'🛍️' },
    { id:'revente',    label:'Revente',    emoji:'🏷️', restricted: true },
    { id:'annuaire',   label:'Annuaire',   emoji:'👥' },
    { id:'reglement',  label:'Règlement',  emoji:'📜' },
  ];

  function logout() { setSession(null); setView('login'); setUsername(''); setPassword(''); }

  // ══════════════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════════════
  if (view === 'login') return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ ...S.card, width:360 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>♟</div>
          <div style={{ fontSize:26, fontWeight:700, letterSpacing:'0.12em' }}>PAWNSHOP</div>
          <div style={{ ...S.muted, marginTop:4, letterSpacing:'0.06em', textTransform:'uppercase', fontSize:11 }}>Espace Employé</div>
        </div>

        {loginErr && (
          <div style={{ background:'rgba(230,57,70,0.1)', border:'1px solid rgba(230,57,70,0.3)', borderRadius:8, padding:'10px 14px', ...S.red, fontSize:14, marginBottom:14 }}>
            {loginErr}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <span style={S.label}>Identifiant</span>
            <input style={S.input} value={username} onChange={e=>setUsername(e.target.value)} placeholder="john_doe" required />
          </div>
          <div>
            <span style={S.label}>Mot de passe</span>
            <input style={S.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} style={{ ...S.btn, marginTop:6, padding:'12px 18px', fontSize:15, opacity:loading?0.6:1 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ ...S.muted, textAlign:'center', marginTop:20, fontSize:12 }}>Pawnshop © 2025 — Accès réservé aux employés</div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // APP
  // ══════════════════════════════════════════════════════════════════
  const canRevente = GRADES_REVENTE.includes(session?.grade);
  const canSeeAll  = GRADES_STATS_ALL.includes(session?.grade);

  return (
    <div style={S.page}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        {/* Logo */}
        <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid #2a2a38' }}>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:'0.1em' }}>♟ PAWNSHOP</div>
        </div>

        {/* Profil */}
        <div style={{ padding:'12px 16px 12px', borderBottom:'1px solid #2a2a38' }}>
          <div style={{ fontWeight:600, fontSize:14, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{session?.nom}</div>
          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:12, background:'rgba(255,255,255,0.07)', color: GRADE_COLORS[session?.grade] || '#fff' }}>
            {session?.grade}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
          {navItems.map(item => {
            if (item.restricted && !canRevente) return null;
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={()=>setTab(item.id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, background: active ? '#e63946' : 'none', border:'none', color: active ? '#fff' : '#9999b0', cursor:'pointer', fontSize:13, fontWeight: active?600:400, textAlign:'left', width:'100%', transition:'all 0.15s' }}>
                {item.emoji} {item.label}
              </button>
            );
          })}
        </nav>

        {/* Déconnexion */}
        <div style={{ padding:'12px 8px', borderTop:'1px solid #2a2a38' }}>
          <button onClick={logout} style={{ ...S.btnGray, width:'100%', textAlign:'left', color:'#9999b0' }}>
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main style={S.main}>

        {/* ═══ DASHBOARD ═══ */}
        {tab === 'dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div>
              <div style={S.title}>Bonjour, {session?.nom} 👋</div>
              <div style={S.muted}>Tableau de bord personnel</div>
            </div>

            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {[
                { label:'Bénéfices apportés', value:`${stats?.benefice?.toFixed(0)||0} $`, color:'#2ecc71' },
                { label:'Transactions',        value: stats?.transactions||0, color:'#f4a261' },
                { label:'Objets rachetés',     value: stats?.objetsRachetes||0, color:'#3b82f6' },
              ].map(k => (
                <div key={k.label} style={{ ...S.card, display:'flex', alignItems:'center', gap:14 }}>
                  <div>
                    <div style={{ ...S.label }}>{k.label}</div>
                    <div style={{ fontSize:26, fontWeight:700, color:k.color, fontFamily:'monospace' }}>{k.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Graphique historique */}
            {stats?.history?.length > 0 && (
              <div style={S.card}>
                <div style={{ fontWeight:600, marginBottom:14 }}>Mes dernières transactions</div>
                <BarChart data={stats.history.slice(0,12).map((h,i)=>({ l:`#${i+1}`, v:h.benefice }))} />
              </div>
            )}

            {/* Classement global */}
            {canSeeAll && stats?.classement && (
              <div style={S.card}>
                <div style={{ fontWeight:600, marginBottom:16 }}>🏆 Classement des employés</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #2a2a38' }}>
                      {['#','Employé','Grade','Bénéfices','Transactions'].map(h => (
                        <th key={h} style={{ textAlign: h==='Bénéfices'||h==='Transactions'?'right':'left', padding:'8px 10px', color:'#6b6b85', fontWeight:500, fontSize:12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.classement.map((e,i) => (
                      <tr key={e.nom} style={{ borderBottom:'1px solid #1e1e28' }}>
                        <td style={{ padding:'10px', color:'#6b6b85' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                        <td style={{ padding:'10px', fontWeight:500 }}>{e.nom}</td>
                        <td style={{ padding:'10px' }}>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'rgba(255,255,255,0.07)', color: GRADE_COLORS[e.grade]||'#fff' }}>{e.grade}</span>
                        </td>
                        <td style={{ padding:'10px', textAlign:'right', color:'#2ecc71', fontFamily:'monospace', fontWeight:600 }}>{e.benefice.toFixed(0)} $</td>
                        <td style={{ padding:'10px', textAlign:'right', color:'#6b6b85' }}>{e.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ RACHAT ═══ */}
        {tab === 'rachat' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={S.title}>Rachat d'objets 🛍️</div>
              <div style={S.muted}>Enregistrer un nouveau rachat client</div>
            </div>
            <PanierForm
              objets={objets}
              mode="rachat"
              employe={session?.nom}
              grade={session?.grade}
              onSuccess={()=>chargerDonnees()}
            />
          </div>
        )}

        {/* ═══ REVENTE ═══ */}
        {tab === 'revente' && canRevente && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={S.title}>Revente d'objets 🏷️</div>
              <div style={S.muted}>Accès Responsable et supérieurs</div>
            </div>
            <PanierForm
              objets={objets}
              mode="revente"
              employe={session?.nom}
              grade={session?.grade}
            />
          </div>
        )}

        {/* ═══ ANNUAIRE ═══ */}
        {tab === 'annuaire' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={S.title}>Annuaire 👥</div>
              <div style={S.muted}>{employes.length} employé{employes.length>1?'s':''} enregistré{employes.length>1?'s':''}</div>
            </div>

            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <input style={{ ...S.input, flex:1 }} placeholder="🔍 Rechercher un employé…" value={searchEmp} onChange={e=>setSearchEmp(e.target.value)} />
              <select style={{ ...S.select, width:200 }} value={filterGrade} onChange={e=>setFilterGrade(e.target.value)}>
                <option value="">Tous les grades</option>
                {GRADES_ORDRE.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
              {[...employes]
                .filter(e => {
                  const ms = e.nom.toLowerCase().includes(searchEmp.toLowerCase());
                  const mg = filterGrade ? e.grade === filterGrade : true;
                  return ms && mg;
                })
                .sort((a,b) => GRADES_ORDRE.indexOf(a.grade) - GRADES_ORDRE.indexOf(b.grade))
                .map(emp => (
                  <div key={emp.username} style={{ ...S.card, borderColor:'#2a2a38' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:15 }}>{emp.nom}</div>
                        <div style={{ ...S.muted, fontSize:12, marginTop:2 }}>@{emp.username}</div>
                      </div>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:10, background:'rgba(255,255,255,0.07)', color: GRADE_COLORS[emp.grade]||'#fff', whiteSpace:'nowrap' }}>
                        {emp.grade}
                      </span>
                    </div>
                    <div style={{ borderTop:'1px solid #2a2a38', paddingTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span style={S.muted}>Téléphone</span>
                        <span style={{ fontFamily:'monospace' }}>{emp.tel}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span style={S.muted}>IBAN</span>
                        <span style={{ fontFamily:'monospace', fontSize:12 }}>{emp.iban}</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ═══ RÈGLEMENT ═══ */}
        {tab === 'reglement' && (
          <div style={{ maxWidth:720 }}>
            <div style={{ marginBottom:20 }}>
              <div style={S.title}>Règlement Intérieur 📜</div>
              <div style={S.muted}>Document officiel — applicable à tous les employés</div>
            </div>

            <div style={{ background:'rgba(230,57,70,0.08)', border:'1px solid rgba(230,57,70,0.25)', borderRadius:10, padding:'12px 16px', ...S.red, fontSize:14, marginBottom:16 }}>
              ⚠️ La lecture et le respect de ce règlement sont obligatoires. En rejoignant le Pawnshop, vous vous engagez à le respecter.
            </div>

            {[
              {
                titre:'1. Comportement & Professionnalisme',
                points:[
                  'Toujours se présenter avec courtoisie et professionnalisme face aux clients.',
                  'Le vouvoiement est de mise lors des interactions avec les clients.',
                  'Tout comportement irrespectueux envers un client ou un collègue est passible de sanction.',
                  'La tenue vestimentaire doit être propre et adaptée à notre image.',
                ]
              },
              {
                titre:'2. Gestion des Rachats',
                points:[
                  'Chaque rachat doit être enregistré via le dashboard dès la transaction.',
                  "Vérifiez toujours l'identité du client (nom, téléphone, IBAN) avant d'enregistrer.",
                  'Ne jamais racheter un objet à un prix non validé par la direction.',
                  "En cas de doute sur la valeur ou la légalité d'un objet, contacter immédiatement un Responsable.",
                ]
              },
              {
                titre:'3. Gestion des Reventes',
                points:[
                  'La revente est réservée aux grades Responsable et supérieurs.',
                  'Les prix de revente sont fixés par la direction et ne peuvent être modifiés sans accord.',
                  'Tout écart de caisse doit être signalé dans les 24h.',
                ]
              },
              {
                titre:'4. Confidentialité',
                points:[
                  'Les informations des clients (nom, téléphone, IBAN) sont strictement confidentielles.',
                  'Il est interdit de partager ces données en dehors du cadre professionnel.',
                  'Les statistiques et bénéfices du shop ne doivent pas être divulgués à des tiers.',
                ]
              },
              {
                titre:'5. Hiérarchie & Remontée d\'informations',
                points:[
                  'Respectez la chaîne hiérarchique : Commercial → Responsable → Manager → Co-Patronne → Patron.',
                  'Tout problème avec un client doit être remonté au grade supérieur disponible.',
                  'Les décisions de la direction sont finales et doivent être respectées.',
                ]
              },
              {
                titre:'6. Sanctions',
                points:[
                  'Tout manquement au règlement peut entraîner un avertissement, une rétrogradation ou un licenciement.',
                  'Les fraudes ou malversations financières entraîneront un licenciement immédiat.',
                  'La direction se réserve le droit de modifier ce règlement à tout moment.',
                ]
              },
            ].map(section => (
              <div key={section.titre} style={{ ...S.card, marginBottom:10 }}>
                <div style={{ fontWeight:600, marginBottom:12, color:'#e8e8f0' }}>{section.titre}</div>
                {section.points.map((p,i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:14, color:'#9999b0' }}>
                    <span style={S.red}>›</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

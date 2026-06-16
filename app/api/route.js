export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readRange, appendRow, ensureSheet, getSheets, updateCell, updateRowRange, deleteRow, mettreAJourComptabilite } from '../lib/google';

const GRADES_ORDRE  = ['Patron','Co-Patronne','Responsable','Commercial Expert','Commercial Confirmé','Commercial Débutant'];
const GRADES_REVENTE= ['Patron','Co-Patronne'];
const GRADES_STATS  = ['Patron','Co-Patronne','Responsable'];
const GRADES_ADMIN  = ['Patron','Co-Patronne'];

const PAIE = {
  'Patron':              { base:20000, taux:0,    plafond:null  },
  'Co-Patronne':         { base:20000, taux:0,    plafond:null  },
  'Responsable':         { base:10000, taux:0.45, plafond:19000 },
  'Commercial Expert':   { base:0,     taux:0.33, plafond:19000 },
  'Commercial Confirmé': { base:0,     taux:0.30, plafond:19000 },
  'Commercial Débutant': { base:0,     taux:0.27, plafond:19000 },
};

function calculPaie(grade, beneficeSemaine) {
  const p = PAIE[grade] || { base:0, taux:0, plafond:null };
  const commission = Math.round(beneficeSemaine * p.taux);
  let total = p.base + commission;
  if (p.plafond && total > p.plafond) total = p.plafond;
  return { base:p.base, taux:p.taux, commission, total, plafond:p.plafond };
}

function getLundiDimanche() {
  const now = new Date();
  const jour = now.getDay();
  const diffLundi = (jour === 0 ? -6 : 1 - jour);
  const lundi = new Date(now); lundi.setDate(now.getDate() + diffLundi); lundi.setHours(0,0,0,0);
  const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6); dimanche.setHours(23,59,59,999);
  return { lundi, dimanche };
}

function parseDate(str) {
  if (!str) return new Date(0);
  try { const [dp] = str.split(' '); const [d,m,y] = dp.split('/'); return new Date(`${y}-${m}-${d}`); }
  catch(_){ return new Date(0); }
}

async function sendDiscord(url, embed) {
  if (!url) return;
  try { await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({embeds:[embed]})}); }
  catch(e){ console.error('Discord:',e); }
}

export async function POST(req) {
  const body = await req.json();
  const { action } = body;

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (action === 'login') {
    try {
      const rows = await readRange('Employes!A2:H200');
      const u = body.username?.trim().toLowerCase();
      const p = body.password?.trim();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]?.trim().toLowerCase()===u && row[1]?.trim()===p) {
          if (row[9] === 'inactif') return NextResponse.json({ ok:false, error:'Compte désactivé.' });
          const now = new Date().toLocaleString('fr-FR');
          await updateCell('Employes', i+2, 7, now);
          await ensureSheet(`Compta_${row[2]}`,['Date','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Benefice_Genere','Total_Du_Client','Type']);
          return NextResponse.json({ ok:true, nom:row[2], grade:row[3], tel:row[4]||'', iban:row[5]||'' });
        }
      }
      return NextResponse.json({ ok:false, error:'Identifiant ou mot de passe incorrect.' });
    } catch(e){ return NextResponse.json({ ok:false, error:e.message },{status:500}); }
  }

  // ── OBJETS ───────────────────────────────────────────────────────────────
  if (action === 'objets') {
    try {
      const rows = await readRange('Objets_Prix!A2:G500');
      return NextResponse.json(rows.filter(r=>r[0]).map(r=>({
        nom:r[0], prixAchat:parseFloat(r[1]||0), prixPartenaire:parseFloat(r[2]||0),
        beneficeStd:parseFloat(r[3]||0), beneficePart:parseFloat(r[4]||0),
        prixRevente:parseFloat(r[5]||0), categorie:r[6]||'Divers',
      })));
    } catch(e){ return NextResponse.json([]); }
  }

  // ── CATALOGUE ────────────────────────────────────────────────────────────
  if (action === 'catalogue') {
    try {
      const rows = await readRange('Catalogue!A2:E500');
      return NextResponse.json(rows.filter(r=>r[0]).map(r=>({
        nom:r[0], prixAchat:parseFloat(r[1]||0), prixVente:parseFloat(r[2]||0),
        categorie:r[3]||'Divers', image:r[4]||'',
        benefice:parseFloat(r[2]||0)-parseFloat(r[1]||0),
      })));
    } catch(e){ return NextResponse.json([]); }
  }

  // ── PARTENAIRES ──────────────────────────────────────────────────────────
  if (action === 'partenaires') {
    try {
      const rows = await readRange('Partenaires!A2:A100');
      return NextResponse.json(rows.filter(r=>r[0]).map((r,i)=>({ nom:r[0], ligne:i+2 })));
    } catch(e){ return NextResponse.json([]); }
  }

  // ── ANNONCES ─────────────────────────────────────────────────────────────
  if (action === 'annonces') {
    try {
      await ensureSheet('Annonces',['Date','Auteur','Texte']);
      const rows = await readRange('Annonces!A2:C100');
      return NextResponse.json(rows.filter(r=>r[2]).map((r,i)=>({ date:r[0], auteur:r[1], texte:r[2], ligne:i+2 })));
    } catch(e){ return NextResponse.json([]); }
  }

  // ── EMPLOYES ─────────────────────────────────────────────────────────────
  if (action === 'employes') {
    try {
      const rows = await readRange('Employes!A2:I200');
      const restricted = !GRADES_ADMIN.includes(body.grade);
      const { lundi, dimanche } = getLundiDimanche();
      const employes = [];
      for (const r of rows) {
        if (!r[2]) continue;
        let beneficeTotal=0, beneficeSemaine=0, transactions=0;
        try {
          const cr = await readRange(`Compta_${r[2]}!A2:I500`);
          transactions = cr.length;
          for (const row of cr) {
            const b=parseFloat(row[6]||0); beneficeTotal+=b;
            const d=parseDate(row[0]);
            if(d>=lundi&&d<=dimanche) beneficeSemaine+=b;
          }
        } catch(_){}
        let ventesSemaine=0;
        try {
          const vr=await readRange('Ventes!A2:I500');
          for(const row of vr){
            if(row[1]!==r[2])continue;
            const d=parseDate(row[0]);
            if(d>=lundi&&d<=dimanche) ventesSemaine+=parseFloat(row[8]||0);
          }
        } catch(_){}
        const benefTotalSemaine=beneficeSemaine+ventesSemaine;
        const paie=calculPaie(r[3],benefTotalSemaine);
        const isOnline=r[6]?(new Date()-parseDate(r[6]))<24*60*60*1000:false;
        employes.push({
          username:r[0], nom:r[2], grade:r[3],
          tel:restricted?'••••••':(r[4]||'—'),
          iban:restricted?'••••••••••':(r[5]||'—'),
          derniereConnexion:r[6]||'Jamais',
          dateNaissance:r[7]||'',
          statut:r[8]||'actif',
          beneficeTotal, beneficeSemaine, ventesSemaine,
          benefTotalSemaine, paie, transactions, isOnline,
        });
      }
      return NextResponse.json(employes);
    } catch(e){ return NextResponse.json([]); }
  }

  // ── STATS ────────────────────────────────────────────────────────────────
  if (action === 'stats') {
    try {
      const { nom, grade } = body;
      const canSeeAll = GRADES_STATS.includes(grade);
      const { lundi, dimanche } = getLundiDimanche();
      const lundiPrev=new Date(lundi); lundiPrev.setDate(lundi.getDate()-7);
      const dimPrev=new Date(dimanche); dimPrev.setDate(dimanche.getDate()-7);
      const debutMois=new Date(new Date().getFullYear(),new Date().getMonth(),1);

      let benefice=0,transactions=0,objetsRachetes=0,benefSemaine=0,benefSemPrev=0;
      const objetCount={}, history=[];

      try {
        const rows=await readRange(`Compta_${nom}!A2:I500`);
        transactions=rows.length;
        for(const r of rows){
          const b=parseFloat(r[6]||0),q=parseInt(r[5]||0);
          benefice+=b; objetsRachetes+=q;
          const d=parseDate(r[0]);
          if(d>=lundi&&d<=dimanche) benefSemaine+=b;
          else if(d>=lundiPrev&&d<=dimPrev) benefSemPrev+=b;
          if(d>=debutMois&&r[4]) objetCount[r[4]]=(objetCount[r[4]]||0)+q;
          history.push({date:r[0],objet:r[4],quantite:q,benefice:b,totalClient:parseFloat(r[7]||0),type:r[8]||'rachat'});
        }
      } catch(_){}

      let benefVenteSemaine=0;
      try {
        const vr=await readRange('Ventes!A2:I500');
        for(const r of vr){
          if(r[1]!==nom)continue;
          const d=parseDate(r[0]);
          if(d>=lundi&&d<=dimanche) benefVenteSemaine+=parseFloat(r[8]||0);
        }
      } catch(_){}

      const benefTotalSemaine=benefSemaine+benefVenteSemaine;
      const paie=calculPaie(grade,benefTotalSemaine);
      const evoBenef=benefSemPrev>0?Math.round(((benefSemaine-benefSemPrev)/benefSemPrev)*100):null;
      const topObjet=Object.entries(objetCount).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';

      let caGlobal=null;
      if(canSeeAll){
        try{const vr=await readRange('Ventes!H2:H500');caGlobal=vr.reduce((s,r)=>s+parseFloat(r[0]||0),0);}catch(_){}
      }

      let classement=null;
      if(canSeeAll){
        const empRows=await readRange('Employes!A2:D200');
        classement=[];
        for(const emp of empRows){
          if(!emp[2])continue;
          let total=0,count=0;
          try{const rows=await readRange(`Compta_${emp[2]}!G2:G500`);for(const r of rows){total+=parseFloat(r[0]||0);count++;}}catch(_){}
          classement.push({nom:emp[2],grade:emp[3],benefice:total,transactions:count});
        }
        classement.sort((a,b)=>b.benefice-a.benefice);
      }

      // Annonces
      let annonces=[];
      try{
        await ensureSheet('Annonces',['Date','Auteur','Texte']);
        const ar=await readRange('Annonces!A2:C100');
        annonces=ar.filter(r=>r[2]).map((r,i)=>({date:r[0],auteur:r[1],texte:r[2],ligne:i+2}));
      }catch(_){}

      return NextResponse.json({
        benefice, transactions, objetsRachetes,
        benefSemaine, benefTotalSemaine, evoBenef, topObjet, caGlobal,
        paie, history:history.slice(-20).reverse(), classement, annonces,
        semaine:{ debut:lundi.toLocaleDateString('fr-FR'), fin:dimanche.toLocaleDateString('fr-FR') },
      });
    } catch(e){ return NextResponse.json({benefice:0,transactions:0,objetsRachetes:0,history:[],classement:null,paie:{base:0,commission:0,total:0},annonces:[]}); }
  }

  // ── RACHAT STANDARD ──────────────────────────────────────────────────────
  if (action === 'rachat') {
    try {
      const { employe, clientNom, clientTel, clientIban, articles } = body;
      const sheetObjets=await readRange('Objets_Prix!A2:G500');
      const pm={};
      for(const r of sheetObjets) if(r[0]) pm[r[0]]={achat:parseFloat(r[1]||0),benefice:parseFloat(r[3]||0)};
      await ensureSheet(`Compta_${employe}`,['Date','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Benefice_Genere','Total_Du_Client','Type']);
      await ensureSheet('Depenses_Deductibles',['Date','Employe','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Montant_Paye']);
      let totalB=0,totalC=0,texte='';
      const now=new Date().toLocaleString('fr-FR');
      for(const art of articles){
        const p=pm[art.objet]||{achat:0,benefice:0};
        const b=p.benefice*art.quantite, a=p.achat*art.quantite;
        totalB+=b; totalC+=a;
        texte+=`📦 ${art.quantite}× **${art.objet}** — ${a} $\n`;
        await appendRow(`Compta_${employe}`,[now,clientNom,clientTel,clientIban,art.objet,art.quantite,b,a,'rachat']);
        await appendRow('Depenses_Deductibles',[now,employe,clientNom,clientTel,clientIban,art.objet,art.quantite,a]);
      }
      await sendDiscord(process.env.DISCORD_WEBHOOK_RACHAT,{title:'📥 Rachat Standard — Pawnopoly',color:15158332,fields:[
        {name:'👤 Employé',value:employe,inline:true},{name:'🤝 Client',value:clientNom,inline:true},
        {name:'📱 Tél',value:clientTel,inline:true},{name:'💳 IBAN',value:clientIban,inline:false},
        {name:'📋 Objets',value:texte,inline:false},
        {name:'💵 Total client',value:`**${totalC} $**`,inline:true},{name:'💰 Bénéfice',value:`${totalB} $`,inline:true},
      ],footer:{text:'Pawnopoly Dashboard'}});
      await mettreAJourComptabilite(employe);
      return NextResponse.json({ok:true,totalDuClient:totalC,totalBenefice:totalB});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── RACHAT PARTENAIRE ─────────────────────────────────────────────────────
  if (action === 'rachatPartenaire') {
    try {
      const { employe, entreprise, clientNom, clientTel, clientIban, articles } = body;
      const sheetObjets=await readRange('Objets_Prix!A2:G500');
      const pm={};
      for(const r of sheetObjets) if(r[0]) pm[r[0]]={prixPart:parseFloat(r[2]||0),beneficePart:parseFloat(r[4]||0)};
      await ensureSheet('Rachats_Partenaires',['Date','Employe','Entreprise','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Prix_Unitaire','Total','Benefice']);
      await ensureSheet(`Compta_${employe}`,['Date','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Benefice_Genere','Total_Du_Client','Type']);
      await ensureSheet('Depenses_Deductibles',['Date','Employe','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Montant_Paye']);
      let total=0,totalB=0,texte='';
      const now=new Date().toLocaleString('fr-FR');
      for(const art of articles){
        const p=pm[art.objet]||{prixPart:0,beneficePart:0};
        const t=p.prixPart*art.quantite, b=p.beneficePart*art.quantite;
        total+=t; totalB+=b;
        texte+=`📦 ${art.quantite}× **${art.objet}** — ${t} $\n`;
        await appendRow('Rachats_Partenaires',[now,employe,entreprise,clientNom,clientTel,clientIban,art.objet,art.quantite,p.prixPart,t,b]);
        await appendRow(`Compta_${employe}`,[now,clientNom,clientTel,clientIban,art.objet,art.quantite,b,t,'rachat_partenaire']);
        await appendRow('Depenses_Deductibles',[now,employe,clientNom,clientTel,clientIban,art.objet,art.quantite,t]);
      }
      await sendDiscord(process.env.DISCORD_WEBHOOK_PARTENAIRE,{title:'🤝 Rachat Partenaire — Pawnopoly',color:3447003,fields:[
        {name:'👤 Employé',value:employe,inline:true},{name:'🏢 Entreprise',value:entreprise,inline:true},
        {name:'🤝 Client',value:clientNom,inline:true},{name:'📱 Tél',value:clientTel,inline:true},
        {name:'💳 IBAN',value:clientIban,inline:false},
        {name:'📋 Objets',value:texte,inline:false},
        {name:'💵 Total',value:`**${total} $**`,inline:true},{name:'💰 Bénéfice',value:`${totalB} $`,inline:true},
      ],footer:{text:'Pawnopoly Dashboard'}});
      await mettreAJourComptabilite(employe);
      return NextResponse.json({ok:true,total,totalBenefice:totalB});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── REVENTE ──────────────────────────────────────────────────────────────
  if (action === 'revente') {
    try {
      if(!GRADES_REVENTE.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const { employe, articles } = body;
      const sheetObjets=await readRange('Objets_Prix!A2:G500');
      const pm={};
      for(const r of sheetObjets) if(r[0]) pm[r[0]]={revente:parseFloat(r[5]||0)};
      await ensureSheet('Reventes',['Date','Employe','Objet','Quantite','Total_Revente']);
      let total=0,texte='';
      const now=new Date().toLocaleString('fr-FR');
      for(const art of articles){
        const t=(pm[art.objet]?.revente||0)*art.quantite; total+=t;
        texte+=`🔄 ${art.quantite}× **${art.objet}** — ${t} $\n`;
        await appendRow('Reventes',[now,employe,art.objet,art.quantite,t]);
      }
      await sendDiscord(process.env.DISCORD_WEBHOOK_REVENTE,{title:'🔄 Revente — Pawnopoly',color:10181046,fields:[
        {name:'👤 Employé',value:employe,inline:true},
        {name:'📋 Objets',value:texte,inline:false},{name:'💵 Total',value:`**${total} $**`,inline:true},
      ],footer:{text:'Pawnopoly Dashboard'}});
      return NextResponse.json({ok:true,total});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── VENTE CATALOGUE ──────────────────────────────────────────────────────
  if (action === 'vente') {
    try {
      const { employe, clientNom, clientTel, articles } = body;
      const sheetCat=await readRange('Catalogue!A2:E500');
      const pm={};
      for(const r of sheetCat) if(r[0]) pm[r[0]]={prixAchat:parseFloat(r[1]||0),prixVente:parseFloat(r[2]||0)};
      await ensureSheet('Ventes',['Date','Employe','Client_Nom','Client_Tel','Objet','Quantite','Prix_Achat_Unit','Total_Vente','Benefice_Total']);
      let totalVente=0,totalBenef=0,texte='';
      const now=new Date().toLocaleString('fr-FR');
      for(const art of articles){
        const p=pm[art.objet]||{prixAchat:0,prixVente:0};
        const tv=p.prixVente*art.quantite, benef=(p.prixVente-p.prixAchat)*art.quantite;
        totalVente+=tv; totalBenef+=benef;
        texte+=`🏪 ${art.quantite}× **${art.objet}** — ${tv} $\n`;
        await appendRow('Ventes',[now,employe,clientNom,clientTel,art.objet,art.quantite,p.prixAchat,tv,benef]);
      }
      await sendDiscord(process.env.DISCORD_WEBHOOK_VENTE,{title:'🏪 Vente Catalogue — Pawnopoly',color:5763719,fields:[
        {name:'👤 Employé',value:employe,inline:true},{name:'🤝 Client',value:clientNom,inline:true},
        {name:'📱 Tél',value:clientTel,inline:true},
        {name:'📋 Objets',value:texte,inline:false},
        {name:'💵 Total',value:`**${totalVente} $**`,inline:true},{name:'💰 Bénéfice',value:`${totalBenef} $`,inline:true},
      ],footer:{text:'Pawnopoly Dashboard'}});
      await mettreAJourComptabilite(employe);
      return NextResponse.json({ok:true,total:totalVente,totalBenefice:totalBenef});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — AJOUTER EMPLOYÉ ──────────────────────────────────────────────
  if (action === 'addEmploye') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const { username, password, nom, gradeNew, tel, iban, dateNaissance } = body;
      const dateArrivee = new Date().toLocaleDateString('fr-FR');
      await appendRow('Employes',[username,password,nom,gradeNew,tel||'',iban||'',dateArrivee,dateNaissance||'','actif']);
      await ensureSheet(`Compta_${nom}`,['Date','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Benefice_Genere','Total_Du_Client','Type']);
      await mettreAJourComptabilite(nom);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — MODIFIER EMPLOYÉ ─────────────────────────────────────────────
  if (action === 'editEmploye') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const { username, gradeNew, tel, iban, password, statut } = body;
      const rows = await readRange('Employes!A2:I200');
      const idx = rows.findIndex(r => r[0]?.trim().toLowerCase() === username?.trim().toLowerCase());
      if (idx === -1) return NextResponse.json({ok:false,error:'Employé introuvable.'});
      const row = rows[idx];
      const newRow = [
        row[0], password||row[1], row[2], gradeNew||row[3],
        tel||row[4], iban||row[5], row[6], row[7], statut||row[8]||'actif'
      ];
      await updateRowRange('Employes', idx+2, 1, newRow);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — SUPPRIMER EMPLOYÉ ────────────────────────────────────────────
  if (action === 'deleteEmploye') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const rows = await readRange('Employes!A2:A200');
      const idx = rows.findIndex(r => r[0]?.trim().toLowerCase() === body.username?.trim().toLowerCase());
      if (idx === -1) return NextResponse.json({ok:false,error:'Employé introuvable.'});
      await deleteRow('Employes', idx+2);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — AJOUTER OBJET ────────────────────────────────────────────────
  if (action === 'addObjet') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const { nom, prixAchat, prixPartenaire, beneficeStd, beneficePart, prixRevente, categorie } = body;
      await appendRow('Objets_Prix',[nom,prixAchat,prixPartenaire,beneficeStd,beneficePart,prixRevente,categorie]);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — MODIFIER OBJET ───────────────────────────────────────────────
  if (action === 'editObjet') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const { nomOriginal, nom, prixAchat, prixPartenaire, beneficeStd, beneficePart, prixRevente, categorie } = body;
      const rows = await readRange('Objets_Prix!A2:A500');
      const idx = rows.findIndex(r => r[0] === nomOriginal);
      if (idx === -1) return NextResponse.json({ok:false,error:'Objet introuvable.'});
      await updateRowRange('Objets_Prix', idx+2, 1, [nom,prixAchat,prixPartenaire,beneficeStd,beneficePart,prixRevente,categorie]);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — SUPPRIMER OBJET ──────────────────────────────────────────────
  if (action === 'deleteObjet') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const rows = await readRange('Objets_Prix!A2:A500');
      const idx = rows.findIndex(r => r[0] === body.nom);
      if (idx === -1) return NextResponse.json({ok:false,error:'Objet introuvable.'});
      await deleteRow('Objets_Prix', idx+2);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — AJOUTER CATALOGUE ────────────────────────────────────────────
  if (action === 'addCatalogue') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const { nom, prixAchat, prixVente, categorie, image } = body;
      await appendRow('Catalogue',[nom,prixAchat,prixVente,categorie,image||'']);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — MODIFIER CATALOGUE ───────────────────────────────────────────
  if (action === 'editCatalogue') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const { nomOriginal, nom, prixAchat, prixVente, categorie, image } = body;
      const rows = await readRange('Catalogue!A2:A500');
      const idx = rows.findIndex(r => r[0] === nomOriginal);
      if (idx === -1) return NextResponse.json({ok:false,error:'Article introuvable.'});
      await updateRowRange('Catalogue', idx+2, 1, [nom,prixAchat,prixVente,categorie,image||'']);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — SUPPRIMER CATALOGUE ──────────────────────────────────────────
  if (action === 'deleteCatalogue') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      const rows = await readRange('Catalogue!A2:A500');
      const idx = rows.findIndex(r => r[0] === body.nom);
      if (idx === -1) return NextResponse.json({ok:false,error:'Article introuvable.'});
      await deleteRow('Catalogue', idx+2);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — AJOUTER PARTENAIRE ───────────────────────────────────────────
  if (action === 'addPartenaire') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      await appendRow('Partenaires',[body.nom]);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — SUPPRIMER PARTENAIRE ─────────────────────────────────────────
  if (action === 'deletePartenaire') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      await deleteRow('Partenaires', body.ligne);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — POSTER ANNONCE ───────────────────────────────────────────────
  if (action === 'addAnnonce') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      await ensureSheet('Annonces',['Date','Auteur','Texte']);
      const now = new Date().toLocaleString('fr-FR');
      await appendRow('Annonces',[now, body.auteur, body.texte]);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  // ── ADMIN — SUPPRIMER ANNONCE ────────────────────────────────────────────
  if (action === 'deleteAnnonce') {
    try {
      if(!GRADES_ADMIN.includes(body.grade)) return NextResponse.json({ok:false,error:'Accès refusé.'},{status:403});
      await deleteRow('Annonces', body.ligne);
      return NextResponse.json({ok:true});
    } catch(e){ return NextResponse.json({ok:false,error:e.message},{status:500}); }
  }

  return NextResponse.json({error:'Action inconnue'},{status:400});
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readRange, appendRow, ensureSheet } from '../lib/google';

// ─── Grades & Permissions ───────────────────────────────────────────
const GRADES_ORDRE = ['Patron','Co-Patronne','Manager','Responsable','Commercial Expert','Commercial Confirmé','Commercial Débutant'];
const GRADES_REVENTE = ['Patron','Co-Patronne','Manager','Responsable'];
const GRADES_STATS_GLOBALES = ['Patron','Co-Patronne','Manager'];

// ─── Discord Webhook ────────────────────────────────────────────────
async function sendDiscord(webhookUrl, embed) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch(e) { console.error('Discord error:', e); }
}

// ═══════════════════════════════════════════════════════════════════
export async function POST(req) {
  const body = await req.json();
  const { action } = body;

  // ── LOGIN ──────────────────────────────────────────────────────────
  if (action === 'login') {
    try {
      const rows = await readRange('Employes!A2:F200');
      const user = body.username?.trim().toLowerCase();
      const pass = body.password?.trim();
      for (const row of rows) {
        if (row[0]?.trim().toLowerCase() === user && row[1]?.trim() === pass) {
          return NextResponse.json({ ok: true, nom: row[2], grade: row[3], tel: row[4]||'', iban: row[5]||'' });
        }
      }
      return NextResponse.json({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    } catch(e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // ── OBJETS ────────────────────────────────────────────────────────
  if (action === 'objets') {
    try {
      const rows = await readRange('Objets_Prix!A2:E500');
      const objets = rows.filter(r => r[0]).map(r => ({
        nom: r[0],
        prixAchat: parseFloat(r[1]||0),
        prixRevente: parseFloat(r[2]||0),
        benefice: parseFloat(r[3]||0),
        categorie: r[4]||'Divers',
      }));
      return NextResponse.json(objets);
    } catch(e) {
      return NextResponse.json([], { status: 500 });
    }
  }

  // ── EMPLOYES (annuaire) ───────────────────────────────────────────
  if (action === 'employes') {
    try {
      const rows = await readRange('Employes!A2:F200');
      const restricted = !GRADES_REVENTE.includes(body.grade);
      const employes = rows.filter(r => r[2]).map(r => ({
        username: r[0], nom: r[2], grade: r[3],
        tel:  restricted ? '••••••' : (r[4]||'—'),
        iban: restricted ? '••••••••••' : (r[5]||'—'),
      }));
      return NextResponse.json(employes);
    } catch(e) {
      return NextResponse.json([], { status: 500 });
    }
  }

  // ── STATS ─────────────────────────────────────────────────────────
  if (action === 'stats') {
    try {
      const { nom, grade } = body;
      const canSeeAll = GRADES_STATS_GLOBALES.includes(grade);

      // Stats perso
      let benefice = 0, transactions = 0, objetsRachetes = 0, history = [];
      try {
        const rows = await readRange(`Compta_${nom}!A2:H500`);
        transactions = rows.length;
        for (const r of rows) {
          benefice += parseFloat(r[6]||0);
          objetsRachetes += parseInt(r[5]||0);
          history.push({ date: r[0], objet: r[4], quantite: parseInt(r[5]||0), benefice: parseFloat(r[6]||0), totalClient: parseFloat(r[7]||0) });
        }
      } catch(_) {}

      // Classement global
      let classement = null;
      if (canSeeAll) {
        const empRows = await readRange('Employes!A2:D200');
        classement = [];
        for (const emp of empRows) {
          if (!emp[2]) continue;
          let total = 0, count = 0;
          try {
            const rows = await readRange(`Compta_${emp[2]}!A2:H500`);
            for (const r of rows) { total += parseFloat(r[6]||0); count++; }
          } catch(_) {}
          classement.push({ nom: emp[2], grade: emp[3], benefice: total, transactions: count });
        }
        classement.sort((a,b) => b.benefice - a.benefice);
      }

      return NextResponse.json({ benefice, transactions, objetsRachetes, history: history.slice(-20).reverse(), classement });
    } catch(e) {
      return NextResponse.json({ benefice:0, transactions:0, objetsRachetes:0, history:[], classement:null });
    }
  }

  // ── RACHAT ────────────────────────────────────────────────────────
  if (action === 'rachat') {
    try {
      const { employe, clientNom, clientTel, clientIban, articles } = body;
      const sheetObjets = await readRange('Objets_Prix!A2:D500');
      const prixMap = {};
      for (const r of sheetObjets) {
        if (r[0]) prixMap[r[0]] = { achat: parseFloat(r[1]||0), benefice: parseFloat(r[3]||0) };
      }

      await ensureSheet(`Compta_${employe}`, ['Date','Client_Nom','Client_Tel','Client_IBAN','Objet','Quantite','Benefice_Genere','Total_Du_Client']);

      let totalBenefice = 0, totalDuClient = 0;
      const now = new Date().toLocaleString('fr-FR');
      let texteObjets = '';

      for (const art of articles) {
        const prix = prixMap[art.objet] || { achat: 0, benefice: 0 };
        const benef = prix.benefice * art.quantite;
        const achat = prix.achat * art.quantite;
        totalBenefice += benef;
        totalDuClient += achat;
        texteObjets += `📦 ${art.quantite}× **${art.objet}** — ${achat} $\n`;
        await appendRow(`Compta_${employe}`, [now, clientNom, clientTel, clientIban, art.objet, art.quantite, benef, achat]);
      }

      await sendDiscord(process.env.DISCORD_WEBHOOK_URL, {
        title: '📥 Nouveau Rachat — Pawnshop',
        color: 15158332,
        fields: [
          { name: '👤 Employé', value: employe, inline: true },
          { name: '🤝 Client', value: clientNom, inline: true },
          { name: '📱 Téléphone', value: clientTel, inline: true },
          { name: '💳 IBAN', value: clientIban, inline: false },
          { name: '📋 Objets', value: texteObjets, inline: false },
          { name: '💵 Total à payer', value: `**${totalDuClient} $**`, inline: true },
          { name: '💰 Bénéfice', value: `${totalBenefice} $`, inline: true },
        ],
        footer: { text: 'Pawnshop Dashboard' },
      });

      return NextResponse.json({ ok: true, totalDuClient, totalBenefice });
    } catch(e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // ── REVENTE ───────────────────────────────────────────────────────
  if (action === 'revente') {
    try {
      const { employe, grade, clientNom, clientTel, articles } = body;
      if (!GRADES_REVENTE.includes(grade)) {
        return NextResponse.json({ ok: false, error: 'Accès refusé.' }, { status: 403 });
      }

      const sheetObjets = await readRange('Objets_Prix!A2:E500');
      const prixMap = {};
      for (const r of sheetObjets) {
        if (r[0]) prixMap[r[0]] = { revente: parseFloat(r[2]||0) };
      }

      await ensureSheet('Reventes', ['Date','Employe','Client_Nom','Client_Tel','Objet','Quantite','Total_Revente']);

      let totalRevente = 0;
      const now = new Date().toLocaleString('fr-FR');
      let texteObjets = '';

      for (const art of articles) {
        const rev = (prixMap[art.objet]?.revente || 0) * art.quantite;
        totalRevente += rev;
        texteObjets += `🏷️ ${art.quantite}× **${art.objet}** — ${rev} $\n`;
        await appendRow('Reventes', [now, employe, clientNom, clientTel, art.objet, art.quantite, rev]);
      }

      await sendDiscord(process.env.DISCORD_WEBHOOK_URL, {
        title: '🏷️ Revente — Pawnshop',
        color: 3447003,
        fields: [
          { name: '👤 Employé', value: employe, inline: true },
          { name: '🤝 Acheteur', value: clientNom, inline: true },
          { name: '📱 Téléphone', value: clientTel, inline: true },
          { name: '📋 Objets', value: texteObjets, inline: false },
          { name: '💵 Total encaissé', value: `**${totalRevente} $**`, inline: true },
        ],
        footer: { text: 'Pawnshop Dashboard' },
      });

      return NextResponse.json({ ok: true, totalRevente });
    } catch(e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

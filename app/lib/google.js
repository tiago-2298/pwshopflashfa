import { google } from 'googleapis';

export async function getSheets() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, '');
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: process.env.GOOGLE_CLIENT_EMAIL, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId: process.env.SPREADSHEET_ID };
}

export async function readRange(range) {
  const { sheets, spreadsheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values || [];
}

export async function appendRow(sheetName, values) {
  const { sheets, spreadsheetId } = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED', requestBody: { values: [values] },
  });
}

export async function ensureSheet(title, headers) {
  const { sheets, spreadsheetId } = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some(s => s.properties?.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    if (headers) await appendRow(title, headers);
  }
}

export async function updateCell(sheet, row, col, value) {
  try {
    const { sheets, spreadsheetId } = await getSheets();
    const colLetter = String.fromCharCode(64 + col);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheet}!${colLetter}${row}`,
      valueInputOption: 'USER_ENTERED', requestBody: { values: [[value]] },
    });
  } catch(_) {}
}

export async function updateRow(sheet, row, values) {
  try {
    const { sheets, spreadsheetId } = await getSheets();
    const endCol = String.fromCharCode(64 + values.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheet}!A${row}:${endCol}${row}`,
      valueInputOption: 'USER_ENTERED', requestBody: { values: [values] },
    });
  } catch(_) {}
}

// ── Mise à jour ligne employé dans Comptabilité ───────────────────────────────
// Colonnes du tableau (d'après la capture) :
// A:ID / B:Nom+Prénom / C:Poste / D:Téléphone / E:IBAN / F:Date arrivée / G:Ancienneté
// H:CA / I:Bénéfice / J:Primes Hebdo / K:Primes Hebdomadaire / L:Primes Mensuel / M:Primes Mensuelles
// N:Salaire / O:Salaire Versé / P:Heures / Q:Tarif / R:Salaire

export async function mettreAJourComptabilite(nomEmploye) {
  try {
    const { sheets, spreadsheetId } = await getSheets();

    // 1. Récupérer les infos de l'employé
    const empRows = await readRange('Employes!A2:G200');
    const emp = empRows.find(r => r[2] === nomEmploye);
    if (!emp) return;

    const [username, password, nom, grade, tel, iban, dateArrivee] = emp;

    // 2. Calculer CA et Bénéfice de la semaine (lundi→dimanche)
    const now = new Date();
    const jour = now.getDay();
    const diffLundi = (jour === 0 ? -6 : 1 - jour);
    const lundi = new Date(now);
    lundi.setDate(now.getDate() + diffLundi);
    lundi.setHours(0,0,0,0);
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    dimanche.setHours(23,59,59,999);

    function parseDate(str) {
      if (!str) return new Date(0);
      try {
        const [datePart] = str.split(' ');
        const [d,m,y] = datePart.split('/');
        return new Date(`${y}-${m}-${d}`);
      } catch(_){ return new Date(0); }
    }

    let caSemaine = 0, benefSemaine = 0;

    // Rachats
    try {
      const rows = await readRange(`Compta_${nom}!A2:I500`);
      for (const r of rows) {
        const d = parseDate(r[0]);
        if (d >= lundi && d <= dimanche) {
          caSemaine   += parseFloat(r[7]||0);
          benefSemaine += parseFloat(r[6]||0);
        }
      }
    } catch(_) {}

    // Ventes catalogue
    try {
      const rows = await readRange('Ventes!A2:I500');
      for (const r of rows) {
        if (r[1] !== nom) continue;
        const d = parseDate(r[0]);
        if (d >= lundi && d <= dimanche) {
          caSemaine   += parseFloat(r[7]||0);
          benefSemaine += parseFloat(r[8]||0);
        }
      }
    } catch(_) {}

    // 3. Calculer salaire
    const PAIE = {
      'Patron':              { base: 20000, taux: 0 },
      'Co-Patronne':         { base: 20000, taux: 0 },
      'Responsable':         { base: 10000, taux: 0.45 },
      'Commercial Expert':   { base: 0,     taux: 0.33 },
      'Commercial Confirmé': { base: 0,     taux: 0.30 },
      'Commercial Débutant': { base: 0,     taux: 0.27 },
    };
    const p = PAIE[grade] || { base: 0, taux: 0 };
    const commission = Math.round(benefSemaine * p.taux);
    const salaire = p.base + commission;

    // 4. Ancienneté en jours
    let anciennete = '';
    if (dateArrivee) {
      const debut = parseDate(dateArrivee);
      const diff = Math.floor((now - debut) / (1000*60*60*24));
      anciennete = diff > 0 ? `${diff} jours` : '0 jours';
    }

    // 5. Trouver la ligne de l'employé dans Comptabilité (colonne B = nom)
    const compRows = await readRange('Comptabilité!A2:R200');
    let ligneIndex = -1;
    let idMax = 0;

    for (let i = 0; i < compRows.length; i++) {
      const id = parseInt(compRows[i][0]||0);
      if (id > idMax) idMax = id;
      if (compRows[i][1] === nom) { ligneIndex = i + 2; break; }
    }

    const valeurs = [
      ligneIndex === -1 ? idMax + 1 : parseInt(compRows[ligneIndex-2]?.[0]||idMax+1), // A: ID
      nom,          // B: Nom+Prénom
      grade,        // C: Poste
      tel||'',      // D: Téléphone
      iban||'',     // E: IBAN
      dateArrivee||new Date().toLocaleDateString('fr-FR'), // F: Date arrivée
      anciennete,   // G: Ancienneté
      caSemaine,    // H: CA
      benefSemaine, // I: Bénéfice
      '',           // J: Primes Hebdo (manuel)
      '',           // K: Primes Hebdomadaire (manuel)
      '',           // L: Primes Mensuel (manuel)
      '',           // M: Primes Mensuelles (manuel)
      salaire,      // N: Salaire
      '',           // O: Salaire Versé (manuel)
      '',           // P: Heures (manuel)
      '',           // Q: Tarif (manuel)
      salaire,      // R: Salaire final
    ];

    if (ligneIndex === -1) {
      // Nouvelle ligne
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: 'Comptabilité!A2',
        valueInputOption: 'USER_ENTERED', requestBody: { values: [valeurs] },
      });
    } else {
      // Mettre à jour uniquement les colonnes non-manuelles
      // A,B,C,D,E,F,G,H,I,N,R (on ne touche pas J,K,L,M,O,P,Q)
      const colsToUpdate = [
        {col:1, val:valeurs[0]},  // A: ID
        {col:2, val:valeurs[1]},  // B: Nom
        {col:3, val:valeurs[2]},  // C: Poste
        {col:4, val:valeurs[3]},  // D: Téléphone
        {col:5, val:valeurs[4]},  // E: IBAN
        {col:6, val:valeurs[5]},  // F: Date arrivée
        {col:7, val:valeurs[6]},  // G: Ancienneté
        {col:8, val:valeurs[7]},  // H: CA
        {col:9, val:valeurs[8]},  // I: Bénéfice
        {col:14,val:valeurs[13]}, // N: Salaire
        {col:18,val:valeurs[17]}, // R: Salaire final
      ];
      for (const {col, val} of colsToUpdate) {
        await updateCell('Comptabilité', ligneIndex, col, val);
      }
    }
  } catch(e) {
    console.error('Erreur mise à jour Comptabilité:', e);
  }
}

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

function parseDate(str) {
  if (!str) return new Date(0);
  try {
    const [datePart] = str.split(' ');
    const [d,m,y] = datePart.split('/');
    return new Date(`${y}-${m}-${d}`);
  } catch(_){ return new Date(0); }
}

// ── Mise à jour tableau Comptabilité ─────────────────────────────────────────
// Structure à partir de C5 :
// C=ID | D=Nom+Prénom | E=Date naissance | F=Poste | G=Numéro | H=Date arrivée | I=CA | J=Bénéfice
// K et après → on ne touche pas

export async function mettreAJourComptabilite(nomEmploye) {
  try {
    const { sheets, spreadsheetId } = await getSheets();

    // 1. Infos employé (A=username B=pass C=nom D=grade E=tel F=iban G=derniere_co H=date_naissance)
    const empRows = await readRange('Employes!A2:H200');
    const emp = empRows.find(r => r[2] === nomEmploye);
    if (!emp) return;

    const nom          = emp[2] || '';
    const grade        = emp[3] || '';
    const tel          = emp[4] || '';
    const dateArrivee  = emp[6] ? parseDate(emp[6]).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    const dateNaissance= emp[7] || '';

    // 2. Calcul CA et Bénéfice semaine (lundi→dimanche)
    const now = new Date();
    const jour = now.getDay();
    const diffLundi = (jour === 0 ? -6 : 1 - jour);
    const lundi = new Date(now);
    lundi.setDate(now.getDate() + diffLundi);
    lundi.setHours(0,0,0,0);
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    dimanche.setHours(23,59,59,999);

    let caSemaine = 0, benefSemaine = 0;

    try {
      const rows = await readRange(`Compta_${nom}!A2:I500`);
      for (const r of rows) {
        const d = parseDate(r[0]);
        if (d >= lundi && d <= dimanche) {
          caSemaine    += parseFloat(r[7]||0);
          benefSemaine += parseFloat(r[6]||0);
        }
      }
    } catch(_) {}

    try {
      const rows = await readRange('Ventes!A2:I500');
      for (const r of rows) {
        if (r[1] !== nom) continue;
        const d = parseDate(r[0]);
        if (d >= lundi && d <= dimanche) {
          caSemaine    += parseFloat(r[7]||0);
          benefSemaine += parseFloat(r[8]||0);
        }
      }
    } catch(_) {}

    // 3. Trouver la ligne dans Comptabilité (colonne D = nom, à partir de ligne 5)
    // Les données commencent en C5, donc D5 = Nom+Prénom
    const compRows = await readRange('Comptabilité!C5:J200');
    let ligneIndex = -1;
    let idMax = 0;

    for (let i = 0; i < compRows.length; i++) {
      const id = parseInt(compRows[i][0]||0);
      if (id > idMax) idMax = id;
      // D = index 1 dans notre lecture (C=0, D=1)
      if (compRows[i][1] === nom) {
        ligneIndex = i + 5; // ligne réelle dans le sheet (5 = première ligne données)
        break;
      }
    }

    const nouvelId = ligneIndex === -1 ? idMax + 1 : parseInt(compRows[ligneIndex-5]?.[0]||idMax+1);

    // 4. Valeurs à écrire : C=ID, D=Nom, E=DateNaissance, F=Poste, G=Numéro, H=DateArrivée, I=CA, J=Bénéfice
    const valeurs = [
      nouvelId,      // C: ID perso
      nom,           // D: Nom + Prénom
      dateNaissance, // E: Date de naissance
      grade,         // F: Poste
      tel,           // G: Numéro
      dateArrivee,   // H: Date d'arrivée
      caSemaine,     // I: CA
      benefSemaine,  // J: Bénéfice
    ];

    if (ligneIndex === -1) {
      // Nouvelle ligne — on cherche la prochaine ligne vide à partir de C5
      const nextRow = 5 + compRows.filter(r => r[0]).length;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Comptabilité!C${nextRow}:J${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [valeurs] },
      });
    } else {
      // Mise à jour ligne existante — seulement C à J, on ne touche pas K+
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Comptabilité!C${ligneIndex}:J${ligneIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [valeurs] },
      });
    }

  } catch(e) {
    console.error('Erreur Comptabilité:', e.message);
  }
}

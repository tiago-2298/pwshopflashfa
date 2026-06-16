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

export async function updateRowRange(sheet, row, startCol, values) {
  try {
    const { sheets, spreadsheetId } = await getSheets();
    const endCol = String.fromCharCode(64 + startCol + values.length - 1);
    const startColLetter = String.fromCharCode(64 + startCol);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheet}!${startColLetter}${row}:${endCol}${row}`,
      valueInputOption: 'USER_ENTERED', requestBody: { values: [values] },
    });
  } catch(_) {}
}

export async function deleteRow(sheetName, rowIndex) {
  const { sheets, spreadsheetId } = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet) return;
  const sheetId = sheet.properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }
        }
      }]
    }
  });
}

function parseDate(str) {
  if (!str) return new Date(0);
  try {
    const [datePart] = str.split(' ');
    const [d,m,y] = datePart.split('/');
    return new Date(`${y}-${m}-${d}`);
  } catch(_){ return new Date(0); }
}

export async function mettreAJourComptabilite(nomEmploye) {
  try {
    const { sheets, spreadsheetId } = await getSheets();
    const empRows = await readRange('Employes!A2:H200');
    const emp = empRows.find(r => r[2] === nomEmploye);
    if (!emp) return;

    const nom           = emp[2] || '';
    const grade         = emp[3] || '';
    const tel           = emp[4] || '';
    const dateArrivee   = emp[6] ? parseDate(emp[6]).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    const dateNaissance = emp[7] || '';

    const now = new Date();
    const jour = now.getDay();
    const diffLundi = (jour === 0 ? -6 : 1 - jour);
    const lundi = new Date(now); lundi.setDate(now.getDate() + diffLundi); lundi.setHours(0,0,0,0);
    const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6); dimanche.setHours(23,59,59,999);

    let caSemaine = 0, benefSemaine = 0;
    try {
      const rows = await readRange(`Compta_${nom}!A2:I500`);
      for (const r of rows) {
        const d = parseDate(r[0]);
        if (d >= lundi && d <= dimanche) { caSemaine += parseFloat(r[7]||0); benefSemaine += parseFloat(r[6]||0); }
      }
    } catch(_) {}
    try {
      const rows = await readRange('Ventes!A2:I500');
      for (const r of rows) {
        if (r[1] !== nom) continue;
        const d = parseDate(r[0]);
        if (d >= lundi && d <= dimanche) { caSemaine += parseFloat(r[7]||0); benefSemaine += parseFloat(r[8]||0); }
      }
    } catch(_) {}

    const compRows = await readRange('Comptabilité!C5:J200');
    let ligneIndex = -1, idMax = 0;
    for (let i = 0; i < compRows.length; i++) {
      const id = parseInt(compRows[i][0]||0);
      if (id > idMax) idMax = id;
      if (compRows[i][1] && compRows[i][1].trim() === nom.trim()) { ligneIndex = i + 5; break; }
    }

    const nouvelId = ligneIndex === -1 ? idMax + 1 : parseInt(compRows[ligneIndex-5]?.[0]||idMax+1);
    const valeurs = [nouvelId, nom, dateNaissance, grade, tel, dateArrivee, caSemaine, benefSemaine];

    if (ligneIndex === -1) {
      const allRows = await readRange('Comptabilité!C5:D200');
      let nextRow = 5;
      for (let i = 0; i < allRows.length; i++) {
        if (allRows[i][1] && allRows[i][1].trim() !== '') nextRow = 5 + i + 1;
        else { nextRow = 5 + i; break; }
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `Comptabilité!C${nextRow}:J${nextRow}`,
        valueInputOption: 'USER_ENTERED', requestBody: { values: [valeurs] },
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `Comptabilité!C${ligneIndex}:J${ligneIndex}`,
        valueInputOption: 'USER_ENTERED', requestBody: { values: [valeurs] },
      });
    }
  } catch(e) { console.error('Erreur Comptabilité:', e.message); }
}

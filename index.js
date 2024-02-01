require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {completeRow, setTotalClasses} = require('./calculate-grade');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const credentials = {
      client_id: process.env.CLIENT_ID,
      "type":"authorized_user",
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: process.env.REFRESH_TOKEN
    }

    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function listMajors(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.argv[2],
    range: 'A4:F27',
  });
  console.log('Student data fetched.');

  const getTotalClass = await sheets.spreadsheets.values.get ({
    spreadsheetId: process.argv[2],
    range: 'A2:H2',
  });

  console.log('Total classes fetched.');

  const rows = res.data.values;
  const classRows = getTotalClass.data.values;

  if (classRows && classRows.length > 0) {
    let totalClassesString = classRows[0][0];
    let semesterClasses = parseInt(totalClassesString.replace(/\D/g, ''), 10); 
    setTotalClasses(semesterClasses);
  }
  

  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return;
  } else {

    const studentStatus = rows.map((row) => [completeRow(row).status]);
    const finalExamGrade = rows.map((row) => [completeRow(row).naf]);
    const resultStudentStatus = await sheets.spreadsheets.values.update({
      spreadsheetId: process.argv[2],
      range: 'G4:G27', 
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: studentStatus,
      },
    });

    console.log('Student status updated.');

    const resultFinalExamGrade = await sheets.spreadsheets.values.update({
      spreadsheetId: process.argv[2],
      range: 'H4:H27',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: finalExamGrade,
      },
    });
    
    console.log('Final exam grades updated.');


    return {
      resultStudentStatus,
      resultFinalExamGrade,
    };
  }
}


authorize().then(listMajors).catch(console.error);
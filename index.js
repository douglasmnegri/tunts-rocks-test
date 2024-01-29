const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {completeRow} = require('./calculate-grade');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
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

  const rows = res.data.values;

  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return;
  } else {

    // rows.forEach((row) => {
    //   const status = [completeRow(row).status]
    //   console.log(status);
    // });
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

    const resultFinalExamGrade = await sheets.spreadsheets.values.update({
      spreadsheetId: process.argv[2],
      range: 'H4:H27',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: finalExamGrade,
      },
    });

    return {
      resultStudentStatus,
      resultFinalExamGrade,
    };
  }
}


authorize().then(listMajors).catch(console.error);
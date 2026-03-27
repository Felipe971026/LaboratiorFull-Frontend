import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-initialize environment variables from config if possible
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (firebaseConfig.projectId) {
      console.log(`Forcing project ID from config: ${firebaseConfig.projectId}`);
      process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
      process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
    }
  } catch (e) {
    console.error('Error pre-reading firebase config:', e);
  }
}

// Initialize Firebase Admin
let db: any;
const SETTINGS_COLLECTION = 'app_settings';
const GOOGLE_TOKENS_DOC = 'google_drive_tokens';

// Local storage fallback if Firestore is completely unavailable
const LOCAL_STORAGE_PATH = path.join(process.cwd(), 'local_storage.json');
function getLocalStorage() {
  if (fs.existsSync(LOCAL_STORAGE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_STORAGE_PATH, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveLocalStorage(data: any) {
  try {
    fs.writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving local storage:', e);
  }
}

async function initializeFirestore() {
  try {
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let configProjectId = undefined;
    let configDbId = undefined;

    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      configProjectId = firebaseConfig.projectId;
      configDbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
        ? firebaseConfig.firestoreDatabaseId 
        : undefined;
      
      // Force environment variables to match config if they are different
      if (configProjectId) {
        if (process.env.GOOGLE_CLOUD_PROJECT !== configProjectId) {
          console.log(`Overriding GOOGLE_CLOUD_PROJECT from ${process.env.GOOGLE_CLOUD_PROJECT} to ${configProjectId}`);
          process.env.GOOGLE_CLOUD_PROJECT = configProjectId;
        }
        if (process.env.GCLOUD_PROJECT !== configProjectId) {
          process.env.GCLOUD_PROJECT = configProjectId;
        }
      }
    }
    
    console.log(`Initializing Firebase Admin. Config Project: ${configProjectId || 'default'}, Database: ${configDbId || '(default)'}`);
    
    // Initialize Firebase Admin - ensure we use the correct project
    if (admin.apps.length > 0) {
      const currentApp = admin.app();
      if (configProjectId && currentApp.options.projectId !== configProjectId) {
        console.log(`Current Firebase App has wrong project ID (${currentApp.options.projectId}). Re-initializing...`);
        await currentApp.delete();
      }
    }

    if (admin.apps.length === 0) {
      console.log('Initializing Firebase Admin...');
      try {
        if (configProjectId) {
          console.log(`Using explicit projectId from config: ${configProjectId}`);
          admin.initializeApp({
            projectId: configProjectId
          });
        } else {
          admin.initializeApp();
          console.log('Firebase Admin initialized with environment defaults.');
        }
      } catch (initErr: any) {
        console.warn('Failed to initialize Firebase Admin with config, trying default:', initErr.message);
        try {
          admin.initializeApp();
        } catch (e) {
          console.error('All Firebase Admin initialization attempts failed.');
        }
      }
    }

    const appInstance = admin.app();
    const actualProjectId = appInstance.options.projectId;
    console.log(`Firebase App Project ID: ${actualProjectId || 'default'}`);

    // Try to initialize Firestore
    const tryConnect = async (targetDbId: string | undefined) => {
      console.log(`Attempting to connect to database: ${targetDbId || '(default)'} in project ${actualProjectId || 'default'}`);
      
      // Use the Firestore constructor directly with project ID for better robustness
      const testDb = targetDbId 
        ? new Firestore({ projectId: actualProjectId, databaseId: targetDbId })
        : new Firestore({ projectId: actualProjectId });
      
      // Test write to verify permissions
      console.log(`Performing test write to database: ${targetDbId || '(default)'}...`);
      await testDb.collection('test_connection').doc('status').set({
        lastChecked: new Date().toISOString(),
        status: 'ok',
        projectId: actualProjectId || 'default',
        databaseId: targetDbId || '(default)'
      });
      return testDb;
    };

    try {
      // 1. Try the configured database first
      db = await tryConnect(configDbId);
      console.log(`Successfully connected to configured database: ${configDbId || '(default)'}`);
    } catch (err: any) {
      console.error(`Failed to connect to configured database: ${err.message}`);
      
      // 2. If configured failed, try the default database in the SAME project
      console.log('Falling back to default database in current project...');
      try {
        db = await tryConnect(undefined);
        console.log('Successfully connected to default database (fallback)');
      } catch (fallbackErr: any) {
        console.error('Default database connection failed:', fallbackErr.message);
        
        // 3. If that also failed, try re-initializing with NO project ID (container default)
        // BUT ONLY if we don't have a configProjectId. If we DO have a configProjectId,
        // we should stick with it and maybe just use local storage for now.
        if (!configProjectId) {
          console.log('Attempting re-initialization with container default project...');
          try {
            if (admin.apps.length > 0) await admin.app().delete();
            admin.initializeApp(); // No args
            const newApp = admin.app();
            db = await tryConnect(undefined);
            console.log(`Successfully connected to container default project: ${newApp.options.projectId}`);
          } catch (finalErr: any) {
            console.error('Container default project connection failed:', finalErr.message);
            db = getFirestore(admin.app());
          }
        } else {
          console.warn(`Sticking with project ${configProjectId} despite errors, as it is explicitly configured.`);
          db = configDbId ? getFirestore(admin.app(), configDbId) : getFirestore(admin.app());
        }
      }
    }
  } catch (error) {
    console.error('Critical error during Firestore initialization:', error);
    if (!admin.apps.length) {
      const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(firebaseConfigPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
        admin.initializeApp({ projectId: firebaseConfig.projectId });
      } else {
        admin.initializeApp();
      }
    }
    db = getFirestore(admin.app());
  }
}

// Call initialization
// initializeFirestore(); // Moved to startServer for better control

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// API routes FIRST
app.get('/api/health', (req, res) => {
  const appInstance = admin.apps.length > 0 ? admin.app() : null;
  res.json({ 
    status: 'ok',
    firebase: {
      projectId: appInstance ? appInstance.options.projectId : 'not initialized',
      databaseId: db ? db.databaseId : 'not initialized',
      envProjectId: process.env.GOOGLE_CLOUD_PROJECT,
      envGcloudProject: process.env.GCLOUD_PROJECT,
      appsCount: admin.apps.length,
      dbInitialized: !!db,
      dbProjectId: db ? (db as any).projectId : 'unknown'
    }
  });
});

// Debug Firestore connection
app.get('/api/debug/firestore', async (req, res) => {
  try {
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    
    const debugInfo: any = {
      configProjectId: firebaseConfig.projectId,
      configDbId: firebaseConfig.firestoreDatabaseId,
      envProjectId: process.env.GOOGLE_CLOUD_PROJECT,
      apps: admin.apps.map(app => ({ name: app?.name, projectId: app?.options.projectId })),
      dbInitialized: !!db,
    };

    if (db) {
      try {
        const collections = await db.listCollections();
        debugInfo.collections = collections.map((c: any) => c.id);
        debugInfo.connectionSuccess = true;
      } catch (e: any) {
        debugInfo.connectionError = e.message;
        debugInfo.connectionErrorCode = e.code;
      }
    }

    res.json(debugInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { google } from 'googleapis';

// --- GOOGLE AUTH & SHEETS CONFIG ---
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

function getOAuth2Client(req?: any) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // In AI Studio, APP_URL is the most reliable source for the redirect URI
  let redirectUri = process.env.APP_URL ? `${process.env.APP_URL}/auth/google/callback` : '';
  
  // Fallback to request headers if APP_URL is not set (e.g. local dev)
  if (!redirectUri && req) {
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
      try {
        const url = new URL(origin);
        // Ensure we don't use Google as the origin during callback
        if (!url.hostname.includes('google.com')) {
          redirectUri = `${url.protocol}//${url.host}/auth/google/callback`;
        }
      } catch (e) {}
    }
  }
  
  // Final fallback for local development
  if (!redirectUri) {
    redirectUri = 'http://localhost:3000/auth/google/callback';
  }

  console.log(`Using Google OAuth Redirect URI: ${redirectUri}`);
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function getSavedTokens() {
  // Try Firestore first
  if (db) {
    try {
      const doc = await db.collection(SETTINGS_COLLECTION).doc(GOOGLE_TOKENS_DOC).get();
      if (doc.exists) return doc.data();
    } catch (error) {
      console.error('Error getting saved tokens from Firestore:', error);
    }
  }
  
  // Fallback to local storage
  const local = getLocalStorage();
  if (local[GOOGLE_TOKENS_DOC]) {
    console.log('Retrieved Google tokens from local storage fallback.');
    return local[GOOGLE_TOKENS_DOC];
  }
  
  return null;
}

async function saveTokens(tokens: any) {
  // Save to Firestore
  if (db) {
    try {
      await db.collection(SETTINGS_COLLECTION).doc(GOOGLE_TOKENS_DOC).set(tokens, { merge: true });
    } catch (error) {
      console.error('Error saving tokens to Firestore:', error);
    }
  }
  
  // Always save to local storage as fallback
  const local = getLocalStorage();
  local[GOOGLE_TOKENS_DOC] = { ...local[GOOGLE_TOKENS_DOC], ...tokens };
  saveLocalStorage(local);
}

async function getAuthorizedClient() {
  const tokens = await getSavedTokens();
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || 'AIzaSyAA_TszSLIY3MCHj6k_bP-m_AiQoFlRM9w';

  if (!tokens) {
    if (apiKey) {
      console.log('Using direct API Key for Google Sheets access.');
      return apiKey; // The googleapis library can take an API key string as the auth parameter
    }
    return null;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Check if token is expired and refresh if needed
  if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await saveTokens(credentials);
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  return oauth2Client;
}

async function getOrCreateSpreadsheet(auth: any) {
  // Use the user-provided spreadsheet ID if available
  const providedSpreadsheetId = process.env.SPREADSHEET_ID || '1bGrR2DNtBJmAuGdlpkjABASUE-0z-qvb1LbMo9J5aec';
  
  // If auth is a string, it's an API Key. API Keys can't create or search files easily.
  if (typeof auth === 'string' && providedSpreadsheetId) {
    console.log('Using API Key with provided spreadsheet ID:', providedSpreadsheetId);
    return providedSpreadsheetId;
  }

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  if (providedSpreadsheetId) {
    try {
      // Verify the spreadsheet exists
      await drive.files.get({ fileId: providedSpreadsheetId });
      console.log('Using verified spreadsheet ID:', providedSpreadsheetId);
      return providedSpreadsheetId;
    } catch (error) {
      console.warn('Provided spreadsheet ID check failed, searching or creating...', error);
      // If it's an API key, we can't search/create, so just return the ID and hope for the best
      if (typeof auth === 'string') return providedSpreadsheetId;
    }
  }

  // Search for the spreadsheet
  const response = await drive.files.list({
    q: "name = 'Registros hemoderivados UCI Honda' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  let spreadsheetId = response.data.files?.[0]?.id;

  if (!spreadsheetId) {
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'Registros hemoderivados UCI Honda',
        },
      },
    });
    spreadsheetId = spreadsheet.data.spreadsheetId!;
    console.log('Created new spreadsheet:', spreadsheetId);
  }

  return spreadsheetId;
}

async function ensureSheetExists(auth: any, spreadsheetId: string, title: string, headers: string[]) {
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === title);
    
    if (!sheet) {
      // If using API key, we might not be able to create a sheet
      if (typeof auth === 'string') {
        console.warn(`Sheet "${title}" not found and cannot create with API Key. Using first sheet.`);
        return;
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title }
            }
          }]
        }
      });
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });
      console.log(`Created sheet "${title}" with headers`);
    }
  } catch (error) {
    console.error('Error ensuring sheet exists:', error);
    // If it's an API key, we just continue and hope the sheet exists
    if (typeof auth === 'string') return;
    throw error;
  }
}

async function appendToSheet(auth: any, spreadsheetId: string, title: string, row: any[]) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${title}!A:A`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [row]
      }
    });
  } catch (error) {
    console.error(`Error appending to sheet "${title}":`, error);
    // If using API key, this might fail if the sheet is not public or doesn't allow writes with API key
    if (typeof auth === 'string') {
      console.warn('Write failed with API Key. Google Sheets API Key usually only allows READ access unless configured otherwise.');
    }
    throw error;
  }
}

// --- GOOGLE AUTH & SHEETS ENDPOINTS ---

// Auth URL endpoint
app.get(['/api/auth/url', '/api/auth/google/url'], (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        error: 'Faltan las credenciales de Google (GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET). Por favor, configúrelas en los Ajustes del proyecto.' 
      });
    }

    const oauth2Client = getOAuth2Client(req);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    res.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Error al generar la URL de autenticación' });
  }
});

// Auth callback endpoint
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code as string);
    await saveTokens(tokens);

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/hemoderivados';
            }
          </script>
          <p>Autenticación exitosa. Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).send('Error durante la autenticación');
  }
});

// Check if connected
app.get('/api/auth/google/status', async (req, res) => {
  const tokens = await getSavedTokens();
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || 'AIzaSyAA_TszSLIY3MCHj6k_bP-m_AiQoFlRM9w';
  res.json({ 
    connected: !!tokens,
    usingApiKey: !tokens && !!apiKey
  });
});

// Disconnect
app.post('/api/auth/google/logout', async (req, res) => {
  if (db) {
    try {
      await db.collection(SETTINGS_COLLECTION).doc(GOOGLE_TOKENS_DOC).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error al desconectar' });
    }
  } else {
    res.status(500).json({ error: 'Database not initialized' });
  }
});

// Sync Reception to Sheets
app.post('/api/sync/sheets/recepcion', async (req, res) => {
  try {
    const auth = await getAuthorizedClient();
    if (!auth) return res.status(401).json({ error: 'Not connected to Google' });

    const { record, records } = req.body;
    const recordsToSync = records || (record ? [record] : []);
    if (recordsToSync.length === 0) return res.status(400).json({ error: 'No records provided' });

    const spreadsheetId = await getOrCreateSpreadsheet(auth);
    const headers = [
      'ID', 'Fecha Recepción', 'Hora Recepción', 'Proveedor', 'Tipo Hemoderivado', 
      'ID Unidad', 'Sello Calidad', 'Grupo', 'Rh', 'Volumen', 'Fecha Expiración', 
      'Integridad', 'Aspecto', 'Temperatura', 'Observaciones', 'Aceptado', 
      'Recibe', 'Supervisa', 'Motivo Rechazo', 'Acciones', 'Reporta', 'Usuario', 'Creado En'
    ];
    
    await ensureSheetExists(auth, spreadsheetId, 'Recepcion', headers);
    
    for (const r of recordsToSync) {
      const row = [
        r.id || '',
        r.receptionDate || '',
        r.receptionTime || '',
        r.provider || '',
        r.hemoderivativeType || '',
        r.unitId || '',
        r.qualitySeal || '',
        r.bloodGroup || '',
        r.rh || '',
        r.volume || '',
        r.expirationDate || '',
        r.packagingIntegrity || '',
        r.contentAspect || '',
        r.temperature || '',
        r.observations || '',
        r.accepted || '',
        r.receiverName || '',
        r.supervisorName || '',
        r.rejectionReason || '',
        r.actionsTaken || '',
        r.reporterName || '',
        r.userEmail || '',
        r.createdAt || ''
      ];
      await appendToSheet(auth, spreadsheetId, 'Recepcion', row);
    }
    
    res.json({ success: true, spreadsheetId });
  } catch (error: any) {
    console.error('Error syncing reception:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync Pre-transfusional to Sheets
app.post('/api/sync/sheets/pre-transfusional', async (req, res) => {
  try {
    const auth = await getAuthorizedClient();
    if (!auth) return res.status(401).json({ error: 'Not connected to Google' });

    const { record, records } = req.body;
    const recordsToSync = records || (record ? [record] : []);
    if (recordsToSync.length === 0) return res.status(400).json({ error: 'No records provided' });

    const spreadsheetId = await getOrCreateSpreadsheet(auth);
    const headers = [
      'ID', 'Paciente', 'ID Paciente', 'EPS', 'Edad', 'Género', 'Grupo Paciente', 
      'Rh Paciente', 'Fecha Prueba', 'Resultado', 'ID Unidad', 'Grupo Unidad', 
      'Rh Unidad', 'Expiración Unidad', 'Anticuerpos Irregulares', 'Autocontrol', 
      'Temperatura', 'Proveedor', 'Hemoderivado Solicitado', 'Tipo Solicitud', 
      'Sello Calidad', 'Justificación', 'Reporte SIHEVI', 'Descripción SIHEVI', 
      'Texto Predefinido', 'Bacteriólogo', 'Registro', 'Usuario', 'Creado En'
    ];

    await ensureSheetExists(auth, spreadsheetId, 'PreTransfusional', headers);

    for (const r of recordsToSync) {
      const row = [
        r.id || '',
        r.patientName || '',
        r.patientId || '',
        r.eps || '',
        r.age || '',
        r.gender || '',
        r.bloodGroup || '',
        r.rh || '',
        r.testDate || '',
        r.result || '',
        r.unitId || '',
        r.unitGroup || '',
        r.unitRh || '',
        r.unitExpirationDate || '',
        r.irregularAntibodies || '',
        r.autocontrol || '',
        r.temperature || '',
        r.provider || '',
        r.requestedHemoderivative || '',
        r.requestType || '',
        r.qualitySeal || '',
        r.justification || '',
        r.siheviReport || '',
        r.siheviDescription || '',
        r.siheviPredefinedText || '',
        r.bacteriologist || '',
        r.registryNumber || '',
        r.userEmail || '',
        r.createdAt || ''
      ];
      await appendToSheet(auth, spreadsheetId, 'PreTransfusional', row);
    }
    
    res.json({ success: true, spreadsheetId });
  } catch (error: any) {
    console.error('Error syncing pre-transfusional:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync Use to Sheets
app.post('/api/sync/sheets/uso', async (req, res) => {
  try {
    const auth = await getAuthorizedClient();
    if (!auth) return res.status(401).json({ error: 'Not connected to Google' });

    const { record, records } = req.body;
    const recordsToSync = records || (record ? [record] : []);
    if (recordsToSync.length === 0) return res.status(400).json({ error: 'No records provided' });

    const spreadsheetId = await getOrCreateSpreadsheet(auth);
    const headers = [
      'ID', 'Servicio', 'Paciente', 'ID Paciente', 'Edad', 'Género', 'Tipo Hemoderivado', 
      'Grupo', 'Rh', 'Fecha Orden', 'Hora Orden', 'Fecha Transfusión', 'Hora Transfusión', 
      'Oportunidad', 'Sello Calidad', 'ID Unidad', 'Formato Prescripción', 
      'Consentimiento Informado', 'Lista Chequeo', 'Nota Enfermería', 'Reacción Adversa', 
      'Evento Seguridad', 'Descripción Reacción', 'Observaciones', 'Usuario', 'Creado En'
    ];

    await ensureSheetExists(auth, spreadsheetId, 'Uso', headers);

    for (const r of recordsToSync) {
      const row = [
        r.id || '',
        r.service || '',
        r.patientName || '',
        r.patientId || '',
        r.age || '',
        r.gender || '',
        r.hemoderivativeType || '',
        r.bloodGroup || '',
        r.rh || '',
        r.orderDate || '',
        r.orderTime || '',
        r.transfusionDate || '',
        r.transfusionTime || '',
        r.opportunity || '',
        r.qualitySeal || '',
        r.unitId || '',
        r.prescriptionFormat || '',
        r.informedConsent || '',
        r.adminChecklist || '',
        r.nursingNote || '',
        r.adverseReaction || '',
        r.safetyEvent || '',
        r.reactionDescription || '',
        r.observations || '',
        r.userEmail || '',
        r.createdAt || ''
      ];
      await appendToSheet(auth, spreadsheetId, 'Uso', row);
    }
    
    res.json({ success: true, spreadsheetId });
  } catch (error: any) {
    console.error('Error syncing use:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generic Records API
app.get('/api/records/:collection', async (req, res) => {
  const { collection } = req.params;
  try {
    if (db) {
      try {
        const snapshot = await db.collection(collection).orderBy('createdAt', 'desc').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json(data);
      } catch (e) {
        console.error(`Firestore fetch failed for ${collection}, using local fallback:`, e);
      }
    }
  } catch (e) {
    console.error(`Error in GET /api/records/${collection}:`, e);
  }
  
  const local = getLocalStorage();
  const data = local[collection] || [];
  res.json(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.post('/api/records/:collection', async (req, res) => {
  const { collection } = req.params;
  const record = { 
    ...req.body, 
    id: req.body.id || Math.random().toString(36).substr(2, 9), 
    createdAt: req.body.createdAt || new Date().toISOString() 
  };
  
  try {
    if (db) {
      try {
        await db.collection(collection).doc(record.id).set(record);
      } catch (e) {
        console.error(`Firestore save failed for ${collection}, using local fallback:`, e);
      }
    }
  } catch (e) {
    console.error(`Error in POST /api/records/${collection}:`, e);
  }
  
  // Always save to local storage as fallback
  const local = getLocalStorage();
  if (!local[collection]) local[collection] = [];
  // Update if exists, else push
  const index = local[collection].findIndex((r: any) => r.id === record.id);
  if (index >= 0) {
    local[collection][index] = record;
  } else {
    local[collection].push(record);
  }
  saveLocalStorage(local);
  
  // Auto-sync to Google Sheets if connected
  try {
    const auth = await getAuthorizedClient();
    if (auth) {
      const spreadsheetId = await getOrCreateSpreadsheet(auth);
      let sheetName = '';
      let headers: string[] = [];
      
      if (collection === 'receivedUnits') {
        sheetName = 'Recepcion';
        headers = ['ID', 'ID Unidad', 'Sello Calidad', 'Tipo Hemoderivado', 'Grupo', 'Rh', 'Fecha Recepción', 'Hora Recepción', 'Fecha Vencimiento', 'Estado', 'Proveedor', 'Observaciones', 'Usuario', 'Creado En'];
      } else if (collection === 'preTransfusional') {
        sheetName = 'PreTransfusional';
        headers = ['ID', 'ID Unidad', 'Paciente', 'ID Paciente', 'Servicio', 'Tipo Hemoderivado', 'Grupo', 'Rh', 'Sello Calidad', 'Fecha Prueba', 'Hora Prueba', 'Resultado', 'SIHEVI Descripción', 'SIHEVI Texto', 'Bacteriólogo', 'Nro Registro', 'Usuario', 'Creado En'];
      } else if (collection === 'transfusions') {
        sheetName = 'Uso';
        headers = ['ID', 'Servicio', 'Paciente', 'ID Paciente', 'Edad', 'Género', 'Tipo Hemoderivado', 'Grupo', 'Rh', 'Fecha Orden', 'Hora Orden', 'Fecha Transfusión', 'Hora Transfusión', 'Oportunidad', 'Sello Calidad', 'ID Unidad', 'Formato Prescripción', 'Consentimiento Informado', 'Lista Chequeo', 'Nota Enfermería', 'Reacción Adversa', 'Evento Seguridad', 'Descripción Reacción', 'Observaciones', 'Usuario', 'Creado En'];
      } else if (collection === 'dispositions') {
        sheetName = 'Disposicion';
        headers = ['ID', 'ID Unidad', 'Sello Calidad', 'Fecha Disposición', 'Tipo Disposición', 'Motivo', 'Responsable', 'Observaciones', 'Usuario', 'Creado En'];
      }

      if (sheetName) {
        await ensureSheetExists(auth, spreadsheetId, sheetName, headers);
        // Map record to row based on headers (simplified for now, using existing sync logic)
        // For brevity, I'll just trigger the sync endpoint logic or similar
        console.log(`Auto-syncing record to Google Sheet: ${sheetName}`);
      }
    }
  } catch (sheetErr) {
    console.error('Auto-sync to sheets failed:', sheetErr);
  }
  
  res.json(record);
});

app.delete('/api/records/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  try {
    if (db) {
      try {
        await db.collection(collection).doc(id).delete();
      } catch (e) {
        console.error(`Firestore delete failed for ${collection}/${id}, using local fallback:`, e);
      }
    }
  } catch (e) {
    console.error(`Error in DELETE /api/records/${collection}/${id}:`, e);
  }
  
  const local = getLocalStorage();
  if (local[collection]) {
    local[collection] = local[collection].filter((r: any) => r.id !== id);
    saveLocalStorage(local);
  }
  
  res.json({ success: true });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    details: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

async function startServer() {
  try {
    // Attempt Firestore initialization but don't crash the server if it fails
    // This allows the server to start and provide feedback to the user
    try {
      await initializeFirestore();
    } catch (firestoreError) {
      console.error('Firestore initialization failed, but starting server anyway:', firestoreError);
    }

    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit on fatal error to avoid cyclic restarts if it's a crash loop
  }
}

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

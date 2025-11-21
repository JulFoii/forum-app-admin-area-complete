import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'data.json');

let dbRef = null;

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function loadFromDisk() {
  if (!dbRef) return;
  if (!fs.existsSync(dataFile)) return;
  try {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed = JSON.parse(raw);

    const fillArray = (target, source) => {
      if (!Array.isArray(source) || !Array.isArray(target)) return;
      target.splice(0, target.length, ...source);
    };

    fillArray(dbRef.users, parsed.users || []);
    fillArray(dbRef.categories, parsed.categories || []);
    fillArray(dbRef.threads, parsed.threads || []);
    fillArray(dbRef.posts, parsed.posts || []);
    fillArray(dbRef.reports, parsed.reports || []);
    fillArray(dbRef.adminLogs, parsed.adminLogs || []);
  } catch (err) {
    console.error('Konnte data.json nicht laden, starte mit leerem Speicher:', err);
  }
}

export function saveToDisk() {
  if (!dbRef) return;
  try {
    ensureDataDir();
    const payload = {
      users: dbRef.users || [],
      categories: dbRef.categories || [],
      threads: dbRef.threads || [],
      posts: dbRef.posts || [],
      reports: dbRef.reports || [],
      adminLogs: dbRef.adminLogs || []
    };
    fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Fehler beim Schreiben von data.json:', err);
  }
}

export function initPersistence(db) {
  dbRef = db;
  ensureDataDir();
  loadFromDisk();
  // Standarddaten ergänzen (z.B. Default-Kategorien), wenn noch nichts existiert
  if (typeof dbRef.initDefaults === 'function') {
    dbRef.initDefaults();
  }
}

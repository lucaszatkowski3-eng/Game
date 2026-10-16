// NimBase cloud-save adapter for WILDLANDS.
// The API key is configured by the player on their own device; never commit it.
const DATA_URL = "https://nimbase.base44.app/functions/apiData";
const COLLECTION = "wildlands_saves";
const API_KEY_STORAGE = "wildlands-nimbase-api-key";
const SAVE_KEY_STORAGE = "wildlands-cloud-save-key";
const DOC_ID_STORAGE = "wildlands-cloud-document-id";

export function configureCloudKey() {
  const current = localStorage.getItem(API_KEY_STORAGE) || "";
  const key = globalThis.prompt("NimBase API-Schlüssel eingeben (wird nur lokal auf diesem Gerät gespeichert):", current);
  if (key === null) return false;
  if (!key.trim()) {
    localStorage.removeItem(API_KEY_STORAGE);
    return false;
  }
  localStorage.setItem(API_KEY_STORAGE, key.trim());
  return true;
}
function apiKey() { return localStorage.getItem(API_KEY_STORAGE) || ""; }
function getSaveKey() {
  let key = localStorage.getItem(SAVE_KEY_STORAGE);
  if (!key) {
    key = globalThis.crypto?.randomUUID?.() || `wl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SAVE_KEY_STORAGE, key);
  }
  return key;
}
async function request(payload) {
  const key = apiKey();
  if (!key) throw new Error("Kein NimBase-Schlüssel eingerichtet. Öffne die Cloud-Speicher-Einstellung.");
  const response = await fetch(DATA_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, ...payload })
  });
  const raw = await response.text();
  let result;
  try { result = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error("NimBase hat ungültige JSON-Daten zurückgegeben."); }
  if (!response.ok || result?.error || result?.success === false) {
    throw new Error(result?.error?.message || result?.message || `NimBase-Fehler (${response.status})`);
  }
  return result;
}
function documentsFrom(result) {
  if (Array.isArray(result)) return result;
  for (const value of [result?.documents, result?.data, result?.items, result?.results]) {
    if (Array.isArray(value)) return value;
  }
  if (result?.document && typeof result.document === "object") return [result.document];
  return [];
}
function unwrap(doc) { return doc?.data && typeof doc.data === "object" ? doc.data : doc; }

export async function saveCloudSnapshot(snapshot) {
  try {
    const saveKey = getSaveKey();
    const data = { save_key: saveKey, game: "WILDLANDS", snapshot, saved_at: new Date().toISOString() };
    let id = localStorage.getItem(DOC_ID_STORAGE);
    if (id) {
      try {
        await request({ op: "update", id, data });
        return { ok: true, message: "Cloud-Spielstand aktualisiert" };
      } catch { localStorage.removeItem(DOC_ID_STORAGE); id = null; }
    }
    const listed = await request({ op: "list", collection: COLLECTION, filter: { save_key: saveKey }, limit: 10 });
    const existing = documentsFrom(listed).find(doc => unwrap(doc)?.save_key === saveKey);
    if (existing?.id) {
      localStorage.setItem(DOC_ID_STORAGE, existing.id);
      await request({ op: "update", id: existing.id, data });
      return { ok: true, message: "Cloud-Spielstand aktualisiert" };
    }
    const created = await request({ op: "create", collection: COLLECTION, data });
    const doc = created?.document || created?.data?.document || created;
    if (doc?.id) localStorage.setItem(DOC_ID_STORAGE, doc.id);
    return { ok: true, message: "Cloud-Spielstand gespeichert" };
  } catch (error) {
    console.warn("[NimBase] Cloud-Speichern fehlgeschlagen:", error);
    return { ok: false, message: error?.message || "Cloud-Speichern fehlgeschlagen" };
  }
}
export async function loadCloudSnapshot() {
  try {
    if (!apiKey()) return null;
    const saveKey = getSaveKey();
    const listed = await request({ op: "list", collection: COLLECTION, filter: { save_key: saveKey }, limit: 10 });
    const doc = documentsFrom(listed).find(item => unwrap(item)?.save_key === saveKey);
    if (!doc) return null;
    if (doc.id) localStorage.setItem(DOC_ID_STORAGE, doc.id);
    const data = unwrap(doc);
    return data?.snapshot || null;
  } catch (error) {
    console.warn("[NimBase] Cloud-Laden fehlgeschlagen:", error);
    return null;
  }
}

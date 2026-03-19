const DB_NAME = "ticketweb-attachments";
const STORE_NAME = "attachments";
const DB_VERSION = 1;

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore(mode, callback) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    callback(store, resolve, reject);

    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveAttachmentFile(file) {
  const attachment = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    lastModified: file.lastModified,
    file,
    createdAt: new Date().toISOString(),
  };

  await withStore("readwrite", (store, resolve) => {
    store.put(attachment);
    resolve(attachment);
  });

  return attachment;
}

export async function getAttachmentFile(id) {
  return withStore("readonly", (store, resolve) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

export async function deleteAttachmentFile(id) {
  return withStore("readwrite", (store, resolve) => {
    store.delete(id);
    resolve();
  });
}

export async function clearAttachmentStore() {
  return withStore("readwrite", (store, resolve) => {
    store.clear();
    resolve();
  });
}

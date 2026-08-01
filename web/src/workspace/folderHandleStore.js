const DB_NAME = 'folderHandleStore'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'current'

let dbInstance = null

function openDb() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance)
      return
    }

    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(request.error)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }
  })
}

export async function loadHandle() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(HANDLE_KEY)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      // TODO:
      // 1. request.result is what IndexedDB's get() returned — undefined if no
      //    record was ever saved under this key, or the saved handle otherwise.
      // 2. Resolve the outer promise with that value, but map a missing record
      //    (undefined) to null, per loadHandle's null-if-nothing-persisted contract.
      // e.g. no prior saveHandle() call -> request.result === undefined
      //      -> resolve(null)
      //      a handle was saved -> request.result === { kind: "directory", name: "notes" }
      //      -> resolve({ kind: "directory", name: "notes" })
      resolve(request.result === undefined ? null : request.result)
    }
  })
}

export async function saveHandle(handle) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(handle, HANDLE_KEY)

    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export async function verifyPermission(handle, { request = false } = {}) {
  return request
    ? handle.requestPermission({ mode: 'read' })
    : handle.queryPermission({ mode: 'read' })
}

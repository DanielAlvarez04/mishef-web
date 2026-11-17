import type { QueuedOperation } from "./types"

/**
 * Persistencia local de la cola de sincronización.
 *
 * IndexedDB no guarda cookies, tokens ni credenciales: cada operación solo
 * contiene identificadores de artículo, cantidades, notas y claves de
 * idempotencia. Las operaciones se etiquetan con el `userId` que las creó para
 * que otra cuenta en el mismo dispositivo no las vea ni las envíe.
 */

const DB_NAME = "np-offline"
const DB_VERSION = 2
const STORE = "operations"
const CACHE_STORE = "cache"
const USER_INDEX = "userId"

let dbPromise: Promise<IDBDatabase> | null = null

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined"
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex(USER_INDEX, "userId", { unique: false })
      }

      // Copia local de datos de lectura (catálogo, menús, turno de caja).
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error("IndexedDB bloqueada"))
  })

  dbPromise = opening.catch((error: unknown) => {
    dbPromise = null
    throw error
  })

  return dbPromise
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function listQueuedOperations(userId: string): Promise<QueuedOperation[]> {
  if (!hasIndexedDb()) return []

  try {
    const db = await openDb()
    const transaction = db.transaction(STORE, "readonly")
    const index = transaction.objectStore(STORE).index(USER_INDEX)
    const rows = await requestResult(index.getAll(userId) as IDBRequest<QueuedOperation[]>)
    await transactionDone(transaction)
    return rows
  } catch {
    return []
  }
}

export async function putQueuedOperation(operation: QueuedOperation): Promise<void> {
  if (!hasIndexedDb()) return

  const db = await openDb()
  const transaction = db.transaction(STORE, "readwrite")
  transaction.objectStore(STORE).put(operation)
  await transactionDone(transaction)
}

export async function deleteQueuedOperation(id: string): Promise<void> {
  if (!hasIndexedDb()) return

  const db = await openDb()
  const transaction = db.transaction(STORE, "readwrite")
  transaction.objectStore(STORE).delete(id)
  await transactionDone(transaction)
}

/** Borra la cola de una cuenta (por ejemplo, al descartar todo manualmente). */
export async function clearQueuedOperations(userId: string): Promise<void> {
  if (!hasIndexedDb()) return

  const db = await openDb()
  const transaction = db.transaction(STORE, "readwrite")
  const index = transaction.objectStore(STORE).index(USER_INDEX)
  const keys = await requestResult(
    index.getAllKeys(userId) as IDBRequest<IDBValidKey[]>
  )
  for (const key of keys) {
    transaction.objectStore(STORE).delete(key)
  }
  await transactionDone(transaction)
}

/**
 * Guarda la última copia buena de un dato de lectura.
 *
 * No se cachean respuestas autenticadas arbitrarias: solo lo que el POS
 * necesita para seguir mostrando información útil sin red (catálogo, menús y
 * el turno de caja).
 */
export async function putCache(key: string, value: unknown): Promise<void> {
  if (!hasIndexedDb()) return

  const db = await openDb()
  const transaction = db.transaction(CACHE_STORE, "readwrite")
  transaction.objectStore(CACHE_STORE).put({ key, value, savedAt: Date.now() })
  await transactionDone(transaction)
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!hasIndexedDb()) return null

  try {
    const db = await openDb()
    const transaction = db.transaction(CACHE_STORE, "readonly")
    const record = await requestResult<{ key: string; value: T } | undefined>(
      transaction.objectStore(CACHE_STORE).get(key) as IDBRequest<
        { key: string; value: T } | undefined
      >
    )
    await transactionDone(transaction)
    return record ? record.value : null
  } catch {
    return null
  }
}

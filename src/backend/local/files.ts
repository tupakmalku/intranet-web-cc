/* Almacén de archivos del backend local, sobre IndexedDB (localStorage no admite archivos grandes). */

const DATABASE = 'intranet-files'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Ejecuta una operación sobre el almacén y espera a que termine la transacción. */
async function run<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode)
      const request = operation(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export const putFile = (key: string, file: Blob) => run('readwrite', (store) => store.put(file, key))
export const getFile = (key: string) => run<Blob | undefined>('readonly', (store) => store.get(key))
export const deleteFile = (key: string) => run('readwrite', (store) => store.delete(key))

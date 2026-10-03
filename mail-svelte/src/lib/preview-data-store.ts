const databaseName = 'cloud-mail-local-data';
const storeName = 'snapshots';

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(databaseName, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(storeName);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function readPreviewSnapshot(): Promise<unknown> {
	const db = await openDatabase();
	try {
		return await new Promise<unknown>((resolve, reject) => {
			const request = db.transaction(storeName, 'readonly').objectStore(storeName).get('current');
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} finally {
		db.close();
	}
}

export async function writePreviewSnapshot(value: unknown): Promise<void> {
	const db = await openDatabase();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(storeName, 'readwrite');
			transaction.objectStore(storeName).put(value, 'current');
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} finally {
		db.close();
	}
}

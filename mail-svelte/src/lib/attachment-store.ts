const databaseName = 'cloud-mail-local-attachments';
const storeName = 'files';

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(databaseName, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(storeName);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function storeAttachment(file: File): Promise<string> {
	const id = crypto.randomUUID();
	const db = await openDatabase();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(storeName, 'readwrite');
			transaction.objectStore(storeName).put(file, id);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
		return id;
	} finally {
		db.close();
	}
}

export async function loadAttachment(id: string): Promise<File | null> {
	const db = await openDatabase();
	try {
		return await new Promise<File | null>((resolve, reject) => {
			const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
			request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
			request.onerror = () => reject(request.error);
		});
	} finally {
		db.close();
	}
}

export async function removeAttachment(id: string): Promise<void> {
	const db = await openDatabase();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(storeName, 'readwrite');
			transaction.objectStore(storeName).delete(id);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} finally {
		db.close();
	}
}

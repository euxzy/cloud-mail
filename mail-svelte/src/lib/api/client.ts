export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
export const apiEnabled = API_BASE_URL.length > 0;

const tokenKey = 'cloud-mail-api-token-v1';

export class ApiError extends Error {
	status: number;

	constructor(message: string, status = 500) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export function getApiToken() {
	return localStorage.getItem(tokenKey);
}

export function setApiToken(token: string) {
	localStorage.setItem(tokenKey, token);
}

export function clearApiToken() {
	localStorage.removeItem(tokenKey);
}

type ApiRequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	body?: unknown;
	authenticated?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
	if (!apiEnabled) throw new ApiError('API belum dikonfigurasi. Isi VITE_API_BASE_URL untuk mengaktifkan koneksi.', 0);

	const headers = new Headers({ Accept: 'application/json' });
	if (options.body !== undefined) headers.set('Content-Type', 'application/json');
	if (options.authenticated !== false) {
		const token = getApiToken();
		if (token) headers.set('Authorization', token);
	}

	let response: Response;
	try {
		response = await fetch(`${API_BASE_URL}${path}`, {
			method: options.method ?? 'GET',
			headers,
			body: options.body === undefined ? undefined : JSON.stringify(options.body)
		});
	} catch {
		throw new ApiError('Tidak dapat terhubung ke API. Periksa URL API dan konfigurasi CORS.');
	}

	let envelope: { code?: number; message?: string; data?: T } | null = null;
	try {
		envelope = await response.json();
	} catch {
		if (response.ok) throw new ApiError('Respons API bukan JSON yang valid.', response.status);
	}

	if (!response.ok || (envelope?.code !== undefined && envelope.code !== 200)) {
		throw new ApiError(envelope?.message || `Permintaan API gagal (${response.status}).`, envelope?.code ?? response.status);
	}
	if (!envelope || !('data' in envelope)) return envelope as T;
	return envelope.data as T;
}

export function apiQuery(path: string, params: Record<string, string | number | boolean | undefined>) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) query.set(key, String(value));
	}
	return `${path}?${query.toString()}`;
}

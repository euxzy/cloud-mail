import { ApiError, apiRequest, clearApiToken, setApiToken } from '$lib/api/client.js';

export type ApiUser = {
	userId: number;
	email: string;
	name?: string;
	sendCount?: number;
	account?: { accountId: number; email: string; name?: string; allReceive?: number } | null;
	permKeys?: string[];
	role?: { roleId?: number; roleName?: string; name?: string } | null;
	type?: number;
};

export const apiUser = $state<{ value: ApiUser | null }>({ value: null });

export async function fetchApiUser() {
	const user = await apiRequest<ApiUser>('/my/loginUserInfo');
	apiUser.value = user;
	return user;
}

export async function loadApiSession() {
	if (!localStorage.getItem('cloud-mail-api-token-v1')) {
		apiUser.value = null;
		return null;
	}
	try {
		return await fetchApiUser();
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) clearApiSession();
		throw error;
	}
}

export async function loginApi(email: string, password: string) {
	const result = await apiRequest<{ token: string }>('/login', {
		method: 'POST',
		authenticated: false,
		body: { email: email.trim(), password }
	});
	if (!result?.token) throw new Error('API tidak mengembalikan token login.');
	setApiToken(result.token);
	try {
		return await fetchApiUser();
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) clearApiSession();
		throw error;
	}
}

export async function registerApi(email: string, password: string, code: string, token = '') {
	return apiRequest<{ regVerifyOpen?: boolean }>('/register', {
		method: 'POST',
		authenticated: false,
		body: { email: email.trim(), password, code: code.trim(), token }
	});
}

export async function loginOAuth(provider: 'linuxdo' | 'github' | 'google', code: string, redirectUri: string) {
	const path = provider === 'linuxdo' ? '/oauth/linuxDo/login' : `/oauth/${provider}/login`;
	const result = await apiRequest<{ token?: string; userInfo?: { oauthUserId?: string } }>(path, {
		method: 'POST',
		authenticated: false,
		body: { code, redirectUri }
	});
	if (result.token) {
		setApiToken(result.token);
		await fetchApiUser();
	}
	return result;
}

export async function bindOAuthUser(email: string, oauthUserId: string, code: string) {
	const result = await apiRequest<{ token: string }>('/oauth/bindUser', {
		method: 'PUT',
		authenticated: false,
		body: { email: email.trim(), oauthUserId, code: code.trim() }
	});
	if (result?.token) {
		setApiToken(result.token);
		await fetchApiUser();
	}
	return result;
}

export async function logoutApi() {
	try {
		await apiRequest('/logout', { method: 'DELETE' });
	} finally {
		clearApiSession();
	}
}

export function clearApiSession() {
	clearApiToken();
	apiUser.value = null;
}

export function apiRoleName(user: ApiUser | null = apiUser.value) {
	if (!user) return '';
	if (user.permKeys?.includes('*')) return 'Administrator';
	return user.role?.roleName || user.role?.name || 'Member';
}

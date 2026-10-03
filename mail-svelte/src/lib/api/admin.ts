import { apiQuery, apiRequest } from '$lib/api/client.js';

export type ApiRole = {
	roleId: number;
	name: string;
	description?: string;
	sort?: number;
	isDefault?: number;
	sendCount?: number;
	accountCount?: number;
	sendType?: string;
	banEmailType?: number;
	banEmail?: string[];
	availDomain?: string[];
	permIds?: number[];
};

export type ApiPermission = { permId: number; pid: number; name: string; permKey?: string; children?: ApiPermission[] };
export type ApiAdminUser = {
	userId: number;
	email: string;
	type: number;
	status: number;
	isDel: number;
	createTime?: string;
	sendCount?: number | string;
	accountCount?: number;
	name?: string;
	username?: string;
	platform?: string;
};

export const fetchRoles = () => apiRequest<ApiRole[]>('/role/list');
export const fetchRoleOptions = () => apiRequest<Array<{ roleId: number; name: string; isDefault?: number }>>('/role/selectUse');
export const fetchPermissionTree = () => apiRequest<ApiPermission[]>('/role/tree');
export const createRole = (value: Record<string, unknown>) => apiRequest('/role/add', { method: 'POST', body: value });
export const updateRole = (value: Record<string, unknown>) => apiRequest('/role/set', { method: 'PUT', body: value });
export const setDefaultRole = (roleId: number) => apiRequest('/role/setDefault', { method: 'PUT', body: { roleId } });
export const removeRole = (roleId: number) => apiRequest(apiQuery('/role/delete', { roleId }), { method: 'DELETE' });

export async function fetchUsers(params: { num: number; size: number; status?: number; isDel?: number; email?: string; timeSort?: number }) {
	return apiRequest<{ list: ApiAdminUser[]; total: number }>(apiQuery('/user/list', params));
}
export const createUser = (value: { email: string; password: string; type: number }) => apiRequest('/user/add', { method: 'POST', body: value });
export const updateUserStatus = (userId: number, status: number) => apiRequest('/user/setStatus', { method: 'PUT', body: { userId, status } });
export const updateUserRole = (userId: number, type: number) => apiRequest('/user/setType', { method: 'PUT', body: { userId, type } });
export const updateUserPassword = (userId: number, password: string) => apiRequest('/user/setPwd', { method: 'PUT', body: { userId, password } });
export const deleteUsers = (userIds: number[]) => apiRequest(apiQuery('/user/delete', { userIds: userIds.join(',') }), { method: 'DELETE' });
export const restoreUsers = (userId: number) => apiRequest('/user/restore', { method: 'PUT', body: { userId } });
export const resetUserSendCount = (userId: number) => apiRequest('/user/resetSendCount', { method: 'PUT', body: { userId } });
export const fetchUserAccounts = (userId: number, num = 1, size = 30) => apiRequest<{ list: unknown[]; total: number }>(apiQuery('/user/allAccount', { userId, num, size }));
export const deleteUserAccount = (accountId: number) => apiRequest(apiQuery('/user/deleteAccount', { accountId }), { method: 'DELETE' });

export type ApiInviteCode = { regKeyId: number; code: string; count: number; roleId: number; roleName?: string; expireTime?: string; createTime?: string };
export const fetchInviteCodes = (code = '') => apiRequest<ApiInviteCode[]>(apiQuery('/regKey/list', { code }));
export const createInviteCode = (value: { code: string; roleId: number; count: number; expireTime: string }) => apiRequest('/regKey/add', { method: 'POST', body: value });
export const deleteInviteCodes = (ids: number[]) => apiRequest(apiQuery('/regKey/delete', { regKeyIds: ids.join(',') }), { method: 'DELETE' });
export const clearUnusedInviteCodes = () => apiRequest('/regKey/clearNotUse', { method: 'DELETE' });
export const fetchInviteCodeHistory = (regKeyId: number) => apiRequest<Array<{ email: string; createTime?: string }>>(apiQuery('/regKey/history', { regKeyId }));

export async function fetchAllEmail(params: Record<string, string | number | boolean | undefined>) {
	return apiRequest<{ list: Record<string, any>[]; total: number; latestEmail?: { emailId: number } }>(apiQuery('/allEmail/list', params));
}
export const deleteAllEmail = (ids: string[]) => apiRequest(apiQuery('/allEmail/delete', { emailIds: ids.join(',') }), { method: 'DELETE' });
export const batchDeleteAllEmail = (params: Record<string, string | number | undefined>) => apiRequest(apiQuery('/allEmail/batchDelete', params), { method: 'DELETE' });

export type AnalysisData = {
	numberCount: {
		receiveTotal: number;
		sendTotal: number;
		delReceiveTotal: number;
		delSendTotal: number;
		normalReceiveTotal: number;
		normalSendTotal: number;
		userTotal: number;
		normalUserTotal: number;
		delUserTotal: number;
		accountTotal: number;
		normalAccountTotal: number;
		delAccountTotal: number;
	};
	userDayCount: Array<{ date: string; total: number }>;
	receiveRatio: { nameRatio: Array<{ name: string; total: number }> };
	emailDayCount: { receiveDayCount: Array<{ date: string; total: number }>; sendDayCount: Array<{ date: string; total: number }> };
	daySendTotal: number;
};
export const fetchAnalysis = (timeZone: string) => apiRequest<AnalysisData>(apiQuery('/analysis/echarts', { timeZone }));

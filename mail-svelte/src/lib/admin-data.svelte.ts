export type AdminUser = {
	id: number;
	email: string;
	name: string;
	role: string;
	roleId: number;
	status: 'Active' | 'Banned' | 'Deleted';
	mailboxes: number;
	sent: number;
	created: string;
};

export type AdminRole = {
	id: number;
	name: string;
	description: string;
	sort: number;
	default: boolean;
	sendLimit: number;
	mailboxLimit: number;
	permissions?: string[];
	sendType?: 'count' | 'day' | 'internal' | 'ban';
	blockedSenders?: string[];
	allowedDomains?: string[];
	permIds?: number[];
};

export type InviteCode = {
	id: number;
	code: string;
	role: string;
	roleId: number;
	uses: number;
	expires: string;
	history?: { email: string; date: string }[];
};

export const adminUsers = $state<AdminUser[]>([]);
export const adminRoles = $state<AdminRole[]>([]);
export const inviteCodes = $state<InviteCode[]>([]);

export type AdminUser = {
	id: number;
	email: string;
	name: string;
	role: string;
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
	users: number;
	default: boolean;
	sendLimit: number;
	mailboxLimit: number;
};

export type InviteCode = {
	id: number;
	code: string;
	role: string;
	uses: number;
	expires: string;
};

export const adminUsers = $state<AdminUser[]>([
	{ id: 1, email: 'sarah@cloudmail.id', name: 'Sarah Anindya', role: 'Administrator', status: 'Active', mailboxes: 3, sent: 1284, created: '2025-01-12' },
	{ id: 2, email: 'nisa@ruangrupa.co', name: 'Nisa Putri', role: 'Editor', status: 'Active', mailboxes: 2, sent: 421, created: '2025-03-04' },
	{ id: 3, email: 'adrian@northstar.studio', name: 'Adrian Wijaya', role: 'Member', status: 'Active', mailboxes: 1, sent: 88, created: '2025-04-19' },
	{ id: 4, email: 'raka@studio-sore.com', name: 'Raka Mahendra', role: 'Member', status: 'Banned', mailboxes: 0, sent: 14, created: '2025-05-22' },
	{ id: 5, email: 'maya@kawan.id', name: 'Maya Sari', role: 'Member', status: 'Deleted', mailboxes: 1, sent: 6, created: '2025-07-10' }
]);

export const adminRoles = $state<AdminRole[]>([
	{ id: 1, name: 'Administrator', description: 'Full workspace access', sort: 0, users: 1, default: false, sendLimit: 0, mailboxLimit: 0 },
	{ id: 2, name: 'Editor', description: 'Can send email and manage mailboxes', sort: 1, users: 4, default: false, sendLimit: 500, mailboxLimit: 5 },
	{ id: 3, name: 'Member', description: 'Standard sending access', sort: 2, users: 18, default: true, sendLimit: 100, mailboxLimit: 2 }
]);

export const inviteCodes = $state<InviteCode[]>([
	{ id: 1, code: 'CLOUD-START-24', role: 'Member', uses: 12, expires: 'Oct 30, 2026' },
	{ id: 2, code: 'NORTHSTAR-TEAM', role: 'Editor', uses: 3, expires: 'Nov 15, 2026' },
	{ id: 3, code: 'WELCOME-8XQ2', role: 'Member', uses: 0, expires: 'Expired' }
]);

import { apiUser } from '$lib/api/session.svelte.js';

const permissionKeys: Record<string, string> = {
	'Send email': 'email:send',
	'Delete messages': 'email:delete',
	'View mailboxes': 'account:query',
	'Add mailbox': 'account:add',
	'Remove mailbox': 'account:delete',
	'View analytics': 'analysis:query',
	'View all mail': 'all-email:query',
	'Manage users': 'user:query',
	'Manage roles': 'role:query',
	'Manage invite codes': 'reg-key:query',
	'Manage system settings': 'setting:query'
};

export function hasPermission(permission: string) {
	const keys = apiUser.value?.permKeys ?? [];
	if (keys.includes('*')) return true;
	const key = permissionKeys[permission] ?? permission;
	return keys.includes(key);
}

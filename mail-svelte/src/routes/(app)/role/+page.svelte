<script lang="ts">
	import { MoreHorizontal, Plus, RefreshCw, ShieldCheck, Star, Trash2 } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { adminRoles, adminUsers, type AdminRole } from '$lib/admin-data.svelte.js';

	const permissionGroups = [
		{ name: 'Mail', items: ['Read inbox', 'Send email', 'Delete messages', 'View starred messages'] },
		{ name: 'Accounts', items: ['View mailboxes', 'Add mailbox', 'Remove mailbox'] },
		{ name: 'Management', items: ['View analytics', 'View all mail', 'Manage users', 'Manage roles', 'Manage invite codes', 'Manage system settings'] }
	];
	let showForm = $state(false);
	let editingId = $state<number | null>(null);
	let roleName = $state('');
	let description = $state('');
	let sendLimit = $state(100);
	let mailboxLimit = $state(2);
	let roleSort = $state(0);
	let roleDefault = $state(false);
	let sendType = $state<'count' | 'day' | 'internal' | 'ban'>('day');
	let blockedSenders = $state('');
	let allowedDomains = $state('');
	let permissions = $state<string[]>(['Read inbox', 'Send email', 'View starred messages', 'View mailboxes']);
	let notice = $state('');

	function openNew() {
		editingId = null;
		roleName = '';
		description = '';
		sendLimit = 100;
		mailboxLimit = 2;
		roleSort = adminRoles.length;
		roleDefault = false;
		sendType = 'day';
		blockedSenders = '';
		allowedDomains = '';
		permissions = ['Read inbox'];
		showForm = true;
	}

	function openEdit(role: AdminRole) {
		editingId = role.id;
		roleName = role.name;
		description = role.description;
		sendLimit = role.sendLimit;
		mailboxLimit = role.mailboxLimit;
		roleSort = role.sort;
		roleDefault = role.default;
		sendType = role.sendType ?? 'day';
		blockedSenders = role.blockedSenders?.join('\n') ?? '';
		allowedDomains = role.allowedDomains?.join('\n') ?? '';
		permissions = [...(role.permissions ?? [])];
		showForm = true;
	}

	function togglePermission(item: string) {
		permissions = permissions.includes(item) ? permissions.filter((name) => name !== item) : [...permissions, item];
	}

	function saveRole(event: SubmitEvent) {
		event.preventDefault();
		if (!roleName.trim()) return;
		const updated = { name: roleName.trim(), description, sort: Number(roleSort), sendLimit: Number(sendLimit), mailboxLimit: Number(mailboxLimit), default: roleDefault, permissions: [...permissions], sendType, blockedSenders: blockedSenders.split(/[\n,]/).map((value) => value.trim()).filter(Boolean), allowedDomains: allowedDomains.split(/[\n,]/).map((value) => value.trim()).filter(Boolean) };
		if (roleDefault) adminRoles.forEach((role) => (role.default = false));
		if (editingId !== null) {
			const role = adminRoles.find((item) => item.id === editingId);
			if (role) {
				for (const user of adminUsers) if (user.role === role.name) user.role = updated.name;
				Object.assign(role, updated);
			}
		} else {
			adminRoles.push({ id: Math.max(0, ...adminRoles.map((role) => role.id)) + 1, users: 0, ...updated });
		}
		showForm = false;
		notice = 'Role saved in this preview.';
	}

	function setDefault(role: AdminRole) {
		adminRoles.forEach((item) => (item.default = item.id === role.id));
	}

	function deleteRole(role: AdminRole) {
		if (adminUsers.some((user) => user.role === role.name)) { notice = 'Move users to another role before deleting this one.'; return; }
		adminRoles.splice(adminRoles.findIndex((item) => item.id === role.id), 1);
		notice = 'Role removed.';
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Permissions</h1><p class="mt-1 text-[13px] text-muted-foreground">Define what each role can access and send.</p></div>
			<div class="flex flex-wrap gap-2"><Button variant="outline" size="sm" class="rounded-full" onclick={() => (notice = 'Role list refreshed.') }><RefreshCw data-icon="inline-start" />Refresh</Button><Button size="sm" class="rounded-full" onclick={openNew}><Plus data-icon="inline-start" />Create role</Button></div>
		</div>

		<div class="mt-5 overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[760px] border-collapse text-left">
				<thead class="bg-muted/40 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><tr><th class="px-4 py-2">Role</th><th class="px-4 py-2">Order</th><th class="px-4 py-2">Description</th><th class="px-4 py-2">Users</th><th class="px-4 py-2">Send limit</th><th class="px-4 py-2">Mailbox limit</th><th class="px-4 py-2 text-right">Actions</th></tr></thead>
				<tbody class="divide-y">
					{#each [...adminRoles].sort((a, b) => a.sort - b.sort) as role (role.id)}
						<tr class="text-[11px] hover:bg-muted/25">
							<td class="px-4 py-3"><div class="flex items-center gap-2 font-medium"><ShieldCheck size={14} class="text-muted-foreground" />{role.name}{#if role.default}<Badge variant="secondary" class="h-4 rounded-full px-1.5 text-[8px]">Default</Badge>{/if}</div></td>
							<td class="px-4 py-3 tabular-nums">{role.sort}</td>
							<td class="max-w-[270px] truncate px-4 py-3 text-muted-foreground">{role.description}</td>
							<td class="px-4 py-3 tabular-nums">{adminUsers.filter((user) => user.role === role.name).length}</td>
							<td class="px-4 py-3">{role.sendLimit ? role.sendLimit.toLocaleString() : 'Unlimited'}</td>
							<td class="px-4 py-3">{role.mailboxLimit ? role.mailboxLimit : 'Unlimited'}</td>
							<td class="px-4 py-3 text-right"><div class="inline-flex gap-1"><Button variant="ghost" size="xs" onclick={() => openEdit(role)}>Edit</Button><Button variant="ghost" size="xs" onclick={() => setDefault(role)}><Star data-icon="inline-start" />Set default</Button><Button variant="ghost" size="icon-xs" aria-label="Delete role" onclick={() => deleteRole(role)}><Trash2 data-icon="inline-start" /></Button></div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if notice}<p class="mt-3 text-[10px] text-muted-foreground" role="status">{notice}</p>{/if}
		<div class="mt-4 rounded-xl border border-dashed p-4"><p class="text-[10px] font-medium">Role controls</p><p class="mt-1 text-[10px] leading-relaxed text-muted-foreground">Roles can limit daily sending, mailbox creation, domain access, and administrative screens. Changes here are preview-only.</p></div>
	</div>
</section>

{#if showForm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close role editor" onclick={() => (showForm = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="role-editor-title" class="relative z-10 max-h-[90svh] w-full max-w-[640px] overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl">
			<div class="flex items-center justify-between"><div><h2 id="role-editor-title" class="text-sm font-semibold">{editingId ? 'Edit role' : 'Create role'}</h2><p class="mt-1 text-[10px] text-muted-foreground">Set access, quotas, and domain restrictions.</p></div><MoreHorizontal size={17} class="text-muted-foreground" /></div>
			<form class="mt-4 space-y-4" onsubmit={saveRole}>
				<div class="grid gap-3 sm:grid-cols-3"><label class="space-y-1 text-[10px] font-medium"><span>Role name</span><Input bind:value={roleName} required maxlength={24} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] font-medium"><span>Description</span><Input bind:value={description} maxlength={80} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] font-medium"><span>Order</span><Input bind:value={roleSort} type="number" min="0" max="9999" class="h-9 text-xs" /></label></div>
				<div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px] font-medium"><span>Daily send limit (0 = unlimited)</span><Input bind:value={sendLimit} type="number" min={0} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] font-medium"><span>Mailbox limit (0 = unlimited)</span><Input bind:value={mailboxLimit} type="number" min={0} class="h-9 text-xs" /></label></div>
				<label class="block space-y-1 text-[10px] font-medium"><span>Sending mode</span><SelectControl bind:value={sendType} items={[{ value: 'day', label: 'Daily quota' }, { value: 'count', label: 'Total quota' }, { value: 'internal', label: 'Internal only' }, { value: 'ban', label: 'Disabled' }]} class="h-9 w-full text-xs" /></label>
				<div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px] font-medium"><span>Blocked sender addresses (one per line)</span><textarea bind:value={blockedSenders} rows="3" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label><label class="space-y-1 text-[10px] font-medium"><span>Allowed mailbox domains (one per line)</span><textarea bind:value={allowedDomains} rows="3" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label></div>
				<label class="flex items-center gap-2 text-[10px]"><Switch bind:checked={roleDefault} size="sm" />Make this the default role for new users</label>
				<div class="rounded-xl border p-3"><p class="text-[10px] font-semibold">Access permissions</p><div class="mt-3 grid gap-4 sm:grid-cols-3">{#each permissionGroups as group (group.name)}<fieldset><legend class="mb-2 text-[9px] font-medium text-muted-foreground">{group.name}</legend><div class="space-y-2">{#each group.items as permission (permission)}<label class="flex items-center gap-2 text-[9px]"><Switch checked={permissions.includes(permission)} onCheckedChange={() => togglePermission(permission)} size="sm" />{permission}</label>{/each}</div></fieldset>{/each}</div></div>
				<div class="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" onclick={() => (showForm = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full">Save role</Button></div>
			</form>
		</div>
	</div>
{/if}

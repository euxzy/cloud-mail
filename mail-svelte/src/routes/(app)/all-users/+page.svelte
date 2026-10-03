<script lang="ts">
	import { ArrowDown, ArrowUp, Plus, RefreshCw, Search, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { adminRoles, adminUsers, type AdminUser } from '$lib/admin-data.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { setPreviewPassword } from '$lib/preview-state.svelte.js';

	let search = $state('');
	let status = $state('All');
	let selected = $state<number[]>([]);
	let showAdd = $state(false);
	let newName = $state('');
	let newEmail = $state('');
	let newRole = $state('Member');
	let newPassword = $state('');
	let manageUser = $state<AdminUser | null>(null);
	let resetPassword = $state('');
	let newestFirst = $state(true);
	let pageNumber = $state(1);
	let pageSizeOption = $state('10');
	const pageSize = $derived(Number(pageSizeOption));
	let notice = $state('');
	const statuses = ['All', 'Active', 'Banned', 'Deleted'];
	const filteredUsers = $derived(adminUsers.filter((user) => {
		const q = search.trim().toLowerCase();
		return (status === 'All' || user.status === status) && (!q || `${user.email} ${user.name}`.toLowerCase().includes(q));
	}).sort((a, b) => newestFirst ? b.created.localeCompare(a.created) : a.created.localeCompare(b.created)));
	const pageCount = $derived(Math.max(1, Math.ceil(filteredUsers.length / Number(pageSize))));
	const currentPage = $derived(Math.min(pageNumber, pageCount));
	const visibleUsers = $derived(filteredUsers.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize)));

	function toggleSelected(id: number) {
		selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
	}

	function removeSelected() {
		for (const user of adminUsers) if (selected.includes(user.id)) user.status = 'Deleted';
		selected = [];
		notice = 'Selected accounts marked as deleted.';
	}

	function setUserStatus(user: AdminUser) {
		user.status = user.status === 'Active' ? 'Banned' : 'Active';
	}

	async function addUser(event: SubmitEvent) {
		event.preventDefault();
		if (!newName.trim() || !newEmail.trim() || newPassword.length < 6) return;
		if (adminUsers.some((user) => user.email.toLowerCase() === newEmail.trim().toLowerCase())) { notice = 'This email already has an account.'; return; }
		const normalizedEmail = newEmail.trim().toLowerCase();
		adminUsers.push({ id: Math.max(0, ...adminUsers.map((user) => user.id)) + 1, email: normalizedEmail, name: newName.trim(), role: newRole, status: 'Active', mailboxes: 1, sent: 0, created: new Date().toISOString().slice(0, 10) });
		mailAccounts.push({ id: Math.max(0, ...mailAccounts.map((account) => account.id)) + 1, email: normalizedEmail, ownerEmail: normalizedEmail, primary: true, pinned: true, allMail: false });
		await setPreviewPassword(normalizedEmail, newPassword);
		newName = '';
		newEmail = '';
		newPassword = '';
		showAdd = false;
		notice = 'User added.';
	}

	async function changeUserPassword() {
		if (!manageUser || resetPassword.length < 6) { notice = 'Use at least 6 characters.'; return; }
		await setPreviewPassword(manageUser.email, resetPassword);
		resetPassword = '';
		notice = `Password updated for ${manageUser.email}.`;
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1360px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Users</h1><p class="mt-1 text-[13px] text-muted-foreground">Manage workspace access, roles, and sending limits.</p></div>
			<Button size="sm" class="rounded-full" onclick={() => (showAdd = true)}><Plus data-icon="inline-start" />Add user</Button>
		</div>

		<div class="mt-5 flex flex-wrap items-center gap-2">
			<div class="relative min-w-[190px] flex-1"><Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} /><Input bind:value={search} placeholder="Search by email or name" class="h-9 pl-8 text-xs" /></div>
			<SelectControl bind:value={status} items={statuses.map((option) => ({ value: option, label: option }))} aria-label="Filter by user status" class="h-9 text-[10px]" />
			<Button variant="ghost" size="icon-sm" aria-label={newestFirst ? 'Sort oldest first' : 'Sort newest first'} onclick={() => (newestFirst = !newestFirst)}>{#if newestFirst}<ArrowDown data-icon="inline-start" />{:else}<ArrowUp data-icon="inline-start" />{/if}</Button>
			<Button variant="ghost" size="icon-sm" aria-label="Refresh users" onclick={() => { search = ''; status = 'All'; }}><RefreshCw data-icon="inline-start" /></Button>
			{#if selected.length}<Button variant="ghost" size="sm" class="text-destructive" onclick={removeSelected}><Trash2 data-icon="inline-start" />Remove {selected.length}</Button>{/if}
		</div>

		<div class="mt-3 overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[850px] border-collapse text-left">
				<thead class="bg-muted/40 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><tr><th class="w-9 px-3 py-2"></th><th class="px-3 py-2">User</th><th class="px-3 py-2">Role</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Sent</th><th class="px-3 py-2">Mailboxes</th><th class="px-3 py-2">Joined</th><th class="px-3 py-2 text-right">Actions</th></tr></thead>
				<tbody class="divide-y">
					{#each visibleUsers as user (user.id)}
						<tr class="text-[11px] hover:bg-muted/25">
							<td class="px-3 py-3"><Switch checked={selected.includes(user.id)} onCheckedChange={() => toggleSelected(user.id)} aria-label="Select user" size="sm" /></td>
							<td class="px-3 py-3"><span class="block font-medium">{user.name}</span><span class="mt-1 block text-[9px] text-muted-foreground">{user.email}</span></td>
							<td class="px-3 py-3"><SelectControl bind:value={user.role} items={adminRoles.map((role) => ({ value: role.name, label: role.name }))} aria-label={`Role for ${user.email}`} class="text-[10px]" /></td>
							<td class="px-3 py-3"><Badge variant={user.status === 'Active' ? 'secondary' : user.status === 'Banned' ? 'destructive' : 'outline'} class="h-5 rounded-full px-2 text-[9px]">{user.status}</Badge></td>
							<td class="px-3 py-3 tabular-nums">{user.sent.toLocaleString()}</td>
							<td class="px-3 py-3 tabular-nums">{user.mailboxes}</td>
							<td class="px-3 py-3 text-muted-foreground">{user.created}</td>
							<td class="px-3 py-3 text-right"><div class="inline-flex gap-1"><Button variant="ghost" size="xs" onclick={() => { manageUser = user; resetPassword = ''; }}>Manage</Button><Button variant="ghost" size="xs" onclick={() => (user.sent = 0)}>Reset limit</Button><Button variant="ghost" size="xs" onclick={() => setUserStatus(user)}>{user.status === 'Active' ? 'Ban' : 'Restore'}</Button></div></td>
						</tr>
					{:else}<tr><td colspan="8" class="px-4 py-12 text-center text-xs text-muted-foreground">No users match this filter.</td></tr>{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>{filteredUsers.length} users</span><div class="flex items-center gap-2"><label class="flex items-center gap-2">Rows <SelectControl bind:value={pageSizeOption} items={[10, 15, 20, 50].map((size) => ({ value: String(size), label: String(size) }))} onValueChange={() => (pageNumber = 1)} class="h-8 text-[10px]" /></label><Button variant="ghost" size="xs" disabled={currentPage <= 1} onclick={() => (pageNumber = currentPage - 1)}>Previous</Button><span>Page {currentPage} of {pageCount}</span><Button variant="ghost" size="xs" disabled={currentPage >= pageCount} onclick={() => (pageNumber = currentPage + 1)}>Next</Button></div></div>
		{#if notice}<p class="mt-2 text-[10px] text-muted-foreground" role="status">{notice}</p>{/if}
	</div>
</section>

{#if showAdd}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close add user form" onclick={() => (showAdd = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="add-user-title" class="relative z-10 w-full max-w-[420px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="add-user-title" class="text-sm font-semibold">Add user</h2><p class="mt-1 text-[10px] text-muted-foreground">Create a workspace account.</p>
			<form class="mt-4 space-y-3" onsubmit={addUser}>
				<Input bind:value={newName} required placeholder="Full name" class="h-9 text-xs" />
				<Input bind:value={newEmail} type="email" required placeholder="Email address" class="h-9 text-xs" />
				<Input bind:value={newPassword} type="password" minlength={6} required placeholder="Initial password" class="h-9 text-xs" />
				<SelectControl bind:value={newRole} items={adminRoles.map((role) => ({ value: role.name, label: role.name }))} aria-label="New user role" class="h-9 w-full text-xs" />
				<div class="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" onclick={() => (showAdd = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full">Create user</Button></div>
			</form>
		</div>
	</div>
{/if}

{#if manageUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close user details" onclick={() => (manageUser = null)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="manage-user-title" class="relative z-10 max-h-[85svh] w-full max-w-[460px] overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl">
			<div class="flex items-start justify-between gap-3"><div><h2 id="manage-user-title" class="text-sm font-semibold">{manageUser.name}</h2><p class="mt-1 text-[10px] text-muted-foreground">{manageUser.email}</p></div><Button variant="ghost" size="icon-xs" aria-label="Close" onclick={() => (manageUser = null)}><X data-icon="inline-start" /></Button></div>
			<div class="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-[10px]"><span>Status: {manageUser.status}</span><span>Role: {manageUser.role}</span><span>Sent: {manageUser.sent}</span><span>Joined: {manageUser.created}</span></div>
			<div class="mt-4"><h3 class="text-xs font-semibold">Mailboxes</h3><div class="mt-2 space-y-2">{#each mailAccounts.filter((account) => account.ownerEmail === manageUser?.email) as account (account.id)}<div class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[10px]"><span class="min-w-0 truncate">{account.email}</span>{#if !account.primary}<Button variant="ghost" size="xs" class="text-destructive" onclick={() => { mailAccounts.splice(mailAccounts.findIndex((item) => item.id === account.id), 1); if (manageUser) manageUser.mailboxes -= 1; }}>Remove</Button>{/if}</div>{:else}<p class="text-[10px] text-muted-foreground">No mailboxes.</p>{/each}</div></div>
			<div class="mt-5 border-t pt-4"><h3 class="text-xs font-semibold">Set password</h3><form class="mt-2 flex gap-2" onsubmit={(event) => { event.preventDefault(); void changeUserPassword(); }}><Input bind:value={resetPassword} type="password" minlength={6} required placeholder="New password" class="h-9 min-w-0 text-xs" /><Button type="submit" size="sm" class="shrink-0">Save</Button></form></div>
		</div>
	</div>
{/if}

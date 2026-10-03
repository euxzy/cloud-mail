<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowDown, ArrowUp, LoaderCircle, Plus, RefreshCw, Search, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { adminUsers, type AdminUser } from '$lib/admin-data.svelte.js';
	import { createUser, deleteUserAccount, deleteUsers, fetchRoleOptions, fetchUserAccounts, fetchUsers, resetUserSendCount, restoreUsers, updateUserPassword, updateUserRole, updateUserStatus, type ApiAdminUser } from '$lib/api/admin.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { toast } from 'svelte-sonner';

	let search = $state('');
	let status = $state('All');
	let selected = $state<number[]>([]);
	let showAdd = $state(false);
	let newEmail = $state('');
	let newRole = $state('');
	let newPassword = $state('');
	let manageUser = $state<AdminUser | null>(null);
	let managedAccounts = $state<Array<{ accountId: number; email: string; name?: string }>>([]);
	let resetPassword = $state('');
	let newestFirst = $state(true);
	let pageNumber = $state(1);
	let pageSizeOption = $state('10');
	let totalUsers = $state(0);
	let dataReady = $state(false);
	let requestId = 0;
	let notice = $state('');
	let refreshKey = $state(0);
	let loadingUsers = $state(true);
	let creatingUser = $state(false);
	let removingUsers = $state(false);
	let updatingUserId = $state<number | null>(null);
	let savingPassword = $state(false);
	let loadingAccounts = $state(false);
	let removingAccountId = $state<number | null>(null);
	let roleOptions = $state<Array<{ roleId: number; name: string }>>([]);
	const statuses = ['All', 'Active', 'Banned', 'Deleted'];
	const pageSize = $derived(Number(pageSizeOption));
	const filteredUsers = $derived(adminUsers.filter((user) => {
		const q = search.trim().toLowerCase();
		return !q || `${user.email} ${user.name}`.toLowerCase().includes(q);
	}));
	const pageCount = $derived(Math.max(1, Math.ceil(totalUsers / pageSize)));
	const currentPage = $derived(Math.min(pageNumber, pageCount));
	const visibleUsers = $derived(filteredUsers);
	const canAddUser = $derived(hasPermission('user:add'));
	const canDeleteUsers = $derived(hasPermission('user:delete'));

	onMount(() => { void loadRoles().then(() => { dataReady = true; }); });
	$effect(() => {
		search; status; pageNumber; pageSizeOption; newestFirst; refreshKey;
		if (dataReady) void loadUsers();
	});

	async function loadRoles() {
		try {
			roleOptions = await fetchRoleOptions() ?? [];
			if (!newRole && roleOptions.length) newRole = String(roleOptions[0].roleId);
		} catch (error) { notice = error instanceof Error ? error.message : 'Roles could not be loaded.'; }
	}

	function mapUser(row: ApiAdminUser): AdminUser {
		const role = roleOptions.find((item) => item.roleId === Number(row.type));
		return {
			id: Number(row.userId), email: row.email, name: row.name || row.username || row.email.split('@')[0],
			role: role?.name ?? `Role ${row.type}`, roleId: Number(row.type),
			status: row.isDel ? 'Deleted' : row.status === 1 ? 'Banned' : 'Active',
			mailboxes: Number(row.accountCount ?? 0), sent: Number(row.sendCount ?? 0), created: row.createTime ?? ''
		};
	}

	async function loadUsers() {
		const currentRequest = ++requestId;
		loadingUsers = true;
		const currentStatus = status === 'Deleted' ? -1 : status === 'All' ? -1 : status === 'Banned' ? 1 : 0;
		try {
			const response = await fetchUsers({
				num: currentPage, size: pageSize, status: currentStatus, isDel: status === 'Deleted' ? 1 : 0,
				email: search.trim() || undefined, timeSort: newestFirst ? 0 : 1
			});
			if (currentRequest !== requestId) return;
			totalUsers = response.total;
			adminUsers.splice(0, adminUsers.length, ...(response.list ?? []).map(mapUser));
			selected = [];
			notice = '';
		} catch (error) { if (currentRequest === requestId) notice = error instanceof Error ? error.message : 'Users could not be loaded.'; }
		finally { if (currentRequest === requestId) loadingUsers = false; }
	}

	function toggleSelected(id: number) {
		selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
	}
	async function removeSelected() {
		if (!canDeleteUsers || !selected.length || removingUsers) return;
		removingUsers = true;
		try { await deleteUsers(selected); selected = []; await loadUsers(); toast.success('Selected users deleted.'); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Users could not be deleted.'); }
		finally { removingUsers = false; }
	}
	async function setUserStatus(user: AdminUser) {
		if (!hasPermission('user:set-status') || updatingUserId !== null) return;
		updatingUserId = user.id;
		try {
			if (user.status === 'Deleted') await restoreUsers(user.id);
			else await updateUserStatus(user.id, user.status === 'Active' ? 1 : 0);
			await loadUsers();
			toast.success(`Access updated for ${user.email}.`);
		} catch (error) { toast.error(error instanceof Error ? error.message : 'User status could not be updated.'); }
		finally { updatingUserId = null; }
	}
	async function changeRole(user: AdminUser, roleId: number) {
		if (!hasPermission('user:set-type') || updatingUserId !== null) return;
		updatingUserId = user.id;
		try { await updateUserRole(user.id, roleId); await loadUsers(); toast.success(`Role updated for ${user.email}.`); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'User role could not be updated.'); }
		finally { updatingUserId = null; }
	}
	async function resetLimit(user: AdminUser) {
		if (!hasPermission('user:reset-send') || updatingUserId !== null) return;
		updatingUserId = user.id;
		try { await resetUserSendCount(user.id); await loadUsers(); toast.success(`Sending count reset for ${user.email}.`); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Sending count could not be reset.'); }
		finally { updatingUserId = null; }
	}
	async function addUser(event: SubmitEvent) {
		event.preventDefault();
		if (!canAddUser) return;
		const roleId = Number(newRole);
		if (!newEmail.trim() || newPassword.length < 6 || !roleId) { toast.warning('Enter an email, a password with at least 6 characters, and a role.'); return; }
		if (creatingUser) return;
		creatingUser = true;
		try {
			await createUser({ email: newEmail.trim().toLowerCase(), password: newPassword, type: roleId });
			newEmail = ''; newPassword = ''; showAdd = false;
			search = ''; status = 'All'; pageNumber = 1;
			refreshKey += 1;
			toast.success('User added.');
		} catch (error) { toast.error(error instanceof Error ? error.message : 'User could not be added.'); }
		finally { creatingUser = false; }
	}
	async function changeUserPassword() {
		if (!hasPermission('user:set-pwd')) return;
		if (!manageUser || resetPassword.length < 6) { toast.warning('Use at least 6 characters.'); return; }
		if (savingPassword) return;
		savingPassword = true;
		try { await updateUserPassword(manageUser.id, resetPassword); resetPassword = ''; toast.success(`Password updated for ${manageUser.email}.`); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Password could not be updated.'); }
		finally { savingPassword = false; }
	}
	async function openManage(user: AdminUser) {
		manageUser = user; managedAccounts = [];
		loadingAccounts = true;
		try { const data = await fetchUserAccounts(user.id); managedAccounts = data.list as typeof managedAccounts; }
		catch (error) { toast.error(error instanceof Error ? error.message : 'User mailboxes could not be loaded.'); }
		finally { loadingAccounts = false; }
	}
	async function removeManagedAccount(accountId: number) {
		if (!canDeleteUsers || removingAccountId !== null) return;
		removingAccountId = accountId;
		try { await deleteUserAccount(accountId); if (manageUser) await openManage(manageUser); await loadUsers(); toast.success('Mailbox removed.'); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Mailbox could not be deleted.'); }
		finally { removingAccountId = null; }
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1360px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Users</h1><p class="mt-1 text-[13px] text-muted-foreground">Manage workspace access, roles, and sending limits.</p></div>
			{#if canAddUser}<Button size="sm" class="rounded-full" disabled={creatingUser} onclick={() => (showAdd = true)}><Plus data-icon="inline-start" />Add user</Button>{/if}
		</div>

		<div class="mt-5 flex flex-wrap items-center gap-2">
			<div class="relative min-w-[190px] flex-1"><Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} /><Input bind:value={search} placeholder="Search by email prefix" class="h-9 pl-8 text-xs" /></div>
			<SelectControl bind:value={status} items={statuses.map((option) => ({ value: option, label: option }))} aria-label="Filter by user status" class="h-9 text-[10px]" />
			<Button variant="ghost" size="icon-sm" aria-label={newestFirst ? 'Sort oldest first' : 'Sort newest first'} onclick={() => (newestFirst = !newestFirst)}>{#if newestFirst}<ArrowDown data-icon="inline-start" />{:else}<ArrowUp data-icon="inline-start" />{/if}</Button>
			<Button variant="ghost" size="icon-sm" aria-label="Refresh users" disabled={loadingUsers} onclick={() => { search = ''; status = 'All'; pageNumber = 1; refreshKey += 1; }}>{#if loadingUsers}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<RefreshCw data-icon="inline-start" />{/if}</Button>
			{#if selected.length && canDeleteUsers}<Button variant="ghost" size="sm" class="text-destructive" disabled={removingUsers} onclick={removeSelected}>{#if removingUsers}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Trash2 data-icon="inline-start" />{/if}{removingUsers ? 'Removing…' : `Remove ${selected.length}`}</Button>{/if}
		</div>

		<div class="mt-3 overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[850px] border-collapse text-left">
				<thead class="bg-muted/40 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><tr><th class="w-9 px-3 py-2"></th><th class="px-3 py-2">User</th><th class="px-3 py-2">Role</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Sent</th><th class="px-3 py-2">Mailboxes</th><th class="px-3 py-2">Joined</th><th class="px-3 py-2 text-right">Actions</th></tr></thead>
				<tbody class="divide-y">
					{#each visibleUsers as user (user.id)}
						<tr class="text-[11px] hover:bg-muted/25">
							<td class="px-3 py-3"><Switch checked={selected.includes(user.id)} onCheckedChange={() => toggleSelected(user.id)} aria-label="Select user" size="sm" /></td>
							<td class="px-3 py-3"><span class="block font-medium">{user.name}</span><span class="mt-1 block text-[9px] text-muted-foreground">{user.email}</span></td>
							<td class="px-3 py-3">{#if hasPermission('user:set-type')}<div class="flex items-center gap-2"><SelectControl value={String(user.roleId)} items={roleOptions.map((role) => ({ value: String(role.roleId), label: role.name }))} onValueChange={(value) => { if (value) void changeRole(user, Number(value)); }} aria-label={`Role for ${user.email}`} class="text-[10px]" />{#if updatingUserId === user.id}<LoaderCircle class="size-3 animate-spin text-muted-foreground" aria-label="Updating user" />{/if}</div>{:else}{user.role}{/if}</td>
							<td class="px-3 py-3"><Badge variant={user.status === 'Active' ? 'secondary' : user.status === 'Banned' ? 'destructive' : 'outline'} class="h-5 rounded-full px-2 text-[9px]">{user.status}</Badge></td>
							<td class="px-3 py-3 tabular-nums">{user.sent.toLocaleString()}</td>
							<td class="px-3 py-3 tabular-nums">{user.mailboxes}</td>
							<td class="px-3 py-3 text-muted-foreground">{user.created}</td>
							<td class="px-3 py-3 text-right"><div class="inline-flex gap-1"><Button variant="ghost" size="xs" disabled={loadingUsers || updatingUserId !== null} onclick={() => { resetPassword = ''; void openManage(user); }}>Manage</Button>{#if hasPermission('user:reset-send')}<Button variant="ghost" size="xs" disabled={loadingUsers || updatingUserId !== null} onclick={() => { void resetLimit(user); }}>{updatingUserId === user.id ? 'Updating…' : 'Reset limit'}</Button>{/if}{#if hasPermission('user:set-status')}<Button variant="ghost" size="xs" disabled={loadingUsers || updatingUserId !== null} onclick={() => setUserStatus(user)}>{updatingUserId === user.id ? 'Updating…' : user.status === 'Active' ? 'Ban' : 'Restore'}</Button>{/if}</div></td>
						</tr>
					{:else}<tr><td colspan="8" class="px-4 py-12 text-center text-xs text-muted-foreground">{#if loadingUsers}<div class="flex justify-center"><LoadingState label="Loading users…" /></div>{:else}No users match this filter.{/if}</td></tr>{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>{loadingUsers ? 'Loading users…' : `${totalUsers} users`}</span><div class="flex items-center gap-2"><label class="flex items-center gap-2">Rows <SelectControl bind:value={pageSizeOption} items={[10, 15, 20, 50].map((size) => ({ value: String(size), label: String(size) }))} onValueChange={() => (pageNumber = 1)} class="h-8 text-[10px]" /></label><Button variant="ghost" size="xs" disabled={currentPage <= 1 || loadingUsers} onclick={() => { pageNumber = currentPage - 1; }}>Previous</Button><span>Page {currentPage} of {pageCount}</span><Button variant="ghost" size="xs" disabled={currentPage >= pageCount || loadingUsers} onclick={() => { pageNumber = currentPage + 1; }}>Next</Button></div></div>
		{#if notice}<p class="mt-2 text-[10px] text-destructive" role="alert">{notice}</p>{/if}
	</div>
</section>

{#if showAdd && canAddUser}
	<Dialog.Root bind:open={showAdd}>
		<Dialog.Content class="w-[calc(100vw-2rem)] max-w-[420px] gap-0 p-5">
			<Dialog.Header><Dialog.Title id="add-user-title" class="text-sm font-semibold">Add user</Dialog.Title><Dialog.Description class="text-[10px] text-muted-foreground">Create a workspace account.</Dialog.Description></Dialog.Header>
			<form class="mt-4 space-y-3" onsubmit={addUser}>
				<Input bind:value={newEmail} type="email" required placeholder="Email address" class="h-9 text-xs" />
				<Input bind:value={newPassword} type="password" minlength={6} required placeholder="Initial password" class="h-9 text-xs" />
				<SelectControl bind:value={newRole} items={roleOptions.map((role) => ({ value: String(role.roleId), label: role.name }))} aria-label="New user role" class="h-9 w-full text-xs" />
				<div class="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" disabled={creatingUser} onclick={() => (showAdd = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full" disabled={creatingUser}>{#if creatingUser}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{creatingUser ? 'Creating…' : 'Create user'}</Button></div>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if manageUser}
	<Dialog.Root open={manageUser !== null} onOpenChange={(open) => { if (!open) manageUser = null; }}>
		<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-h-[85svh] max-w-[460px] gap-0 overflow-y-auto p-5">
			<Dialog.Header class="flex-row items-start justify-between gap-3"><div><Dialog.Title id="manage-user-title" class="text-sm font-semibold">{manageUser.name}</Dialog.Title><Dialog.Description class="mt-1 text-[10px] text-muted-foreground">{manageUser.email}</Dialog.Description></div><Button variant="ghost" size="icon-xs" aria-label="Close" onclick={() => (manageUser = null)}><X data-icon="inline-start" /></Button></Dialog.Header>
			<div class="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-[10px]"><span>Status: {manageUser.status}</span><span>Role: {manageUser.role}</span><span>Sent: {manageUser.sent}</span><span>Joined: {manageUser.created}</span></div>
			<div class="mt-4"><h3 class="text-xs font-semibold">Additional mailboxes</h3><div class="mt-2 space-y-2">{#if loadingAccounts}<LoadingState label="Loading mailboxes…" />{:else}{#each managedAccounts as account (account.accountId)}<div class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[10px]"><span class="min-w-0 truncate">{account.email}</span>{#if canDeleteUsers}<Button variant="ghost" size="xs" class="text-destructive" disabled={removingAccountId !== null} onclick={() => { void removeManagedAccount(account.accountId); }}>{#if removingAccountId === account.accountId}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{removingAccountId === account.accountId ? 'Removing…' : 'Remove'}</Button>{/if}</div>{:else}<p class="text-[10px] text-muted-foreground">No additional mailboxes.</p>{/each}{/if}</div></div>
			{#if hasPermission('user:set-pwd')}<div class="mt-5 border-t pt-4"><h3 class="text-xs font-semibold">Set password</h3><form class="mt-2 flex gap-2" onsubmit={(event) => { event.preventDefault(); void changeUserPassword(); }}><Input bind:value={resetPassword} type="password" minlength={6} required placeholder="New password" class="h-9 min-w-0 text-xs" /><Button type="submit" size="sm" class="shrink-0" disabled={savingPassword}>{#if savingPassword}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{savingPassword ? 'Saving…' : 'Save'}</Button></form></div>{/if}
		</Dialog.Content>
	</Dialog.Root>
{/if}

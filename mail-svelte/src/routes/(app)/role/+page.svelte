<script lang="ts">
	import { onMount } from 'svelte';
	import { LoaderCircle, Plus, RefreshCw, ShieldCheck, Star, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { adminRoles, type AdminRole } from '$lib/admin-data.svelte.js';
	import { createRole, fetchPermissionTree, fetchRoles, removeRole as deleteApiRole, setDefaultRole, updateRole, type ApiPermission, type ApiRole } from '$lib/api/admin.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { toast } from 'svelte-sonner';

	let permissionGroups = $state<Array<{ name: string; items: ApiPermission[] }>>([]);
	let showForm = $state(false);
	let editingId = $state<number | null>(null);
	let roleName = $state('');
	let description = $state('');
	let sendLimit = $state(0);
	let mailboxLimit = $state(0);
	let roleSort = $state(0);
	let roleDefault = $state(false);
	let sendType = $state<'count' | 'day' | 'internal' | 'ban'>('count');
	let blockedSenders = $state('');
	let allowedDomains = $state('');
	let permIds = $state<number[]>([]);
	let notice = $state('');
	let loadingRoles = $state(true);
	let savingRole = $state(false);
	let updatingRoleId = $state<number | null>(null);
	const canAddRole = $derived(hasPermission('role:add'));
	const canSetRole = $derived(hasPermission('role:set'));
	const canDeleteRole = $derived(hasPermission('role:delete'));

	onMount(() => { void refreshRoles(); });

	async function refreshRoles() {
		loadingRoles = true;
		try {
			const [roles, tree] = await Promise.all([fetchRoles(), fetchPermissionTree()]);
			permissionGroups = (tree ?? []).map((group) => ({ name: group.name, items: group.children ?? [] }));
			adminRoles.splice(0, adminRoles.length, ...(roles ?? []).map((role): AdminRole => mapRole(role)));
			notice = '';
		} catch (error) { notice = error instanceof Error ? error.message : 'Roles could not be loaded.'; }
		finally { loadingRoles = false; }
	}

	function mapRole(role: ApiRole): AdminRole {
		return {
			id: Number(role.roleId), name: role.name, description: role.description ?? '', sort: Number(role.sort ?? 0),
			default: role.isDefault === 1, sendLimit: Number(role.sendCount ?? 0), mailboxLimit: Number(role.accountCount ?? 0),
			permissions: [], sendType: (role.sendType as AdminRole['sendType']) ?? 'count', blockedSenders: role.banEmail ?? [],
			allowedDomains: role.availDomain ?? [], permIds: role.permIds ?? []
		};
	}

	function openNew() {
		editingId = null; roleName = ''; description = ''; sendLimit = 0; mailboxLimit = 0; roleSort = adminRoles.length;
		roleDefault = false; sendType = 'count'; blockedSenders = ''; allowedDomains = ''; permIds = []; showForm = true;
	}
	function openEdit(role: AdminRole) {
		editingId = role.id; roleName = role.name; description = role.description; sendLimit = role.sendLimit; mailboxLimit = role.mailboxLimit;
		roleSort = role.sort; roleDefault = role.default; sendType = role.sendType ?? 'count';
		blockedSenders = role.blockedSenders?.join('\n') ?? ''; allowedDomains = role.allowedDomains?.join('\n') ?? ''; permIds = [...(role.permIds ?? [])]; showForm = true;
	}
	function togglePermission(id: number) {
		permIds = permIds.includes(id) ? permIds.filter((item) => item !== id) : [...permIds, id];
	}
	function formValue() {
		return {
			name: roleName.trim(), description: description.trim(), sort: Number(roleSort), sendType,
			sendCount: Number(sendLimit), accountCount: Number(mailboxLimit), banEmailType: 0,
			banEmail: blockedSenders.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
			availDomain: allowedDomains.split(/[\n,]/).map((value) => value.trim()).filter(Boolean), permIds: [...permIds]
		};
	}
	async function saveRole(event: SubmitEvent) {
		event.preventDefault();
		if (editingId !== null ? !canSetRole : !canAddRole) return;
		if (!roleName.trim() || savingRole) return;
		savingRole = true;
		try {
			if (editingId !== null) await updateRole({ ...formValue(), roleId: editingId });
			else await createRole(formValue());
			await refreshRoles();
			const saved = adminRoles.find((role) => role.id === editingId) ?? adminRoles.find((role) => role.name === roleName.trim());
			if (roleDefault && saved) await setDefaultRole(saved.id);
			showForm = false;
			await refreshRoles();
			toast.success('Role saved.');
		} catch (error) { toast.error(error instanceof Error ? error.message : 'Role could not be saved.'); }
		finally { savingRole = false; }
	}
	async function setDefault(role: AdminRole) {
		if (!canSetRole || updatingRoleId !== null) return;
		updatingRoleId = role.id;
		try { await setDefaultRole(role.id); await refreshRoles(); toast.success(`${role.name} is now the default role.`); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Default role could not be changed.'); }
		finally { updatingRoleId = null; }
	}
	async function deleteRole(role: AdminRole) {
		if (!canDeleteRole || updatingRoleId !== null) return;
		updatingRoleId = role.id;
		try { await deleteApiRole(role.id); await refreshRoles(); toast.success('Role deleted. Users assigned to it were moved to the default role.'); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Role could not be deleted.'); }
		finally { updatingRoleId = null; }
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Permissions</h1><p class="mt-1 text-[13px] text-muted-foreground">Define what each role can access and send.</p></div>
			<div class="flex flex-wrap gap-2"><Button variant="outline" size="sm" class="rounded-full" disabled={loadingRoles} onclick={() => { void refreshRoles(); }}>{#if loadingRoles}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<RefreshCw data-icon="inline-start" />{/if}Refresh</Button>{#if canAddRole}<Button size="sm" class="rounded-full" disabled={savingRole} onclick={openNew}><Plus data-icon="inline-start" />Create role</Button>{/if}</div>
		</div>

		<div class="mt-5 overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[760px] border-collapse text-left">
				<thead class="bg-muted/40 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><tr><th class="px-4 py-2">Role</th><th class="px-4 py-2">Order</th><th class="px-4 py-2">Description</th><th class="px-4 py-2">Send limit</th><th class="px-4 py-2">Mailbox limit</th><th class="px-4 py-2 text-right">Actions</th></tr></thead>
				<tbody class="divide-y">
					{#each [...adminRoles].sort((a, b) => a.sort - b.sort) as role (role.id)}
						<tr class="text-[11px] hover:bg-muted/25">
							<td class="px-4 py-3"><div class="flex items-center gap-2 font-medium"><ShieldCheck size={14} class="text-muted-foreground" />{role.name}{#if role.default}<Badge variant="secondary" class="h-4 rounded-full px-1.5 text-[8px]">Default</Badge>{/if}</div></td>
							<td class="px-4 py-3 tabular-nums">{role.sort}</td>
							<td class="max-w-[270px] truncate px-4 py-3 text-muted-foreground">{role.description}</td>
							<td class="px-4 py-3">{role.sendLimit ? role.sendLimit.toLocaleString() : 'Unlimited'}</td>
							<td class="px-4 py-3">{role.mailboxLimit ? role.mailboxLimit : 'Unlimited'}</td>
							<td class="px-4 py-3 text-right"><div class="inline-flex gap-1">{#if canSetRole}<Button variant="ghost" size="xs" disabled={loadingRoles || updatingRoleId !== null || savingRole} onclick={() => openEdit(role)}>Edit</Button><Button variant="ghost" size="xs" disabled={loadingRoles || updatingRoleId !== null || savingRole} onclick={() => setDefault(role)}>{#if updatingRoleId === role.id}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Star data-icon="inline-start" />{/if}Set default</Button>{/if}{#if canDeleteRole}<Button variant="ghost" size="icon-xs" aria-label="Delete role" disabled={loadingRoles || updatingRoleId !== null || savingRole} onclick={() => deleteRole(role)}>{#if updatingRoleId === role.id}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Trash2 data-icon="inline-start" />{/if}</Button>{/if}</div></td>
						</tr>
					{:else}<tr><td colspan="6" class="px-4 py-12 text-center text-xs text-muted-foreground">{#if loadingRoles}<div class="flex justify-center"><LoadingState label="Loading roles and permissions…" /></div>{:else}No roles are configured.{/if}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if notice}<p class="mt-3 text-[10px] text-destructive" role="alert">{notice}</p>{/if}
		<div class="mt-4 rounded-xl border border-dashed p-4"><p class="text-[10px] font-medium">Role controls</p><p class="mt-1 text-[10px] leading-relaxed text-muted-foreground">Roles can limit daily sending, mailbox creation, domain access, and administrative screens. Changes here apply to users assigned to the role.</p></div>
	</div>
</section>

{#if showForm && (editingId === null ? canAddRole : canSetRole)}
	<Dialog.Root bind:open={showForm}>
		<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-h-[90svh] max-w-[640px] gap-0 overflow-y-auto p-5">
			<Dialog.Header class="flex-row items-center justify-between"><div><Dialog.Title id="role-editor-title" class="text-sm font-semibold">{editingId ? 'Edit role' : 'Create role'}</Dialog.Title><Dialog.Description class="mt-1 text-[10px] text-muted-foreground">Set access, quotas, and domain restrictions.</Dialog.Description></div><Button variant="ghost" size="icon-xs" aria-label="Close role editor" onclick={() => (showForm = false)}><X data-icon="inline-start" /></Button></Dialog.Header>
			<form class="mt-4 space-y-4" onsubmit={saveRole}>
				<div class="grid gap-3 sm:grid-cols-3"><label class="space-y-1 text-[10px] font-medium"><span>Role name</span><Input bind:value={roleName} required maxlength={24} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] font-medium"><span>Description</span><Input bind:value={description} maxlength={80} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] font-medium"><span>Order</span><Input bind:value={roleSort} type="number" min="0" max="9999" class="h-9 text-xs" /></label></div>
				<div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px] font-medium"><span>Send limit (0 = unlimited)</span><Input bind:value={sendLimit} type="number" min={0} class="h-9 text-xs" /></label><label class="space-y-1 text-[10px] font-medium"><span>Mailbox limit (0 = unlimited)</span><Input bind:value={mailboxLimit} type="number" min={0} class="h-9 text-xs" /></label></div>
				<label class="block space-y-1 text-[10px] font-medium"><span>Sending mode</span><SelectControl bind:value={sendType} items={[{ value: 'day', label: 'Daily quota' }, { value: 'count', label: 'Total quota' }, { value: 'internal', label: 'Internal only' }, { value: 'ban', label: 'Disabled' }]} class="h-9 w-full text-xs" /></label>
				<div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-[10px] font-medium"><span>Blocked sender addresses (one per line)</span><textarea bind:value={blockedSenders} rows="3" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label><label class="space-y-1 text-[10px] font-medium"><span>Allowed mailbox domains (one per line)</span><textarea bind:value={allowedDomains} rows="3" class="w-full rounded-lg border bg-background p-2 text-xs"></textarea></label></div>
				<label class="flex items-center gap-2 text-[10px]"><Switch bind:checked={roleDefault} size="sm" />Make this the default role for new users</label>
				<div class="rounded-xl border p-3"><p class="text-[10px] font-semibold">Access permissions</p><div class="mt-3 grid gap-4 sm:grid-cols-3">{#each permissionGroups as group (group.name)}<fieldset><legend class="mb-2 text-[9px] font-medium text-muted-foreground">{group.name}</legend><div class="space-y-2">{#each group.items as permission (permission.permId)}<label class="flex items-center gap-2 text-[9px]"><Switch checked={permIds.includes(permission.permId)} onCheckedChange={() => togglePermission(permission.permId)} size="sm" />{permission.name}</label>{/each}</div></fieldset>{/each}</div></div>
				<div class="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" disabled={savingRole} onclick={() => (showForm = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full" disabled={savingRole}>{#if savingRole}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{savingRole ? 'Saving…' : 'Save role'}</Button></div>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

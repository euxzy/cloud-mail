<script lang="ts">
	import { onMount } from 'svelte';
	import { Copy, LoaderCircle, Plus, Search, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import { adminRoles, inviteCodes, type AdminRole, type InviteCode } from '$lib/admin-data.svelte.js';
	import { clearUnusedInviteCodes, createInviteCode, deleteInviteCodes, fetchInviteCodeHistory, fetchInviteCodes, fetchRoleOptions } from '$lib/api/admin.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { toast } from 'svelte-sonner';

	let search = $state('');
	let showAdd = $state(false);
	let showHistory = $state(false);
	let selectedCode = $state<InviteCode | null>(null);
	let history = $state<Array<{ email: string; date: string }>>([]);
	let code = $state('');
	let role = $state('');
	let uses = $state(1);
	let expiry = $state('');
	let notice = $state('');
	let roles = $state<Array<{ roleId: number; name: string }>>([]);
	let requestId = 0;
	let loadingCodes = $state(true);
	let loadingRoles = $state(true);
	let creatingCode = $state(false);
	let clearingCodes = $state(false);
	let deletingCodeId = $state<number | null>(null);
	let loadingHistory = $state(false);
	const canAddInviteCode = $derived(hasPermission('reg-key:add'));
	const canDeleteInviteCodes = $derived(hasPermission('reg-key:delete'));
	const visibleCodes = $derived(inviteCodes.filter((item) => !search || item.code.toLowerCase().includes(search.toLowerCase())));

	onMount(() => { void loadRoles(); });
	$effect(() => { search; void loadCodes(); });

	async function loadRoles() {
		loadingRoles = true;
		try {
			roles = await fetchRoleOptions();
			adminRoles.splice(0, adminRoles.length, ...roles.map((item): AdminRole => ({ id: item.roleId, name: item.name, description: '', sort: 0, default: item.isDefault === 1, sendLimit: 0, mailboxLimit: 0 })));
			if (!role && roles.length) role = String(roles.find((item) => item.isDefault === 1)?.roleId ?? roles[0].roleId);
		} catch (error) { notice = error instanceof Error ? error.message : 'Roles could not be loaded.'; }
		finally { loadingRoles = false; }
	}
	async function loadCodes() {
		const currentRequest = ++requestId;
		loadingCodes = true;
		try {
			const rows = await fetchInviteCodes(search.trim());
			if (currentRequest !== requestId) return;
			inviteCodes.splice(0, inviteCodes.length, ...rows.map((item) => ({
				id: Number(item.regKeyId), code: item.code, roleId: Number(item.roleId), role: item.roleName || 'Unknown role',
				uses: Number(item.count), expires: item.expireTime ? new Date(item.expireTime).toLocaleDateString() : 'Expired'
			})));
			notice = '';
		} catch (error) { if (currentRequest === requestId) notice = error instanceof Error ? error.message : 'Invite codes could not be loaded.'; }
		finally { if (currentRequest === requestId) loadingCodes = false; }
	}
	function generateCode() { code = `CLOUD-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`; }
	async function createCode(event: SubmitEvent) {
		event.preventDefault();
		if (!canAddInviteCode) return;
		const normalized = code.trim().toUpperCase();
		if (!normalized || !role || !expiry || Number(uses) < 1) { toast.warning('Enter a code, role, expiry date, and at least one use.'); return; }
		if (creatingCode) return;
		creatingCode = true;
		try {
			await createInviteCode({ code: normalized, roleId: Number(role), count: Number(uses), expireTime: expiry });
			showAdd = false; code = ''; await loadCodes(); toast.success('Invite code created.');
		} catch (error) { toast.error(error instanceof Error ? error.message : 'Invite code could not be created.'); }
		finally { creatingCode = false; }
	}
	async function copyCode(value: string) {
		try { await navigator.clipboard.writeText(value); toast.success('Invite code copied.'); }
		catch { toast.info(value, { description: 'Clipboard access is unavailable. Copy this code manually.' }); }
	}
	async function clearUnused() {
		if (!canDeleteInviteCodes || clearingCodes) return;
		clearingCodes = true;
		try { await clearUnusedInviteCodes(); await loadCodes(); toast.success('Unused and expired invite codes cleared.'); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Invite codes could not be cleared.'); }
		finally { clearingCodes = false; }
	}
	async function deleteCode(item: InviteCode) {
		if (!canDeleteInviteCodes || deletingCodeId !== null) return;
		deletingCodeId = item.id;
		try { await deleteInviteCodes([item.id]); await loadCodes(); toast.success('Invite code deleted.'); }
		catch (error) { toast.error(error instanceof Error ? error.message : 'Invite code could not be deleted.'); }
		finally { deletingCodeId = null; }
	}
	async function openHistory(item: InviteCode) {
		selectedCode = item; showHistory = true; history = [];
		loadingHistory = true;
		try {
			const rows = await fetchInviteCodeHistory(item.id);
			history = rows.map((row) => ({ email: row.email, date: row.createTime ? new Date(row.createTime).toLocaleString() : '' }));
		} catch (error) { toast.error(error instanceof Error ? error.message : 'Invite history could not be loaded.'); }
		finally { loadingHistory = false; }
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1100px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Invite codes</h1><p class="mt-1 text-[13px] text-muted-foreground">Create, share, and track registration codes.</p></div>
			<div class="flex flex-wrap gap-2">{#if canDeleteInviteCodes}<Button variant="outline" size="sm" class="rounded-full" disabled={clearingCodes || loadingCodes} onclick={clearUnused}>{#if clearingCodes}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Trash2 data-icon="inline-start" />{/if}{clearingCodes ? 'Clearing…' : 'Clear unused'}</Button>{/if}{#if canAddInviteCode}<Button size="sm" class="rounded-full" disabled={creatingCode} onclick={() => { generateCode(); showAdd = true; }}><Plus data-icon="inline-start" />Create code</Button>{/if}</div>
		</div>
		<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
			<div class="relative min-w-[190px] flex-1 sm:max-w-[340px]"><Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} /><Input bind:value={search} placeholder="Search invite codes" class="h-9 pl-8 text-xs" /></div>
			<p class="text-[10px] text-muted-foreground">{loadingCodes ? 'Loading invite codes…' : `${visibleCodes.length} active and expired codes`}</p>
		</div>
		<div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#if loadingCodes && inviteCodes.length === 0}
				{#each [1, 2, 3] as card (card)}<div class="animate-pulse rounded-xl border p-4"><div class="h-4 w-36 rounded bg-muted"></div><div class="mt-6 h-16 rounded bg-muted/60"></div><div class="mt-4 h-8 rounded bg-muted/50"></div></div>{/each}
			{:else}{#each visibleCodes as item (item.id)}
				<article class="rounded-xl border bg-card p-4">
					<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate font-mono text-sm font-semibold tracking-wide">{item.code}</p><p class="mt-1 text-[10px] text-muted-foreground">Invite code</p></div><Button variant="ghost" size="icon-sm" aria-label="Copy code" disabled={loadingCodes} onclick={() => copyCode(item.code)}><Copy data-icon="inline-start" /></Button></div>
					<div class="mt-4 grid grid-cols-2 gap-y-3 border-t pt-3 text-[10px]"><span class="text-muted-foreground">Remaining uses</span><span class="text-right font-medium">{item.uses || 'Exhausted'}</span><span class="text-muted-foreground">Role</span><span class="text-right"><Badge variant="secondary" class="h-4 rounded-full px-1.5 text-[9px]">{item.role}</Badge></span><span class="text-muted-foreground">Expires</span><span class="text-right">{item.expires}</span></div>
					<div class="mt-4 flex justify-between border-t pt-3"><Button variant="ghost" size="xs" disabled={loadingHistory || loadingCodes} onclick={() => { void openHistory(item); }}>Usage history</Button>{#if canDeleteInviteCodes}<Button variant="ghost" size="icon-xs" aria-label="Delete invite code" disabled={loadingCodes || deletingCodeId !== null} onclick={() => { void deleteCode(item); }}>{#if deletingCodeId === item.id}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<Trash2 data-icon="inline-start" />{/if}</Button>{/if}</div>
				</article>
			{:else}<div class="col-span-full rounded-xl border border-dashed py-14 text-center text-xs text-muted-foreground">No invite codes found.</div>{/each}{/if}
		</div>
		{#if notice}<p class="mt-3 text-[10px] text-destructive" role="alert">{notice}</p>{/if}
	</div>
</section>

{#if showAdd && canAddInviteCode}
	<Dialog.Root bind:open={showAdd}>
		<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-w-[440px] gap-0 p-5">
			<Dialog.Header class="flex-row items-start justify-between"><div><Dialog.Title id="invite-title" class="text-sm font-semibold">Create invite code</Dialog.Title><Dialog.Description class="mt-1 text-[10px] text-muted-foreground">Choose access level, expiry, and usage limit.</Dialog.Description></div><Button variant="ghost" size="icon-xs" aria-label="Close" onclick={() => (showAdd = false)}><X data-icon="inline-start" /></Button></Dialog.Header>
			<form class="mt-4 space-y-3" onsubmit={createCode}>
				<div class="flex gap-2"><Input bind:value={code} required placeholder="Code" class="h-9 font-mono text-xs" /><Button type="button" variant="outline" size="sm" class="shrink-0 rounded-full" onclick={generateCode}>Generate</Button></div>
				<SelectControl bind:value={role} items={roles.map((item) => ({ value: String(item.roleId), label: item.name }))} aria-label="Invite role" class="h-9 w-full text-xs" />
				<div class="grid grid-cols-2 gap-2"><label class="space-y-1 text-[10px]">Uses<Input bind:value={uses} type="number" min="1" max="99999" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Expires<Input bind:value={expiry} type="date" class="h-9 text-xs" /></label></div>
				<div class="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" disabled={creatingCode} onclick={() => (showAdd = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full" disabled={creatingCode || loadingRoles}>{#if creatingCode}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{creatingCode ? 'Creating…' : 'Create code'}</Button></div>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if showHistory && selectedCode}
	<Dialog.Root open={showHistory} onOpenChange={(open) => { if (!open) showHistory = false; }}>
		<Dialog.Content showCloseButton={false} class="w-[calc(100vw-2rem)] max-w-[520px] gap-0 p-5">
			<Dialog.Header class="flex-row items-center justify-between"><div><Dialog.Title id="history-title" class="text-sm font-semibold">Usage history</Dialog.Title><Dialog.Description class="mt-1 font-mono text-[10px]">{selectedCode.code}</Dialog.Description></div><Button variant="ghost" size="icon-xs" aria-label="Close" onclick={() => (showHistory = false)}><X data-icon="inline-start" /></Button></Dialog.Header>
			<div class="mt-4 divide-y border-y">{#if loadingHistory}<div class="py-5"><LoadingState label="Loading usage history…" /></div>{:else}{#each history as item (`${item.email}-${item.date}`)}<div class="flex justify-between gap-3 py-3 text-[10px]"><span>{item.email}</span><span class="text-muted-foreground">{item.date}</span></div>{:else}<p class="py-8 text-center text-[10px] text-muted-foreground">No registrations have used this code yet.</p>{/each}{/if}</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

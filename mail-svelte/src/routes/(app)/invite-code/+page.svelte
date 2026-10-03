<script lang="ts">
	import { Check, Copy, Plus, Search, Trash2, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { adminRoles, inviteCodes, type InviteCode } from '$lib/admin-data.svelte.js';

	let search = $state('');
	let showAdd = $state(false);
	let showHistory = $state(false);
	let selectedCode = $state<InviteCode | null>(null);
	let code = $state('');
	let role = $state('Member');
	let uses = $state(1);
	let expiry = $state('2026-12-31');
	let notice = $state('');
	const history = [
		{ code: 'CLOUD-START-24', email: 'nisa@ruangrupa.co', date: 'Oct 1, 2026' },
		{ code: 'CLOUD-START-24', email: 'adrian@northstar.studio', date: 'Sep 29, 2026' },
		{ code: 'NORTHSTAR-TEAM', email: 'raka@studio-sore.com', date: 'Sep 26, 2026' }
	];
	const visibleCodes = $derived(inviteCodes.filter((item) => !search || item.code.toLowerCase().includes(search.toLowerCase())));

	function generateCode() {
		code = `CLOUD-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
	}

	function createCode(event: SubmitEvent) {
		event.preventDefault();
		const normalized = code.trim().toUpperCase();
		if (!normalized) return;
		inviteCodes.unshift({ id: Math.max(0, ...inviteCodes.map((item) => item.id)) + 1, code: normalized, role, uses: Number(uses), expires: new Date(expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
		showAdd = false;
		code = '';
		notice = 'Invite code created in this preview.';
	}

	async function copyCode(value: string) {
		try { await navigator.clipboard.writeText(value); notice = 'Invite code copied.'; }
		catch { notice = value; }
	}

	function clearUnused() {
		for (let index = inviteCodes.length - 1; index >= 0; index--) if (!inviteCodes[index].history?.length && !history.some((entry) => entry.code === inviteCodes[index].code)) inviteCodes.splice(index, 1);
		notice = 'Unused codes cleared from this preview.';
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1100px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Invite codes</h1><p class="mt-1 text-[13px] text-muted-foreground">Create, share, and track registration codes.</p></div>
			<div class="flex flex-wrap gap-2"><Button variant="outline" size="sm" class="rounded-full" onclick={clearUnused}><Trash2 data-icon="inline-start" />Clear unused</Button><Button size="sm" class="rounded-full" onclick={() => { generateCode(); showAdd = true; }}><Plus data-icon="inline-start" />Create code</Button></div>
		</div>
		<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
			<div class="relative min-w-[190px] flex-1 sm:max-w-[340px]"><Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} /><Input bind:value={search} placeholder="Search invite codes" class="h-9 pl-8 text-xs" /></div>
			<p class="text-[10px] text-muted-foreground">{visibleCodes.length} active and expired codes</p>
		</div>
		<div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each visibleCodes as item (item.id)}
				<article class="rounded-xl border bg-card p-4">
					<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate font-mono text-sm font-semibold tracking-wide">{item.code}</p><p class="mt-1 text-[10px] text-muted-foreground">Invite code</p></div><Button variant="ghost" size="icon-sm" aria-label="Copy code" onclick={() => copyCode(item.code)}><Copy data-icon="inline-start" /></Button></div>
					<div class="mt-4 grid grid-cols-2 gap-y-3 border-t pt-3 text-[10px]"><span class="text-muted-foreground">Remaining uses</span><span class="text-right font-medium">{item.uses || 'Exhausted'}</span><span class="text-muted-foreground">Role</span><span class="text-right"><Badge variant="secondary" class="h-4 rounded-full px-1.5 text-[9px]">{item.role}</Badge></span><span class="text-muted-foreground">Expires</span><span class="text-right">{item.expires}</span></div>
					<div class="mt-4 flex justify-between border-t pt-3"><Button variant="ghost" size="xs" onclick={() => { selectedCode = item; showHistory = true; }}>Usage history</Button><Button variant="ghost" size="icon-xs" aria-label="Delete invite code" onclick={() => { inviteCodes.splice(inviteCodes.findIndex((entry) => entry.id === item.id), 1); notice = 'Invite code deleted from this preview.'; }}><Trash2 data-icon="inline-start" /></Button></div>
				</article>
			{:else}<div class="col-span-full rounded-xl border border-dashed py-14 text-center text-xs text-muted-foreground">No invite codes found.</div>{/each}
		</div>
		{#if notice}<p class="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground" role="status"><Check size={13} />{notice}</p>{/if}
	</div>
</section>

{#if showAdd}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close invite code form" onclick={() => (showAdd = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="invite-title" class="relative z-10 w-full max-w-[440px] rounded-2xl border bg-background p-5 shadow-xl">
			<div class="flex items-start justify-between"><div><h2 id="invite-title" class="text-sm font-semibold">Create invite code</h2><p class="mt-1 text-[10px] text-muted-foreground">Choose access level, expiry, and usage limit.</p></div><Button variant="ghost" size="icon-xs" aria-label="Close" onclick={() => (showAdd = false)}><X data-icon="inline-start" /></Button></div>
			<form class="mt-4 space-y-3" onsubmit={createCode}>
				<div class="flex gap-2"><Input bind:value={code} required placeholder="Code" class="h-9 font-mono text-xs" /><Button type="button" variant="outline" size="sm" class="shrink-0 rounded-full" onclick={generateCode}>Generate</Button></div>
				<SelectControl bind:value={role} items={adminRoles.map((item) => ({ value: item.name, label: item.name }))} aria-label="Invite role" class="h-9 w-full text-xs" />
				<div class="grid grid-cols-2 gap-2"><label class="space-y-1 text-[10px]">Uses<Input bind:value={uses} type="number" min="1" max="99999" class="h-9 text-xs" /></label><label class="space-y-1 text-[10px]">Expires<Input bind:value={expiry} type="date" class="h-9 text-xs" /></label></div>
				<div class="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" onclick={() => (showAdd = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full">Create code</Button></div>
			</form>
		</div>
	</div>
{/if}

{#if showHistory && selectedCode}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close invite history" onclick={() => (showHistory = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="history-title" class="relative z-10 w-full max-w-[520px] rounded-2xl border bg-background p-5 shadow-xl">
			<div class="flex items-center justify-between"><div><h2 id="history-title" class="text-sm font-semibold">Usage history</h2><p class="mt-1 font-mono text-[10px] text-muted-foreground">{selectedCode.code}</p></div><Button variant="ghost" size="icon-xs" aria-label="Close" onclick={() => (showHistory = false)}><X data-icon="inline-start" /></Button></div>
			<div class="mt-4 divide-y border-y">{#each [...history.filter((item) => item.code === selectedCode?.code), ...(selectedCode.history ?? []).map((item) => ({ ...item, code: selectedCode!.code }))] as item (`${item.email}-${item.date}`)}<div class="flex justify-between gap-3 py-3 text-[10px]"><span>{item.email}</span><span class="text-muted-foreground">{item.date}</span></div>{:else}<p class="py-8 text-center text-[10px] text-muted-foreground">No registrations have used this code yet.</p>{/each}</div>
		</div>
	</div>
{/if}

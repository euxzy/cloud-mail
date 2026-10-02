<script lang="ts">
	import { Plus, RefreshCw, Search, Trash2 } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { adminRoles, adminUsers, type AdminUser } from '$lib/admin-data.svelte.js';

	let search = $state('');
	let status = $state('All');
	let selected = $state<number[]>([]);
	let showAdd = $state(false);
	let newName = $state('');
	let newEmail = $state('');
	let newRole = $state('Member');
	let notice = $state('');
	const statuses = ['All', 'Active', 'Banned', 'Deleted'];
	const filteredUsers = $derived(adminUsers.filter((user) => {
		const q = search.trim().toLowerCase();
		return (status === 'All' || user.status === status) && (!q || `${user.email} ${user.name}`.toLowerCase().includes(q));
	}));

	function toggleSelected(id: number) {
		selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
	}

	function removeSelected() {
		for (let index = adminUsers.length - 1; index >= 0; index--) if (selected.includes(adminUsers[index].id)) adminUsers.splice(index, 1);
		selected = [];
		notice = 'Selected users were removed from this preview.';
	}

	function setUserStatus(user: AdminUser) {
		user.status = user.status === 'Active' ? 'Banned' : 'Active';
	}

	function addUser(event: SubmitEvent) {
		event.preventDefault();
		if (!newName.trim() || !newEmail.trim()) return;
		adminUsers.push({ id: Math.max(0, ...adminUsers.map((user) => user.id)) + 1, email: newEmail, name: newName, role: newRole, status: 'Active', mailboxes: 0, sent: 0, created: new Date().toISOString().slice(0, 10) });
		newName = '';
		newEmail = '';
		showAdd = false;
		notice = 'User added to this preview.';
	}
</script>

<section class="min-h-[calc(100svh-56px)] px-3 pb-10 pt-5 sm:px-5 sm:pt-7">
	<div class="mx-auto max-w-[1360px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-xl font-normal tracking-[-0.03em]">Users</h1><p class="mt-1.5 text-xs text-muted-foreground">Manage workspace access, roles, and sending limits.</p></div>
			<Button size="sm" class="rounded-full" onclick={() => (showAdd = true)}><Plus data-icon="inline-start" />Add user</Button>
		</div>

		<div class="mt-5 flex flex-wrap items-center gap-2">
			<div class="relative min-w-[190px] flex-1"><Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} /><Input bind:value={search} placeholder="Search by email or name" class="h-9 pl-8 text-xs" /></div>
			<select bind:value={status} aria-label="Filter by user status" class="h-9 rounded-lg border bg-background px-3 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring">{#each statuses as option}<option>{option}</option>{/each}</select>
			<Button variant="ghost" size="icon-sm" aria-label="Refresh users" onclick={() => { search = ''; status = 'All'; }}><RefreshCw data-icon="inline-start" /></Button>
			{#if selected.length}<Button variant="ghost" size="sm" class="text-destructive" onclick={removeSelected}><Trash2 data-icon="inline-start" />Remove {selected.length}</Button>{/if}
		</div>

		<div class="mt-3 overflow-x-auto rounded-xl border">
			<table class="w-full min-w-[850px] border-collapse text-left">
				<thead class="bg-muted/40 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><tr><th class="w-9 px-3 py-2"></th><th class="px-3 py-2">User</th><th class="px-3 py-2">Role</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Sent</th><th class="px-3 py-2">Mailboxes</th><th class="px-3 py-2">Joined</th><th class="px-3 py-2 text-right">Actions</th></tr></thead>
				<tbody class="divide-y">
					{#each filteredUsers as user (user.id)}
						<tr class="text-[11px] hover:bg-muted/25">
							<td class="px-3 py-3"><input type="checkbox" checked={selected.includes(user.id)} onchange={() => toggleSelected(user.id)} class="size-3.5 accent-primary" aria-label="Select user" /></td>
							<td class="px-3 py-3"><span class="block font-medium">{user.name}</span><span class="mt-1 block text-[9px] text-muted-foreground">{user.email}</span></td>
							<td class="px-3 py-3"><select bind:value={user.role} aria-label={`Role for ${user.email}`} class="rounded-md border bg-background px-2 py-1 text-[10px]">{#each adminRoles as role}<option>{role.name}</option>{/each}</select></td>
							<td class="px-3 py-3"><Badge variant={user.status === 'Active' ? 'secondary' : user.status === 'Banned' ? 'destructive' : 'outline'} class="h-5 rounded-full px-2 text-[9px]">{user.status}</Badge></td>
							<td class="px-3 py-3 tabular-nums">{user.sent.toLocaleString()}</td>
							<td class="px-3 py-3 tabular-nums">{user.mailboxes}</td>
							<td class="px-3 py-3 text-muted-foreground">{user.created}</td>
							<td class="px-3 py-3 text-right"><div class="inline-flex gap-1"><Button variant="ghost" size="xs" onclick={() => (user.sent = 0)}>Reset limit</Button><Button variant="ghost" size="xs" onclick={() => setUserStatus(user)}>{user.status === 'Active' ? 'Ban' : 'Restore'}</Button></div></td>
						</tr>
					{:else}<tr><td colspan="8" class="px-4 py-12 text-center text-xs text-muted-foreground">No users match this filter.</td></tr>{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>{filteredUsers.length} users</span><span>Page 1 of 1</span></div>
		{#if notice}<p class="mt-2 text-[10px] text-muted-foreground" role="status">{notice}</p>{/if}
	</div>
</section>

{#if showAdd}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close add user form" onclick={() => (showAdd = false)}></button>
		<section role="dialog" aria-modal="true" aria-labelledby="add-user-title" class="relative z-10 w-full max-w-[420px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="add-user-title" class="text-sm font-semibold">Add user</h2><p class="mt-1 text-[10px] text-muted-foreground">Create a workspace account.</p>
			<form class="mt-4 space-y-3" onsubmit={addUser}>
				<Input bind:value={newName} required placeholder="Full name" class="h-9 text-xs" />
				<Input bind:value={newEmail} type="email" required placeholder="Email address" class="h-9 text-xs" />
				<select bind:value={newRole} aria-label="New user role" class="h-9 w-full rounded-lg border bg-background px-3 text-xs">{#each adminRoles as role}<option>{role.name}</option>{/each}</select>
				<div class="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" onclick={() => (showAdd = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full">Create user</Button></div>
			</form>
		</section>
	</div>
{/if}

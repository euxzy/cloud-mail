<script lang="ts">
	import { ChartPie, FileText, Inbox, KeyRound, Mail, PenLine, Send, Settings, ShieldCheck, Star, Users } from '@lucide/svelte';
	import { page } from '$app/state';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { cn } from '$lib/utils.js';
	import { mailMessages } from '$lib/mail-data.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { mailUi } from '$lib/mail-ui.svelte.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { apiUser } from '$lib/api/session.svelte.js';

	type Props = {
		class?: string;
		onNavigate?: () => void;
		onCompose?: () => void;
		onAccounts?: () => void;
	};

	let { class: className, onNavigate, onCompose, onAccounts }: Props = $props();
	const folders = [
		{ label: 'Inbox', href: '/inbox', id: 'inbox', icon: Inbox, permission: 'Read inbox' },
		{ label: 'Starred', href: '/starred', id: 'starred', icon: Star, permission: 'View starred messages' },
		{ label: 'Sent', href: '/sent', id: 'sent', icon: Send, permission: 'Send email' },
		{ label: 'Drafts', href: '/draft', id: 'drafts', icon: FileText, permission: 'Send email' }
	];
	const management = [
		{ label: 'Analytics', href: '/analysis', icon: ChartPie, permission: 'View analytics' },
		{ label: 'All mail', href: '/all-mail', icon: Mail, permission: 'View all mail' },
		{ label: 'Users', href: '/all-users', icon: Users, permission: 'Manage users' },
		{ label: 'Permissions', href: '/role', icon: ShieldCheck, permission: 'Manage roles' },
		{ label: 'Invite codes', href: '/invite-code', icon: KeyRound, permission: 'Manage invite codes' },
		{ label: 'System settings', href: '/system-settings', icon: Settings, permission: 'Manage system settings' }
	];

	const currentFolder = $derived(page.url.pathname === '/draft' ? 'drafts' : page.url.pathname.split('/')[1] || 'inbox');
	const unreadCount = $derived(mailMessages.filter((message) => message.folder === 'inbox' && !message.deleted && !message.read).length);
	const currentAccount = $derived(mailAccounts.find((account) => account.id === mailUi.currentAccountId) ?? mailAccounts[0]);
	const userName = $derived(apiUser.value?.name || apiUser.value?.email || 'Cloud Mail');
	const initials = $derived(userName.split(/[\s@]+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'CM');

	function countFor(id: string) {
		if (id === 'inbox') return unreadCount;
		if (id === 'starred') return mailMessages.filter((message) => message.starred && !message.deleted).length;
		return mailMessages.filter((message) => message.folder === id && !message.deleted).length;
	}

	function selected(path: string) {
		return page.url.pathname === path || page.url.pathname.startsWith(`${path}/`);
	}
</script>

<aside class={cn('flex h-full min-h-0 w-[264px] shrink-0 flex-col bg-sidebar px-4 pb-4 pt-6 text-sidebar-foreground', className)}>
	{#if hasPermission('Send email')}<Button class="h-11 w-full justify-start gap-3 rounded-xl px-4 text-sm font-semibold shadow-[0_7px_16px_-11px_rgba(23,107,115,0.9)]" onclick={() => { onCompose?.(); onNavigate?.(); }}>
		<PenLine data-icon="inline-start" />
		Compose
	</Button>{/if}

	<div class="mt-8 min-h-0 flex-1 overflow-y-auto">
		<div class="px-3 pb-2 text-[11px] font-semibold tracking-[0.02em] text-muted-foreground">Your mail</div>
		<nav aria-label="Mail folders" class="flex flex-col gap-1">
			{#each folders as folder (folder.id)}
				{#if hasPermission(folder.permission)}
				{@const Icon = folder.icon}
				<Button
					href={folder.href}
					variant="ghost"
					class="h-10 w-full justify-start gap-3 rounded-xl px-3 text-[13px] {currentFolder === folder.id && !page.url.pathname.startsWith('/mail/') && !page.url.pathname.startsWith('/settings') && !page.url.pathname.startsWith('/analysis') && !page.url.pathname.startsWith('/all-') && !page.url.pathname.startsWith('/role') && !page.url.pathname.startsWith('/invite-code') && !page.url.pathname.startsWith('/system-settings')
						? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent'
						: 'font-medium text-sidebar-foreground hover:bg-sidebar-accent/60'}"
					onclick={onNavigate}
				>
					<Icon data-icon="inline-start" />
					<span>{folder.label}</span>
					{#if countFor(folder.id) > 0}<span class="ml-auto rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">{countFor(folder.id)}</span>{/if}
				</Button>
				{/if}
			{/each}
		</nav>

		{#if hasPermission('View mailboxes')}<Button variant="ghost" class="mt-1 h-10 w-full justify-start gap-3 rounded-xl px-3 text-[13px] font-medium hover:bg-sidebar-accent/60" onclick={() => { onAccounts?.(); onNavigate?.(); }}>
			<Users data-icon="inline-start" /><span>Mailboxes</span>
		</Button>{/if}

		<Separator class="my-5" />
		<div class="px-3 pb-2 text-[11px] font-semibold tracking-[0.02em] text-muted-foreground">Workspace</div>
		<nav aria-label="Management" class="flex flex-col gap-1">
			{#each management as item (item.href)}
				{#if hasPermission(item.permission)}
				{@const Icon = item.icon}
				<Button
					href={item.href}
					variant="ghost"
					class="h-10 w-full justify-start gap-3 rounded-xl px-3 text-[13px] {selected(item.href)
						? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent'
						: 'font-medium text-sidebar-foreground hover:bg-sidebar-accent/60'}"
					onclick={onNavigate}
				>
					<Icon data-icon="inline-start" /><span>{item.label}</span>
				</Button>
				{/if}
			{/each}
		</nav>

		<Separator class="my-5" />
		<Button href="/settings" variant="ghost" class="h-10 w-full justify-start gap-3 rounded-xl px-3 text-[13px] {selected('/settings') ? 'bg-sidebar-accent font-semibold hover:bg-sidebar-accent' : 'font-medium hover:bg-sidebar-accent/60'}" onclick={onNavigate}>
			<Settings data-icon="inline-start" /><span>Settings</span>
		</Button>
	</div>

	<div class="mt-3 shrink-0">
		<Separator class="mb-3" />
		<a href="/settings" class="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-sidebar-accent/60" onclick={onNavigate}>
			<Avatar.Root size="sm"><Avatar.Fallback class="bg-secondary text-[10px] font-semibold text-secondary-foreground">{initials}</Avatar.Fallback></Avatar.Root>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-[11px] font-semibold">{currentAccount?.name || userName}</span>
				<span class="block truncate text-[10px] text-muted-foreground">{currentAccount?.email}</span>
			</span>
		</a>
		<p class="px-2 pt-2 text-[10px] text-muted-foreground">Connected to mail API</p>
	</div>
</aside>

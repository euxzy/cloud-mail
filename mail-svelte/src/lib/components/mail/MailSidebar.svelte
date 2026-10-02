<script lang="ts">
	import { ChartPie, FileText, Inbox, KeyRound, Mail, PenLine, Send, Settings, ShieldCheck, Star, Users } from '@lucide/svelte';
	import { page } from '$app/state';
	import { Avatar } from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { cn } from '$lib/utils.js';
	import { mailMessages } from '$lib/mail-data.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { mailUi } from '$lib/mail-ui.svelte.js';

	type Props = {
		class?: string;
		onNavigate?: () => void;
		onCompose?: () => void;
		onAccounts?: () => void;
	};

	let { class: className, onNavigate, onCompose, onAccounts }: Props = $props();
	const folders = [
		{ label: 'Inbox', href: '/inbox', id: 'inbox', icon: Inbox },
		{ label: 'Starred', href: '/starred', id: 'starred', icon: Star },
		{ label: 'Sent', href: '/sent', id: 'sent', icon: Send },
		{ label: 'Drafts', href: '/draft', id: 'drafts', icon: FileText }
	];
	const management = [
		{ label: 'Analytics', href: '/analysis', icon: ChartPie },
		{ label: 'All mail', href: '/all-mail', icon: Mail },
		{ label: 'Users', href: '/all-users', icon: Users },
		{ label: 'Permissions', href: '/role', icon: ShieldCheck },
		{ label: 'Invite codes', href: '/invite-code', icon: KeyRound },
		{ label: 'System settings', href: '/system-settings', icon: Settings }
	];

	const currentFolder = $derived(page.url.pathname === '/draft' ? 'drafts' : page.url.pathname.split('/')[1] || 'inbox');
	const unreadCount = $derived(
		mailMessages.filter((message) => message.folder === 'inbox' && !message.read && !message.archived).length
	);
	const currentAccount = $derived(mailAccounts.find((account) => account.id === mailUi.currentAccountId) ?? mailAccounts[0]);

	function countFor(id: string) {
		if (id === 'inbox') return unreadCount;
		if (id === 'starred') return mailMessages.filter((message) => message.starred && !message.archived).length;
		return mailMessages.filter((message) => message.folder === id && !message.archived).length;
	}

	function selected(path: string) {
		return page.url.pathname === path || page.url.pathname.startsWith(`${path}/`);
	}
</script>

<aside class={cn('flex h-full w-[248px] shrink-0 flex-col bg-muted/20 pb-3 pl-2 pr-3 pt-4', className)}>
	<Button variant="secondary" class="mt-0 h-11 w-[146px] justify-start gap-3 rounded-2xl px-4 text-[13px] font-semibold shadow-sm" onclick={() => { onCompose?.(); onNavigate?.(); }}>
		<PenLine data-icon="inline-start" />
		Compose
	</Button>

	<div class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
		<div class="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mail</div>
		<nav aria-label="Mail folders" class="space-y-0.5">
			{#each folders as folder (folder.id)}
				{@const Icon = folder.icon}
				<Button
					href={folder.href}
					variant="ghost"
					class="h-9 w-full justify-start gap-4 rounded-r-full px-4 text-[13px] {currentFolder === folder.id && !page.url.pathname.startsWith('/mail/') && !page.url.pathname.startsWith('/settings') && !page.url.pathname.startsWith('/analysis') && !page.url.pathname.startsWith('/all-') && !page.url.pathname.startsWith('/role') && !page.url.pathname.startsWith('/invite-code') && !page.url.pathname.startsWith('/system-settings')
						? 'bg-secondary font-semibold text-foreground hover:bg-secondary'
						: 'font-medium text-foreground hover:bg-muted'}"
					onclick={onNavigate}
				>
					<Icon data-icon="inline-start" />
					<span>{folder.label}</span>
					{#if countFor(folder.id) > 0}<span class="ml-auto text-[11px] tabular-nums {folder.id === 'inbox' ? 'font-semibold' : 'text-muted-foreground'}">{countFor(folder.id)}</span>{/if}
				</Button>
			{/each}
		</nav>

		<Button variant="ghost" class="mt-1 h-9 w-full justify-start gap-4 rounded-r-full px-4 text-[13px] font-medium text-foreground hover:bg-muted" onclick={() => { onAccounts?.(); onNavigate?.(); }}>
			<Users data-icon="inline-start" /><span>Mailboxes</span>
		</Button>

		<Separator class="my-3" />
		<div class="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Manage</div>
		<nav aria-label="Management" class="space-y-0.5">
			{#each management as item (item.href)}
				{@const Icon = item.icon}
				<Button
					href={item.href}
					variant="ghost"
					class="h-9 w-full justify-start gap-4 rounded-r-full px-4 text-[12px] {selected(item.href)
						? 'bg-secondary font-semibold text-foreground hover:bg-secondary'
						: 'font-medium text-foreground hover:bg-muted'}"
					onclick={onNavigate}
				>
					<Icon data-icon="inline-start" /><span>{item.label}</span>
				</Button>
			{/each}
		</nav>

		<Separator class="my-3" />
		<Button href="/settings" variant="ghost" class="h-9 w-full justify-start gap-4 rounded-r-full px-4 text-[13px] {selected('/settings') ? 'bg-secondary font-semibold hover:bg-secondary' : 'font-medium'}" onclick={onNavigate}>
			<Settings data-icon="inline-start" /><span>Settings</span>
		</Button>
	</div>

	<div class="mt-2 shrink-0">
		<Separator class="mb-2" />
		<a href="/settings" class="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-muted" onclick={onNavigate}>
			<Avatar.Root size="sm"><Avatar.Fallback class="bg-secondary text-[10px] font-semibold">SA</Avatar.Fallback></Avatar.Root>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-[11px] font-semibold">{currentAccount?.primary ? 'Sarah Anindya' : 'Mailbox account'}</span>
				<span class="block truncate text-[10px] text-muted-foreground">{currentAccount?.email}</span>
			</span>
		</a>
		<p class="px-3 pt-1 text-[9px] text-muted-foreground">Preview workspace · sample data</p>
	</div>
</aside>

<script lang="ts">
	import { Bell, ChevronDown, Mail, Menu, Moon, Search, Settings, Sun, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import AccountManagerDialog from '$lib/components/mail/AccountManagerDialog.svelte';
	import ComposeDialog from '$lib/components/mail/ComposeDialog.svelte';
	import MailSidebar from '$lib/components/mail/MailSidebar.svelte';
	import Brand from '$lib/components/mail/Brand.svelte';
	import { mailUi, showComposer } from '$lib/mail-ui.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { adminUsers } from '$lib/admin-data.svelte.js';
	import { hasPreviewPermission, hydratePreviewData, loadPreviewSession, persistPreviewData, previewSession, restorePreviewAttachments, signOutPreview, syncPreviewSession } from '$lib/preview-state.svelte.js';

	let { children } = $props();
	let menuOpen = $state(false);
	let profileOpen = $state(false);
	let noticeOpen = $state(false);
	let announcement = $state({ enabled: true, title: 'Welcome to the new Cloud Mail workspace', body: 'Your mailbox, delivery tools, and account settings are coming together in one place.', position: 'top-right', duration: 5000 });
	let darkMode = $state(false);
	let dataReady = $state(false);
	let mainElement: HTMLElement;

	const title = $derived.by(() => {
		const path = page.url.pathname;
		if (path.startsWith('/settings')) return 'Settings';
		if (path.startsWith('/mail/')) return 'Message';
		const routeTitle: Record<string, string> = {
			inbox: 'Inbox', starred: 'Starred', sent: 'Sent', draft: 'Drafts',
			analysis: 'Analytics', 'all-mail': 'All mail', 'all-users': 'Users',
			role: 'Permissions', 'invite-code': 'Invite codes', 'system-settings': 'System settings'
		};
		return routeTitle[path.split('/')[1] || 'inbox'] ?? 'Inbox';
	});

	function openComposer() {
		showComposer();
		menuOpen = false;
	}

	function openAccounts() {
		mailUi.accountsOpen = true;
		menuOpen = false;
	}

	function toggleTheme() {
		darkMode = !darkMode;
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('cloud-mail-theme', darkMode ? 'dark' : 'light');
	}

	function openAnnouncement() {
		noticeOpen = true;
		if (announcement.duration > 0) setTimeout(() => { noticeOpen = false; }, announcement.duration);
	}

	onMount(() => {
		void (async () => {
			await hydratePreviewData();
			await restorePreviewAttachments();
			loadPreviewSession();
			dataReady = true;
			if (!previewSession.email) void goto('/login');
		})();
		darkMode = localStorage.getItem('cloud-mail-theme') === 'dark';
		document.documentElement.classList.toggle('dark', darkMode);
		try {
			const settings = JSON.parse(localStorage.getItem('cloud-mail-system-settings-preview') || '{}') as { announcementEnabled?: boolean; announcementTitle?: string; announcementBody?: string; announcementPosition?: string; announcementDuration?: number };
			announcement = { enabled: settings.announcementEnabled ?? true, title: settings.announcementTitle || announcement.title, body: settings.announcementBody || announcement.body, position: settings.announcementPosition || 'top-right', duration: Number(settings.announcementDuration ?? 5000) };
		} catch { /* Keep the default announcement. */ }
	});

	$effect(() => {
		if (!dataReady) return;
		syncPreviewSession();
		if (!previewSession.email) { void goto('/login'); return; }
		persistPreviewData();
	});

	$effect(() => {
		page.url.pathname;
		if (mainElement) mainElement.scrollTop = 0;
	});

	$effect(() => {
		if (!dataReady || !previewSession.email) return;
		const path = page.url.pathname;
		const permissionByPath: Record<string, string> = {
			'/starred': 'View starred messages', '/sent': 'Send email', '/draft': 'Send email',
			'/analysis': 'View analytics', '/all-mail': 'View all mail', '/all-users': 'Manage users',
			'/role': 'Manage roles', '/invite-code': 'Manage invite codes', '/system-settings': 'Manage system settings'
		};
		const permission = permissionByPath[path];
		if (permission && !hasPreviewPermission(permission)) void goto('/inbox');
	});
</script>

<svelte:head>
	<title>{title} · Cloud Mail</title>
	<meta name="description" content="Cloud Mail workspace." />
</svelte:head>

<div class="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
	<a href="#main-content" class="sr-only z-50 focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">Skip to content</a>
	<header class="z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 sm:gap-5 sm:px-6 lg:h-[72px] lg:px-7">
		<Button variant="ghost" size="icon-sm" class="lg:hidden" aria-label="Open navigation" onclick={() => (menuOpen = true)}>
			<Menu data-icon="inline-start" />
		</Button>
		<a href="/inbox" class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:hidden" aria-label="Cloud Mail home"><Mail size={16} /></a>
		<div class="hidden w-[238px] shrink-0 sm:block"><Brand /></div>

		<div class="relative flex min-w-0 flex-1 sm:max-w-[520px]">
			<Search class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
			<Input bind:value={mailUi.query} aria-label="Search messages" placeholder="Search your mail" class="h-10 rounded-xl border-transparent bg-muted/70 pl-10 text-sm shadow-none focus-visible:border-ring focus-visible:bg-background" />
		</div>

		<div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
			<Button variant="ghost" size="icon-sm" class="text-muted-foreground" aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'} onclick={toggleTheme}>
				{#if darkMode}<Sun data-icon="inline-start" />{:else}<Moon data-icon="inline-start" />{/if}
			</Button>
			{#if announcement.enabled}<Button variant="ghost" size="icon-sm" class="text-muted-foreground" aria-label="Announcements" onclick={openAnnouncement}><Bell data-icon="inline-start" /></Button>{/if}
			<Button href="/settings" variant="ghost" size="icon-sm" class="hidden text-muted-foreground sm:inline-flex" aria-label="Settings"><Settings data-icon="inline-start" /></Button>
			<div class="relative">
				<Button variant="ghost" class="ml-1 h-10 gap-2 rounded-xl px-1.5" aria-expanded={profileOpen} aria-label="Open account menu" onclick={() => (profileOpen = !profileOpen)}>
					<Avatar.Root size="sm"><Avatar.Fallback class="bg-secondary text-xs font-semibold text-secondary-foreground">{previewSession.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'CM'}</Avatar.Fallback></Avatar.Root>
					<ChevronDown class="hidden text-muted-foreground sm:block" size={13} />
				</Button>
				{#if profileOpen}
					<div class="absolute right-0 top-11 z-30 w-[260px] rounded-xl border bg-popover p-3 shadow-lg">
						<div class="border-b px-2 pb-3">
							<p class="text-xs font-semibold">{previewSession.name}</p>
							<p class="mt-1 truncate text-[10px] text-muted-foreground">{previewSession.email}</p>
							<span class="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-[9px] font-medium">{previewSession.role}</span>
						</div>
						<div class="grid grid-cols-2 gap-2 px-2 py-3 text-[10px]">
							<span class="text-muted-foreground">Messages sent</span><span class="text-right font-medium">{adminUsers.find((user) => user.email === previewSession.email)?.sent ?? 0}</span>
						<span class="text-muted-foreground">Mailboxes</span><span class="text-right font-medium">{mailAccounts.filter((account) => account.ownerEmail === previewSession.email).length} connected</span>
						</div>
						<Button href="/settings" variant="ghost" size="sm" class="w-full justify-start text-xs" onclick={() => (profileOpen = false)}>Account settings</Button>
						<Button href="/login" variant="ghost" size="sm" class="w-full justify-start text-xs text-muted-foreground" onclick={() => { signOutPreview(); profileOpen = false; }}>Sign out</Button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<div class="flex min-h-0 flex-1 overflow-hidden">
		<MailSidebar class="hidden lg:flex" onCompose={openComposer} onAccounts={openAccounts} />
		<main bind:this={mainElement} id="main-content" class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-card lg:m-3 lg:ml-0 lg:rounded-2xl lg:border lg:shadow-[0_12px_40px_-30px_rgba(20,80,85,0.35)]">{@render children()}</main>
	</div>

	{#if menuOpen}
		<div class="fixed inset-0 z-40 bg-foreground/20 lg:hidden">
			<button class="absolute inset-0 h-full w-full cursor-default" aria-label="Close navigation" onclick={() => (menuOpen = false)}></button>
			<MailSidebar class="absolute bottom-0 left-0 top-16 z-10 h-auto shadow-xl" onNavigate={() => (menuOpen = false)} onCompose={openComposer} onAccounts={openAccounts} />
		</div>
	{/if}
	{#if mailUi.composeOpen}<ComposeDialog />{/if}
	{#if mailUi.accountsOpen}<AccountManagerDialog />{/if}
	{#if noticeOpen}
		<div class="pointer-events-none fixed inset-0 z-50 flex p-4 {announcement.position.startsWith('bottom') ? 'items-end' : 'items-start'} {announcement.position.endsWith('left') ? 'justify-start' : 'justify-end'}" role="status">
			<div class="pointer-events-auto w-full max-w-[360px] rounded-xl border bg-background p-4 shadow-xl">
				<div class="flex items-start justify-between gap-3"><h2 class="text-xs font-semibold">{announcement.title}</h2><Button variant="ghost" size="icon-xs" aria-label="Close announcement" onclick={() => (noticeOpen = false)}><X data-icon="inline-start" /></Button></div>
				<p class="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{announcement.body}</p>
			</div>
		</div>
	{/if}
</div>

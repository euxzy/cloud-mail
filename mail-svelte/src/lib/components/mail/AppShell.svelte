<script lang="ts">
	import { Bell, ChevronDown, Mail, Menu, Moon, Search, Settings, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';
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

	let { children } = $props();
	let menuOpen = $state(false);
	let profileOpen = $state(false);
	let noticeOpen = $state(false);
	let darkMode = $state(false);
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

	onMount(() => {
		darkMode = localStorage.getItem('cloud-mail-theme') === 'dark';
		document.documentElement.classList.toggle('dark', darkMode);
	});

	$effect(() => {
		page.url.pathname;
		if (mainElement) mainElement.scrollTop = 0;
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
			<Button variant="ghost" size="icon-sm" class="text-muted-foreground" aria-label="Announcements" onclick={() => (noticeOpen = true)}><Bell data-icon="inline-start" /></Button>
			<Button href="/settings" variant="ghost" size="icon-sm" class="hidden text-muted-foreground sm:inline-flex" aria-label="Settings"><Settings data-icon="inline-start" /></Button>
			<div class="relative">
				<Button variant="ghost" class="ml-1 h-10 gap-2 rounded-xl px-1.5" aria-expanded={profileOpen} aria-label="Open account menu" onclick={() => (profileOpen = !profileOpen)}>
					<Avatar.Root size="sm"><Avatar.Fallback class="bg-secondary text-xs font-semibold text-secondary-foreground">SA</Avatar.Fallback></Avatar.Root>
					<ChevronDown class="hidden text-muted-foreground sm:block" size={13} />
				</Button>
				{#if profileOpen}
					<div class="absolute right-0 top-11 z-30 w-[260px] rounded-xl border bg-popover p-3 shadow-lg">
						<div class="border-b px-2 pb-3">
							<p class="text-xs font-semibold">Sarah Anindya</p>
							<p class="mt-1 truncate text-[10px] text-muted-foreground">sarah@cloudmail.id</p>
							<span class="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-[9px] font-medium">Administrator</span>
						</div>
						<div class="grid grid-cols-2 gap-2 px-2 py-3 text-[10px]">
							<span class="text-muted-foreground">Sending limit</span><span class="text-right font-medium">23 / 500 today</span>
							<span class="text-muted-foreground">Mailboxes</span><span class="text-right font-medium">{mailAccounts.length} connected</span>
						</div>
						<Button href="/settings" variant="ghost" size="sm" class="w-full justify-start text-xs" onclick={() => (profileOpen = false)}>Account settings</Button>
						<Button href="/login" variant="ghost" size="sm" class="w-full justify-start text-xs text-muted-foreground" onclick={() => { localStorage.removeItem('token'); profileOpen = false; }}>Sign out</Button>
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
		<div class="fixed inset-0 z-50 flex items-start justify-center bg-foreground/15 p-4 pt-[12vh]" role="presentation">
			<button class="absolute inset-0" aria-label="Close announcements" onclick={() => (noticeOpen = false)}></button>
			<section role="dialog" aria-modal="true" aria-labelledby="announcement-title" class="relative z-10 w-full max-w-[440px] rounded-2xl border bg-background p-5 shadow-xl">
				<h2 id="announcement-title" class="text-sm font-semibold">Announcements</h2>
				<div class="mt-4 border-l-2 border-primary pl-3">
					<p class="text-xs font-medium">Welcome to the new Cloud Mail workspace</p>
					<p class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Your mailbox, delivery tools, and account settings are coming together in one place.</p>
					<p class="mt-2 text-[9px] text-muted-foreground">Today · Product update</p>
				</div>
				<Button variant="outline" size="sm" class="mt-5 rounded-full" onclick={() => (noticeOpen = false)}>Close</Button>
			</section>
		</div>
	{/if}
</div>

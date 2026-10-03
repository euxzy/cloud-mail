<script lang="ts">
	import { Bell, ChevronDown, Mail, Menu, Moon, Search, Settings, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import AccountManagerDialog from '$lib/components/mail/AccountManagerDialog.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import ComposeDialog from '$lib/components/mail/ComposeDialog.svelte';
	import MailSidebar from '$lib/components/mail/MailSidebar.svelte';
	import Brand from '$lib/components/mail/Brand.svelte';
	import { mailUi, showComposer } from '$lib/mail-ui.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { mailMessages } from '$lib/mail-data.svelte.js';
	import { apiEnabled } from '$lib/api/client.js';
	import { apiRoleName, apiUser, loadApiSession, logoutApi } from '$lib/api/session.svelte.js';
	import { websiteConfig } from '$lib/api/config.js';
	import { fetchApiAccounts, fetchApiMailbox } from '$lib/api/mail.js';
	import { hasPermission } from '$lib/permissions.svelte.js';
	import { loadDrafts } from '$lib/draft-store.js';
	import { toast } from 'svelte-sonner';

	let { children } = $props();
	let menuOpen = $state(false);
	let profileOpen = $state(false);
	let announcement = $state({ enabled: false, title: '', body: '', position: 'top-right', duration: 0, width: 400, offset: 0, type: 'info' });
	let darkMode = $state(false);
	let dataReady = $state(false);
	let apiNotice = $state('');
	let mainElement: HTMLElement;
	let mailboxRequestId = 0;
	let lastMailboxKey = '';
	let lastMailboxFetchKey = '';

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
	const userName = $derived(apiUser.value?.name || apiUser.value?.email || 'Cloud Mail');
	const userInitials = $derived(userName.split(/[\s@]+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'CM');

	function openComposer() { showComposer(); menuOpen = false; }
	function openAccounts() { mailUi.accountsOpen = true; menuOpen = false; }
	function toggleTheme() {
		darkMode = !darkMode;
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('cloud-mail-theme', darkMode ? 'dark' : 'light');
	}
	type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
	const toastPositions: ToastPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'];
	function openAnnouncement() {
		const position = toastPositions.includes(announcement.position as ToastPosition) ? announcement.position as ToastPosition : 'top-right';
		const offset = Math.max(0, announcement.offset);
		const options = {
			position,
			duration: announcement.duration > 0 ? announcement.duration : Number.POSITIVE_INFINITY,
			closeButton: true,
			description: announcement.body || undefined,
			style: {
				width: `calc(100vw - ${32 + offset * 2}px)`,
				maxWidth: `${Math.max(240, announcement.width)}px`,
				marginTop: position.startsWith('top') ? `${offset}px` : undefined,
				marginBottom: position.startsWith('bottom') ? `${offset}px` : undefined,
				marginLeft: position.endsWith('left') ? `${offset}px` : undefined,
				marginRight: position.endsWith('right') ? `${offset}px` : undefined
			}
		};
		const title = announcement.title || 'Announcement';
		switch (announcement.type) {
			case 'success': toast.success(title, options); break;
			case 'warning': toast.warning(title, options); break;
			case 'info': toast.info(title, options); break;
			default: toast(title, options);
		}
	}
	async function signOut() {
		try { await logoutApi(); } catch { /* Clear the local token when the API is offline. */ }
		profileOpen = false;
		void goto('/login');
	}
	function selectedMailboxFolder() {
		const path = page.url.pathname;
		const source = page.url.searchParams.get('from');
		if (path === '/starred' || (path.startsWith('/mail/') && source === 'starred')) return 'starred' as const;
		if (path === '/sent' || (path.startsWith('/mail/') && source === 'sent')) return 'sent' as const;
		if (path === '/' || path === '/inbox' || (path.startsWith('/mail/') && (!source || source === 'inbox'))) return 'inbox' as const;
		return null;
	}

	onMount(() => {
		darkMode = localStorage.getItem('cloud-mail-theme') === 'dark';
		document.documentElement.classList.toggle('dark', darkMode);
		void (async () => {
			if (!apiEnabled) {
				apiNotice = 'API belum dikonfigurasi. Isi VITE_API_BASE_URL untuk menghubungkan workspace.';
				dataReady = true;
				void goto('/login');
				return;
			}
			try {
				const user = await loadApiSession();
				if (!user) { dataReady = true; void goto('/login'); return; }
				const [accounts, config] = await Promise.all([fetchApiAccounts(), websiteConfig()]);
				mailAccounts.splice(0, mailAccounts.length, ...accounts);
				mailUi.currentAccountId = accounts.find((account) => account.primary)?.id ?? accounts[0]?.id ?? 0;
				announcement = {
					enabled: config.notice === 0,
					title: config.noticeTitle ?? '',
					body: config.noticeContent ?? '',
					position: config.noticePosition || 'top-right',
					duration: Number(config.noticeDuration ?? 0),
					width: Number(config.noticeWidth ?? 400),
					offset: Number(config.noticeOffset ?? 0),
					type: config.noticeType || 'info'
				};
				if (announcement.enabled) openAnnouncement();
			} catch (error) {
				apiNotice = error instanceof Error ? error.message : 'Workspace API tidak dapat dimuat.';
				if (!apiUser.value) void goto('/login');
			}
			dataReady = true;
		})();
	});

	$effect(() => {
		if (!dataReady) return;
		if (!apiUser.value) { void goto('/login'); return; }
		const path = page.url.pathname;
		const requiredByPath: Record<string, string> = {
			'/analysis': 'analysis:query', '/all-mail': 'all-email:query', '/all-users': 'user:query',
			'/role': 'role:query', '/invite-code': 'reg-key:query', '/system-settings': 'setting:query'
		};
		const required = requiredByPath[path];
		if (required && !hasPermission(required)) void goto('/inbox');
	});

	$effect(() => {
		if (!dataReady || !apiUser.value) return;
		const path = page.url.pathname;
		const folder = selectedMailboxFolder();
		const accountId = mailUi.currentAccountId;
		const account = mailAccounts.find((item) => item.id === accountId);
		const refreshKey = mailUi.refreshKey;
		const isDrafts = path === '/draft';
		const mailboxKey = `${folder ?? (isDrafts ? 'drafts' : 'none')}:${accountId}:${account?.allMail ? 1 : 0}:${refreshKey}:${apiUser.value.userId}`;
		if (mailboxKey !== lastMailboxKey) {
			lastMailboxKey = mailboxKey;
			lastMailboxFetchKey = '';
			mailboxRequestId += 1;
			mailUi.mailboxPage = 1;
			mailUi.mailboxPageCursors = [0];
			mailUi.mailboxHasMore = false;
			mailUi.mailboxLoading = false;
		}
		if (!folder) {
			if (isDrafts) {
				const requestKey = `${mailboxKey}:drafts`;
				if (requestKey === lastMailboxFetchKey) return;
				lastMailboxFetchKey = requestKey;
				const requestId = ++mailboxRequestId;
				mailUi.mailboxLoading = true;
				mailMessages.splice(0, mailMessages.length);
				void loadDrafts().then((drafts) => {
					if (requestId === mailboxRequestId && page.url.pathname === '/draft') {
						mailMessages.splice(0, mailMessages.length, ...drafts);
						apiNotice = '';
					}
				}).catch((error) => {
					if (requestId === mailboxRequestId) apiNotice = error instanceof Error ? error.message : 'Drafts could not be loaded.';
				}).finally(() => {
					if (requestId === mailboxRequestId) mailUi.mailboxLoading = false;
				});
			}
			return;
		}
		if (folder !== 'starred' && !account) {
			mailMessages.splice(0, mailMessages.length);
			return;
		}
		const pageNumber = mailUi.mailboxPage;
		const requestKey = `${mailboxKey}:${pageNumber}`;
		if (requestKey === lastMailboxFetchKey) return;
		lastMailboxFetchKey = requestKey;
		const requestId = ++mailboxRequestId;
		const cursor = mailUi.mailboxPageCursors[pageNumber - 1] ?? 0;
		mailUi.mailboxLoading = true;
		mailUi.mailboxHasMore = false;
		mailMessages.splice(0, mailMessages.length);
		void fetchApiMailbox(folder, account, cursor || undefined).then((result) => {
			if (requestId !== mailboxRequestId) return;
			mailMessages.splice(0, mailMessages.length, ...result.messages);
			const pageCursors = mailUi.mailboxPageCursors.slice(0, pageNumber);
			pageCursors[pageNumber] = result.cursor;
			mailUi.mailboxPageCursors = pageCursors;
			const cursorAdvanced = !cursor || (result.cursor > 0 && result.cursor < cursor);
			mailUi.mailboxHasMore = result.hasMore && result.cursor > 0 && cursorAdvanced;
			apiNotice = '';
		}).catch((error) => {
			if (requestId === mailboxRequestId) apiNotice = error instanceof Error ? error.message : 'Email tidak dapat dimuat.';
		}).finally(() => {
			if (requestId === mailboxRequestId) mailUi.mailboxLoading = false;
		});
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
			{#if announcement.enabled}<Button variant="ghost" size="icon-sm" class="text-muted-foreground" aria-label="Announcements" onclick={openAnnouncement}><Bell data-icon="inline-start" /></Button>{/if}
			<Button href="/settings" variant="ghost" size="icon-sm" class="hidden text-muted-foreground sm:inline-flex" aria-label="Settings"><Settings data-icon="inline-start" /></Button>
			<div class="relative">
				<Button variant="ghost" class="ml-1 h-10 gap-2 rounded-xl px-1.5" aria-expanded={profileOpen} aria-label="Open account menu" onclick={() => (profileOpen = !profileOpen)}>
					<Avatar.Root size="sm"><Avatar.Fallback class="bg-secondary text-xs font-semibold text-secondary-foreground">{userInitials}</Avatar.Fallback></Avatar.Root>
					<ChevronDown class="hidden text-muted-foreground sm:block" size={13} />
				</Button>
				{#if profileOpen}
					<div class="absolute right-0 top-11 z-30 w-[260px] rounded-xl border bg-popover p-3 shadow-lg">
						<div class="border-b px-2 pb-3">
							<p class="text-xs font-semibold">{userName}</p>
							<p class="mt-1 truncate text-[10px] text-muted-foreground">{apiUser.value?.email}</p>
							<span class="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-[9px] font-medium">{apiRoleName()}</span>
						</div>
						<div class="grid grid-cols-2 gap-2 px-2 py-3 text-[10px]">
							<span class="text-muted-foreground">Messages sent</span><span class="text-right font-medium">{apiUser.value?.sendCount ?? 0}</span>
						<span class="text-muted-foreground">Mailboxes</span><span class="text-right font-medium">{mailAccounts.length} connected</span>
						</div>
						<Button href="/settings" variant="ghost" size="sm" class="w-full justify-start text-xs" onclick={() => (profileOpen = false)}>Account settings</Button>
						<Button href="/login" variant="ghost" size="sm" class="w-full justify-start text-xs text-muted-foreground" onclick={() => { void signOut(); }}>Sign out</Button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<div class="flex min-h-0 flex-1 overflow-hidden">
		<MailSidebar class="hidden lg:flex" onCompose={openComposer} onAccounts={openAccounts} />
		<main bind:this={mainElement} id="main-content" class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-card lg:m-3 lg:ml-0 lg:rounded-2xl lg:border lg:shadow-[0_12px_40px_-30px_rgba(20,80,85,0.35)]">
			{#if !dataReady}<div class="flex h-full items-center justify-center"><LoadingState label="Loading your workspace…" /></div>{:else}
				{#if apiNotice}<div role="alert" class="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:mx-6 lg:mx-8">{apiNotice}</div>{/if}
				{@render children()}
			{/if}
		</main>
	</div>

	<Drawer.Root bind:open={menuOpen} direction="left">
		<Drawer.Content class="h-dvh w-[min(280px,85vw)] max-w-none rounded-none p-0 lg:hidden">
			<Drawer.Header class="sr-only">
				<Drawer.Title>Mail navigation</Drawer.Title>
				<Drawer.Description>Choose a mailbox folder or account.</Drawer.Description>
			</Drawer.Header>
			<MailSidebar class="h-full w-full shadow-xl" onNavigate={() => (menuOpen = false)} onCompose={openComposer} onAccounts={openAccounts} />
		</Drawer.Content>
	</Drawer.Root>
	{#if mailUi.composeOpen}<ComposeDialog />{/if}
	{#if mailUi.accountsOpen}<AccountManagerDialog />{/if}
</div>

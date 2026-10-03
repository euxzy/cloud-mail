<script lang="ts">
	import { Check, KeyRound, Languages, Pencil, ShieldAlert, UserRound } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { goto } from '$app/navigation';
	import { adminUsers } from '$lib/admin-data.svelte.js';
	import { persistPreviewData, previewSession, renamePreviewProfile, setPreviewPassword, signOutPreview } from '$lib/preview-state.svelte.js';

	let editName = $state(false);
	let draftName = $state('');
	let passwordOpen = $state(false);
	let deleteOpen = $state(false);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let notice = $state('');

	function saveName() {
		if (!draftName.trim()) return;
		renamePreviewProfile(draftName.trim());
		editName = false;
		notice = 'Profile name saved.';
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		if (newPassword.length < 6) { notice = 'Use at least 6 characters for the new password.'; return; }
		if (newPassword !== confirmPassword) { notice = 'The passwords do not match.'; return; }
		await setPreviewPassword(previewSession.email, newPassword);
		passwordOpen = false;
		newPassword = '';
		confirmPassword = '';
		notice = 'Password changed for this local account.';
	}

	async function deleteAccount() {
		const user = adminUsers.find((item) => item.email === previewSession.email);
		if (user) user.status = 'Deleted';
		await persistPreviewData();
		signOutPreview();
		void goto('/login');
	}
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[920px]">
		<div class="mb-7"><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Settings</h1><p class="mt-1 text-[13px] text-muted-foreground">Manage your account profile and security.</p></div>
		<div class="grid gap-6 md:grid-cols-[190px_minmax(0,1fr)] md:gap-10">
			<nav aria-label="Settings sections" class="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
				<a href="#profile" class="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-secondary px-3 text-xs font-medium md:rounded-lg"><UserRound size={14} />Profile</a>
				<a href="#security" class="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted md:rounded-lg"><KeyRound size={14} />Security</a>
				<a href="#preferences" class="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted md:rounded-lg"><Languages size={14} />Preferences</a>
			</nav>

			<div class="min-w-0 space-y-7">
				<section id="profile">
					<div><h2 class="text-sm font-semibold">Profile</h2><p class="mt-1 text-[11px] text-muted-foreground">Your identity in the Cloud Mail workspace.</p></div>
					<Separator class="my-4" />
					<div class="space-y-4">
						<div class="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center"><span class="text-[11px] font-medium">Display name</span><div class="flex min-w-0 items-center gap-2">{#if editName}<Input bind:value={draftName} class="h-9 max-w-[320px] text-xs" />{:else}<span class="truncate text-xs">{previewSession.name}</span>{/if}{#if editName}<Button size="xs" onclick={saveName}>Save</Button><Button variant="ghost" size="xs" onclick={() => (editName = false)}>Cancel</Button>{:else}<Button variant="ghost" size="icon-xs" aria-label="Edit display name" onclick={() => { draftName = previewSession.name; editName = true; }}><Pencil data-icon="inline-start" /></Button>{/if}</div></div>
						<div class="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center"><span class="text-[11px] font-medium">Email address</span><span class="truncate text-xs text-muted-foreground">{previewSession.email}</span></div>
						<div class="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center"><span class="text-[11px] font-medium">Account role</span><span class="text-xs">{previewSession.role}</span></div>
					</div>
				</section>

				<section id="security">
					<div><h2 class="text-sm font-semibold">Security</h2><p class="mt-1 text-[11px] text-muted-foreground">Keep your account credentials up to date.</p></div>
					<Separator class="my-4" />
					<div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"><div><p class="text-[11px] font-medium">Password</p><p class="mt-1 text-[10px] text-muted-foreground">Change your Cloud Mail sign-in password.</p></div><Button variant="outline" size="sm" class="rounded-full" onclick={() => (passwordOpen = true)}>Change password</Button></div>
				</section>

				<section id="preferences">
					<div><h2 class="text-sm font-semibold">Preferences</h2><p class="mt-1 text-[11px] text-muted-foreground">Choose the language used across the workspace.</p></div>
					<Separator class="my-4" />
					<div class="flex items-center justify-between gap-3 rounded-lg border px-3 py-3"><div><p class="text-[11px] font-medium">Language</p><p class="mt-1 text-[10px] text-muted-foreground">Cloud Mail is currently displayed in English.</p></div><span class="rounded-full bg-secondary px-3 py-1.5 text-[10px] font-medium">English</span></div>
				</section>

				<section class="rounded-xl border border-destructive/30 p-4">
					<div class="flex items-start gap-3"><ShieldAlert size={16} class="mt-0.5 text-destructive" /><div class="flex-1"><h2 class="text-xs font-semibold">Delete account</h2><p class="mt-1 max-w-[540px] text-[10px] leading-relaxed text-muted-foreground">Deleting your account removes your user profile and connected mailboxes. This action cannot be undone.</p></div><Button variant="destructive" size="sm" class="shrink-0 rounded-full" onclick={() => (deleteOpen = true)}>Delete account</Button></div>
				</section>
				{#if notice}<p role="status" class="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Check size={13} />{notice}</p>{/if}
			</div>
		</div>
	</div>
</section>

{#if passwordOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close password dialog" onclick={() => (passwordOpen = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="password-title" class="relative z-10 w-full max-w-[390px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="password-title" class="text-sm font-semibold">Change password</h2><p class="mt-1 text-[10px] text-muted-foreground">Enter and confirm your new password.</p>
			<form class="mt-4 space-y-3" onsubmit={changePassword}><Input bind:value={newPassword} type="password" minlength={6} required placeholder="New password" class="h-9 text-xs" /><Input bind:value={confirmPassword} type="password" minlength={6} required placeholder="Confirm new password" class="h-9 text-xs" /><div class="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" onclick={() => (passwordOpen = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full">Save password</Button></div></form>
		</div>
	</div>
{/if}

{#if deleteOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" role="presentation">
		<button class="absolute inset-0" aria-label="Close delete account dialog" onclick={() => (deleteOpen = false)}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="delete-title" class="relative z-10 w-full max-w-[400px] rounded-2xl border bg-background p-5 shadow-xl">
			<h2 id="delete-title" class="text-sm font-semibold">Delete your account?</h2><p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">Your local account will be deactivated and signed out.</p>
			<div class="mt-5 flex justify-end gap-2"><Button variant="ghost" size="sm" class="rounded-full" onclick={() => (deleteOpen = false)}>Cancel</Button><Button variant="destructive" size="sm" class="rounded-full" onclick={deleteAccount}>Continue</Button></div>
		</div>
	</div>
{/if}

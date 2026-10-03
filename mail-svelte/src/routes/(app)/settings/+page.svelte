<script lang="ts">
	import { KeyRound, Languages, LoaderCircle, Pencil, ShieldAlert, UserRound } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { goto } from '$app/navigation';
	import { apiRequest } from '$lib/api/client.js';
	import { apiRoleName, apiUser, clearApiSession, fetchApiUser } from '$lib/api/session.svelte.js';
	import { renameApiAccount } from '$lib/api/mail.js';
	import { toast } from 'svelte-sonner';

	let editName = $state(false);
	let draftName = $state('');
	let passwordOpen = $state(false);
	let deleteOpen = $state(false);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let savingName = $state(false);
	let changingPassword = $state(false);
	let deletingAccount = $state(false);

	async function saveName() {
		if (!draftName.trim() || !apiUser.value?.account?.accountId || savingName) return;
		savingName = true;
		try {
			await renameApiAccount(apiUser.value.account.accountId, draftName.trim());
			await fetchApiUser();
			editName = false;
			toast.success('Profile name saved.');
		} catch (error) { toast.error(error instanceof Error ? error.message : 'Profile name could not be updated.'); }
		finally { savingName = false; }
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		if (newPassword.length < 6) { toast.warning('Use at least 6 characters for the new password.'); return; }
		if (newPassword !== confirmPassword) { toast.warning('The passwords do not match.'); return; }
		if (changingPassword) return;
		changingPassword = true;
		try {
			await apiRequest('/my/resetPassword', { method: 'PUT', body: { password: newPassword } });
			passwordOpen = false;
			newPassword = '';
			confirmPassword = '';
			toast.success('Password changed.');
		} catch (error) { toast.error(error instanceof Error ? error.message : 'Password could not be changed.'); }
		finally { changingPassword = false; }
	}

	async function deleteAccount() {
		if (deletingAccount) return;
		deletingAccount = true;
		try {
			await apiRequest('/my/delete', { method: 'DELETE' });
			toast.success('Account deleted.');
			clearApiSession();
			void goto('/login');
		} catch (error) { toast.error(error instanceof Error ? error.message : 'Account could not be deleted.'); }
		finally { deletingAccount = false; }
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
						<div class="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center"><span class="text-[11px] font-medium">Display name</span><div class="flex min-w-0 items-center gap-2">{#if editName}<Input bind:value={draftName} disabled={savingName} class="h-9 max-w-[320px] text-xs" />{:else}<span class="truncate text-xs">{apiUser.value?.name || apiUser.value?.email}</span>{/if}{#if editName}<Button size="xs" disabled={savingName} onclick={() => { void saveName(); }}>{#if savingName}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{savingName ? 'Saving…' : 'Save'}</Button><Button variant="ghost" size="xs" disabled={savingName} onclick={() => (editName = false)}>Cancel</Button>{:else}<Button variant="ghost" size="icon-xs" aria-label="Edit display name" onclick={() => { draftName = apiUser.value?.name || ''; editName = true; }}><Pencil data-icon="inline-start" /></Button>{/if}</div></div>
						<div class="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center"><span class="text-[11px] font-medium">Email address</span><span class="truncate text-xs text-muted-foreground">{apiUser.value?.email}</span></div>
						<div class="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center"><span class="text-[11px] font-medium">Account role</span><span class="text-xs">{apiRoleName()}</span></div>
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
			</div>
		</div>
	</div>
</section>

{#if passwordOpen}
	<Dialog.Root bind:open={passwordOpen}>
		<Dialog.Content class="w-[calc(100vw-2rem)] max-w-[390px] gap-0 p-5">
			<Dialog.Header><Dialog.Title id="password-title" class="text-sm font-semibold">Change password</Dialog.Title><Dialog.Description class="text-[10px] text-muted-foreground">Enter and confirm your new password.</Dialog.Description></Dialog.Header>
			<form class="mt-4 space-y-3" onsubmit={changePassword}><Input bind:value={newPassword} type="password" minlength={6} required placeholder="New password" class="h-9 text-xs" disabled={changingPassword} /><Input bind:value={confirmPassword} type="password" minlength={6} required placeholder="Confirm new password" class="h-9 text-xs" disabled={changingPassword} /><div class="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" size="sm" class="rounded-full" disabled={changingPassword} onclick={() => (passwordOpen = false)}>Cancel</Button><Button type="submit" size="sm" class="rounded-full" disabled={changingPassword}>{#if changingPassword}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{changingPassword ? 'Saving…' : 'Save password'}</Button></div></form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if deleteOpen}
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content class="w-[calc(100vw-2rem)] max-w-[400px] gap-0 p-5">
			<Dialog.Header><Dialog.Title id="delete-title" class="text-sm font-semibold">Delete your account?</Dialog.Title><Dialog.Description class="mt-2 text-[11px] leading-relaxed text-muted-foreground">Your account and connected mailboxes will be removed.</Dialog.Description></Dialog.Header>
			<div class="mt-5 flex justify-end gap-2"><Button variant="ghost" size="sm" class="rounded-full" disabled={deletingAccount} onclick={() => (deleteOpen = false)}>Cancel</Button><Button variant="destructive" size="sm" class="rounded-full" disabled={deletingAccount} onclick={deleteAccount}>{#if deletingAccount}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}{deletingAccount ? 'Deleting…' : 'Continue'}</Button></div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import Brand from '$lib/components/mail/Brand.svelte';

	let { children } = $props();
	let appearance = $state({ title: 'Cloud Mail', background: '', projectLink: true });
	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem('cloud-mail-system-settings-preview') || '{}') as { title?: string; loginBackground?: string; projectLink?: boolean };
			appearance = { title: saved.title || 'Cloud Mail', background: /^https?:\/\//.test(saved.loginBackground || '') ? saved.loginBackground! : '', projectLink: saved.projectLink ?? true };
		} catch { /* Use default appearance. */ }
	});
</script>

<div class="grid min-h-svh bg-card lg:grid-cols-[minmax(400px,0.95fr)_1.05fr]">
	<aside class="relative hidden flex-col justify-between overflow-hidden bg-[#e4f1f0] px-10 py-9 text-[#193c42] lg:flex xl:px-14 dark:bg-[#18343b] dark:text-foreground" style={appearance.background ? `background-image: linear-gradient(120deg, rgb(228 241 240 / 92%), rgb(228 241 240 / 80%)), url('${appearance.background}'); background-size: cover; background-position: center;` : ''}>
		<div><Brand /><p class="mt-2 text-xs font-medium">{appearance.title}</p></div>
		<div class="pointer-events-none absolute -right-32 -top-20 size-[420px] rounded-full border border-[#afd4d0]/60 dark:border-[#3c686d]"></div>
		<div class="pointer-events-none absolute -right-16 -top-4 size-[310px] rounded-full border border-[#afd4d0]/60 dark:border-[#3c686d]"></div>
		<div class="relative max-w-[480px] pb-4">
			<p class="text-xs font-semibold text-primary">Your inbox, in focus</p>
			<h1 class="mt-5 text-[clamp(38px,4vw,58px)] font-semibold leading-[1.07] tracking-[-0.065em]">A calmer place for every conversation.</h1>
			<p class="mt-5 max-w-[370px] text-[15px] leading-relaxed text-[#58777b] dark:text-muted-foreground">Read, organize, and send email in one clear workspace.</p>
		</div>
		<div class="relative max-w-[460px] rounded-2xl border border-white/80 bg-white/75 p-3 shadow-[0_20px_60px_-36px_rgba(28,91,96,0.5)] backdrop-blur-sm dark:border-border dark:bg-card/80">
			<div class="flex items-center justify-between px-2 pb-1"><span class="text-[11px] font-semibold">Inbox</span><span class="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">3 new</span></div>
			<div class="flex items-center gap-3 border-b border-[#e4eeee] px-2 py-3 dark:border-border">
				<span class="size-2 rounded-full bg-primary"></span>
				<span class="w-24 text-[11px] font-semibold">Alex Morgan</span>
				<span class="min-w-0 flex-1 truncate text-[11px] text-[#668186] dark:text-muted-foreground">Visual direction for the launch page</span>
				<span class="text-[10px] text-[#668186] dark:text-muted-foreground">10:42</span>
			</div>
			<div class="flex items-center gap-3 border-b border-[#e4eeee] px-2 py-3 dark:border-border">
				<span class="size-2 rounded-full bg-transparent"></span>
				<span class="w-24 text-[11px] font-medium">Jamie Lee</span>
				<span class="min-w-0 flex-1 truncate text-[11px] text-[#668186] dark:text-muted-foreground">A few notes after the demo</span>
				<span class="text-[10px] text-[#668186] dark:text-muted-foreground">9:18</span>
			</div>
			<div class="flex items-center gap-3 px-2 py-3">
				<span class="size-2 rounded-full bg-transparent"></span>
				<span class="w-24 text-[11px] font-medium">Cloud Mail</span>
				<span class="min-w-0 flex-1 truncate text-[11px] text-[#668186] dark:text-muted-foreground">Your weekly activity summary</span>
				<span class="text-[10px] text-[#668186] dark:text-muted-foreground">8:56</span>
			</div>
		</div>
		<p class="text-[11px] text-[#668186] dark:text-muted-foreground">{appearance.title} · Local workspace</p>
	</aside>

	<main class="flex min-h-svh flex-col px-5 py-6 sm:px-10 lg:px-12">
		<div class="lg:hidden"><Brand /></div>
		<div class="flex flex-1 items-center justify-center py-10">
			<div class="w-full max-w-[400px]">{@render children()}</div>
		</div>
		<div class="flex items-center justify-center gap-2 text-[10px] text-muted-foreground lg:justify-end">
			{#if appearance.projectLink}<a href="https://github.com/maillab/cloud-mail" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 hover:underline"><span>{appearance.title}</span><span>·</span><span>Project</span><ArrowUpRight size={12} /></a>{:else}<span>{appearance.title}</span>{/if}
		</div>
	</main>
</div>

<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';
	import Brand from '$lib/components/mail/Brand.svelte';

	let { children } = $props();
</script>

<div class="grid min-h-svh bg-background lg:grid-cols-[minmax(340px,0.8fr)_1.2fr]">
	<aside class="hidden flex-col justify-between border-r bg-muted/25 px-10 py-9 lg:flex xl:px-14">
		<Brand />
		<div class="max-w-[440px] pb-4">
			<p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Email, with more room</p>
			<h1 class="mt-5 text-[38px] font-normal leading-[1.12] tracking-[-0.055em]">Keep important conversations easy to find.</h1>
			<p class="mt-4 max-w-[360px] text-sm leading-relaxed text-muted-foreground">A simple workspace for reading, organizing, and sending email.</p>
		</div>
		<div class="max-w-[440px] border-y py-2">
			<div class="flex items-center gap-3 border-b py-3">
				<span class="size-2 rounded-full bg-primary"></span>
				<span class="w-24 text-[11px] font-medium">Alex Morgan</span>
				<span class="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">Visual direction for the launch page</span>
				<span class="text-[10px] text-muted-foreground">10:42 AM</span>
			</div>
			<div class="flex items-center gap-3 border-b py-3">
				<span class="size-2 rounded-full bg-transparent"></span>
				<span class="w-24 text-[11px] font-medium">Jamie Lee</span>
				<span class="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">A few notes after the demo</span>
				<span class="text-[10px] text-muted-foreground">9:18 AM</span>
			</div>
			<div class="flex items-center gap-3 py-3">
				<span class="size-2 rounded-full bg-transparent"></span>
				<span class="w-24 text-[11px] font-medium">Cloud Mail</span>
				<span class="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">Your weekly activity summary</span>
				<span class="text-[10px] text-muted-foreground">8:56 AM</span>
			</div>
		</div>
		<p class="text-[10px] text-muted-foreground">Cloud Mail · UI preview</p>
	</aside>

	<main class="flex min-h-svh flex-col px-5 py-6 sm:px-10 lg:px-12">
		<div class="lg:hidden"><Brand /></div>
		<div class="flex flex-1 items-center justify-center py-10">
			<div class="w-full max-w-[380px]">{@render children()}</div>
		</div>
		<div class="flex items-center justify-center gap-2 text-[10px] text-muted-foreground lg:justify-end">
			<span>Cloud Mail</span><span>·</span><span>UI preview</span><ArrowUpRight size={12} />
		</div>
	</main>
</div>

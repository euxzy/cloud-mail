<script lang="ts">
	import { ArrowDownRight, ArrowUpRight, Mail, Send, Users, WalletCards } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	const summary = [
		{ label: 'Messages received', value: '18,420', active: '18,104 active', deleted: '316 deleted', delta: '+12.8%', icon: Mail },
		{ label: 'Messages sent', value: '6,284', active: '6,192 active', deleted: '92 deleted', delta: '+8.4%', icon: Send },
		{ label: 'Mailboxes', value: '426', active: '412 active', deleted: '14 deleted', delta: '+4.2%', icon: WalletCards },
		{ label: 'Users', value: '1,208', active: '1,194 active', deleted: '14 deleted', delta: '+6.1%', icon: Users }
	];
	const volume = [34, 46, 40, 62, 54, 72, 64, 85, 72, 92, 68, 78];
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	let range = $state('Last 12 months');
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Analytics</h1><p class="mt-1 text-[13px] text-muted-foreground">A workspace-wide view of mailbox activity.</p></div>
			<select bind:value={range} aria-label="Date range" class="h-10 rounded-lg border bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
				<option>Last 12 months</option><option>Last 30 days</option><option>Last 7 days</option>
			</select>
		</div>

		<div class="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each summary as item (item.label)}
				{@const Icon = item.icon}
				<div class="rounded-xl bg-muted/55 p-4 sm:p-5">
					<div class="flex items-center justify-between gap-3"><span class="text-xs font-medium text-muted-foreground">{item.label}</span><Icon size={16} class="text-primary" /></div>
					<div class="mt-4 flex items-baseline gap-2"><span class="text-[29px] font-semibold tracking-[-0.05em]">{item.value}</span><span class="inline-flex items-center gap-0.5 text-[11px] text-primary"><ArrowUpRight size={12} />{item.delta}</span></div>
					<div class="mt-2 flex gap-3 text-[10px] text-muted-foreground"><span>{item.active}</span><span>{item.deleted}</span></div>
				</div>
			{/each}
		</div>

		<div class="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
			<section class="rounded-xl border bg-card p-4 sm:p-5">
				<div class="flex items-start justify-between gap-3"><div><h2 class="text-xs font-semibold">Message volume</h2><p class="mt-1 text-[10px] text-muted-foreground">Received and sent messages over time</p></div><Badge variant="outline" class="h-5 rounded-full px-2 text-[9px]">All mailboxes</Badge></div>
				<div class="mt-6 flex h-[210px] items-end gap-2 border-b border-l px-2 sm:gap-4 sm:px-4">
					{#each volume as height, index (index)}
						<div class="flex h-full flex-1 items-end justify-center gap-1">
							<div class="w-2.5 rounded-t bg-primary/80 sm:w-3" style={`height:${height}%`}></div>
							<div class="hidden w-2.5 rounded-t bg-muted-foreground/25 sm:block sm:w-3" style={`height:${Math.max(12, height * 0.62)}%`}></div>
						</div>
					{/each}
				</div>
				<div class="mt-2 flex justify-between pl-2 text-[9px] text-muted-foreground sm:px-4">{#each months as month (month)}<span>{month}</span>{/each}</div>
				<div class="mt-4 flex gap-4 text-[9px] text-muted-foreground"><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-primary/80"></span>Received</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-muted-foreground/25"></span>Sent</span></div>
			</section>

			<section class="rounded-xl border bg-card p-4 sm:p-5">
				<h2 class="text-xs font-semibold">Most active senders</h2><p class="mt-1 text-[10px] text-muted-foreground">Top accounts by message volume</p>
				<div class="mt-5 space-y-4">
					{#each [{ name: 'sarah@cloudmail.id', count: 1284, percent: 92 }, { name: 'support@cloudmail.id', count: 846, percent: 68 }, { name: 'nisa@ruangrupa.co', count: 621, percent: 53 }, { name: 'alerts@cloudmail.id', count: 402, percent: 37 }] as sender (sender.name)}
						<div><div class="mb-1.5 flex justify-between gap-3 text-[10px]"><span class="truncate text-muted-foreground">{sender.name}</span><span class="shrink-0 tabular-nums">{sender.count.toLocaleString()}</span></div><div class="h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary/75" style={`width:${sender.percent}%`}></div></div></div>
					{/each}
				</div>
				<div class="mt-6 rounded-lg bg-muted/50 p-3"><p class="text-[10px] font-medium">Delivery status</p><div class="mt-3 flex items-center gap-3"><div class="relative flex size-12 items-center justify-center rounded-full border-[5px] border-primary/80 text-[11px] font-semibold">98<span class="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-primary"></span></div><div><p class="text-xs font-medium">98.4% delivered</p><p class="mt-1 text-[9px] text-muted-foreground">Across the selected period</p></div></div></div>
			</section>
		</div>

		<div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
			<div><p class="text-[11px] font-medium">Need message-level details?</p><p class="mt-1 text-[10px] text-muted-foreground">Review delivery status, recipients, and account activity in All mail.</p></div>
			<Button href="/all-mail" variant="outline" size="sm" class="rounded-full">Open all mail <ArrowDownRight data-icon="inline-end" /></Button>
		</div>
	</div>
</section>

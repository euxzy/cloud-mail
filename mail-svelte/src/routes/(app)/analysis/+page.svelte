<script lang="ts">
	import { ArrowDownRight, ArrowUpRight, Mail, Send, Users, WalletCards } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import SelectControl from '$lib/components/SelectControl.svelte';
	import { mailMessages } from '$lib/mail-data.svelte.js';
	import { mailAccounts } from '$lib/mail-accounts.svelte.js';
	import { adminUsers } from '$lib/admin-data.svelte.js';

	let range = $state('Last 12 months');
	const now = new Date();
	const periodStart = $derived.by(() => {
		const start = new Date(now);
		if (range === 'Last 7 days') start.setDate(start.getDate() - 6);
		else if (range === 'Last 30 days') start.setDate(start.getDate() - 29);
		else start.setMonth(start.getMonth() - 11);
		start.setHours(0, 0, 0, 0);
		return start;
	});
	const periodMessages = $derived(mailMessages.filter((message) => message.timestamp && new Date(message.timestamp) >= periodStart));
	const summary = $derived([
		{ label: 'Messages received', value: periodMessages.filter((message) => message.folder === 'inbox').length, detail: `${mailMessages.filter((message) => message.folder === 'inbox' && !message.read).length} unread`, icon: Mail },
		{ label: 'Messages sent', value: periodMessages.filter((message) => message.folder === 'sent').length, detail: `${periodMessages.filter((message) => message.folder === 'sent' && message.status === 'delivered').length} delivered`, icon: Send },
		{ label: 'Mailboxes', value: mailAccounts.length, detail: `${mailAccounts.filter((account) => account.pinned).length} pinned`, icon: WalletCards },
		{ label: 'Users', value: adminUsers.length, detail: `${adminUsers.filter((user) => user.status === 'Active').length} active`, icon: Users }
	]);
	const buckets = $derived.by(() => {
		const count = range === 'Last 12 months' ? 12 : range === 'Last 30 days' ? 6 : 7;
		return Array.from({ length: count }, (_, index) => {
			const start = new Date(periodStart);
			if (range === 'Last 12 months') start.setMonth(start.getMonth() + index);
			else start.setDate(start.getDate() + index * (range === 'Last 30 days' ? 5 : 1));
			const end = new Date(start);
			if (range === 'Last 12 months') end.setMonth(end.getMonth() + 1);
			else end.setDate(end.getDate() + (range === 'Last 30 days' ? 5 : 1));
			const messages = periodMessages.filter((message) => new Date(message.timestamp ?? 0) >= start && new Date(message.timestamp ?? 0) < end);
			return { label: start.toLocaleDateString('en-US', range === 'Last 12 months' ? { month: 'short' } : { month: 'short', day: 'numeric' }), received: messages.filter((message) => message.folder === 'inbox').length, sent: messages.filter((message) => message.folder === 'sent').length };
		});
	});
	const maximum = $derived(Math.max(1, ...buckets.flatMap((bucket) => [bucket.received, bucket.sent])));
	const senders = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const message of periodMessages) if (message.folder === 'sent') counts.set(message.address, (counts.get(message.address) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, count }));
	});
	const deliveryRate = $derived.by(() => {
		const sent = periodMessages.filter((message) => message.folder === 'sent');
		return sent.length ? Math.round(sent.filter((message) => message.status === 'delivered').length / sent.length * 100) : 0;
	});
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Analytics</h1><p class="mt-1 text-[13px] text-muted-foreground">A workspace-wide view of mailbox activity.</p></div>
			<SelectControl bind:value={range} items={['Last 12 months', 'Last 30 days', 'Last 7 days'].map((option) => ({ value: option, label: option }))} aria-label="Date range" class="h-10 text-xs" />
		</div>

		<div class="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each summary as item (item.label)}
				{@const Icon = item.icon}
				<div class="rounded-xl bg-muted/55 p-4 sm:p-5">
					<div class="flex items-center justify-between gap-3"><span class="text-xs font-medium text-muted-foreground">{item.label}</span><Icon size={16} class="text-primary" /></div>
					<div class="mt-4 flex items-baseline gap-2"><span class="text-[29px] font-semibold tracking-[-0.05em]">{item.value.toLocaleString()}</span></div>
					<div class="mt-2 flex gap-3 text-[10px] text-muted-foreground"><span>{item.detail}</span></div>
				</div>
			{/each}
		</div>

		<div class="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
			<section class="rounded-xl border bg-card p-4 sm:p-5">
				<div class="flex items-start justify-between gap-3"><div><h2 class="text-xs font-semibold">Message volume</h2><p class="mt-1 text-[10px] text-muted-foreground">Received and sent messages over time</p></div><Badge variant="outline" class="h-5 rounded-full px-2 text-[9px]">All mailboxes</Badge></div>
				<div class="mt-6 flex h-[210px] items-end gap-2 border-b border-l px-2 sm:gap-4 sm:px-4">
					{#each buckets as bucket, index (index)}
						<div class="flex h-full flex-1 items-end justify-center gap-1">
							<div class="w-2.5 rounded-t bg-primary/80 sm:w-3" title={`${bucket.received} received`} style={`height:${bucket.received / maximum * 100}%`}></div>
							<div class="hidden w-2.5 rounded-t bg-muted-foreground/25 sm:block sm:w-3" title={`${bucket.sent} sent`} style={`height:${bucket.sent / maximum * 100}%`}></div>
						</div>
					{/each}
				</div>
				<div class="mt-2 flex justify-between pl-2 text-[9px] text-muted-foreground sm:px-4">{#each buckets as bucket (bucket.label)}<span>{bucket.label}</span>{/each}</div>
				<div class="mt-4 flex gap-4 text-[9px] text-muted-foreground"><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-primary/80"></span>Received</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-muted-foreground/25"></span>Sent</span></div>
			</section>

			<section class="rounded-xl border bg-card p-4 sm:p-5">
				<h2 class="text-xs font-semibold">Most active senders</h2><p class="mt-1 text-[10px] text-muted-foreground">Top accounts by message volume</p>
				<div class="mt-5 space-y-4">
					{#each senders as sender (sender.name)}
						<div><div class="mb-1.5 flex justify-between gap-3 text-[10px]"><span class="truncate text-muted-foreground">{sender.name}</span><span class="shrink-0 tabular-nums">{sender.count.toLocaleString()}</span></div><div class="h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary/75" style={`width:${sender.count / Math.max(1, senders[0]?.count ?? 1) * 100}%`}></div></div></div>
				{:else}<p class="text-[10px] text-muted-foreground">No sent mail in this period.</p>{/each}
				</div>
				<div class="mt-6 rounded-lg bg-muted/50 p-3"><p class="text-[10px] font-medium">Delivery status</p><div class="mt-3 flex items-center gap-3"><div class="relative flex size-12 items-center justify-center rounded-full border-[5px] border-primary/80 text-[11px] font-semibold">{deliveryRate}%<span class="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-primary"></span></div><div><p class="text-xs font-medium">{deliveryRate}% delivered</p><p class="mt-1 text-[9px] text-muted-foreground">Across the selected period</p></div></div></div>
			</section>
		</div>

		<div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
			<div><p class="text-[11px] font-medium">Need message-level details?</p><p class="mt-1 text-[10px] text-muted-foreground">Review delivery status, recipients, and account activity in All mail.</p></div>
			<Button href="/all-mail" variant="outline" size="sm" class="rounded-full">Open all mail <ArrowDownRight data-icon="inline-end" /></Button>
		</div>
	</div>
</section>

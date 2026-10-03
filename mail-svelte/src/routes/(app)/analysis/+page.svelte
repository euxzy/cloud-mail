<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowDownRight, Mail, Send, Users, WalletCards } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { fetchAnalysis, type AnalysisData } from '$lib/api/admin.js';

	let data = $state<AnalysisData | null>(null);
	let notice = $state('');
	let loading = $state(true);
	onMount(() => {
		void fetchAnalysis(Intl.DateTimeFormat().resolvedOptions().timeZone).then((value) => { data = value; })
			.catch((error) => { notice = error instanceof Error ? error.message : 'Analytics could not be loaded.'; })
			.finally(() => { loading = false; });
	});

	const summary = $derived([
		{ label: 'Messages received', value: Number(data?.numberCount?.receiveTotal ?? 0), detail: `${Number(data?.numberCount?.normalReceiveTotal ?? 0).toLocaleString()} active · ${Number(data?.numberCount?.delReceiveTotal ?? 0).toLocaleString()} deleted`, icon: Mail },
		{ label: 'Messages sent', value: Number(data?.numberCount?.sendTotal ?? 0), detail: `${Number(data?.numberCount?.normalSendTotal ?? 0).toLocaleString()} active · ${Number(data?.numberCount?.delSendTotal ?? 0).toLocaleString()} deleted`, icon: Send },
		{ label: 'Mailboxes', value: Number(data?.numberCount?.accountTotal ?? 0), detail: `${Number(data?.numberCount?.normalAccountTotal ?? 0).toLocaleString()} active · ${Number(data?.numberCount?.delAccountTotal ?? 0).toLocaleString()} deleted`, icon: WalletCards },
		{ label: 'Users', value: Number(data?.numberCount?.userTotal ?? 0), detail: `${Number(data?.numberCount?.normalUserTotal ?? 0).toLocaleString()} active · ${Number(data?.numberCount?.delUserTotal ?? 0).toLocaleString()} deleted`, icon: Users }
	]);
	const buckets = $derived.by(() => {
		const received = new Map((data?.emailDayCount?.receiveDayCount ?? []).map((item) => [item.date, Number(item.total)]));
		const sent = new Map((data?.emailDayCount?.sendDayCount ?? []).map((item) => [item.date, Number(item.total)]));
		return [...new Set([...received.keys(), ...sent.keys()])].sort().map((date) => ({
			label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
			received: received.get(date) ?? 0, sent: sent.get(date) ?? 0
		}));
	});
	const maximum = $derived(Math.max(1, ...buckets.flatMap((bucket) => [bucket.received, bucket.sent])));
	const senders = $derived((data?.receiveRatio?.nameRatio ?? []).map((item) => ({ name: item.name, count: Number(item.total) })));
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	{#if notice}<p role="alert" class="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{notice}</p>{/if}
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Analytics</h1><p class="mt-1 text-[13px] text-muted-foreground">A workspace-wide view of mailbox activity.</p></div>
			<Badge variant="outline" class="h-8 rounded-full px-3 text-[10px]">Last 15 days</Badge>
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
				<h2 class="text-xs font-semibold">Most common received senders</h2><p class="mt-1 text-[10px] text-muted-foreground">Top sender names in received mail</p>
				<div class="mt-5 space-y-4">
					{#each senders as sender (sender.name)}
						<div><div class="mb-1.5 flex justify-between gap-3 text-[10px]"><span class="truncate text-muted-foreground">{sender.name}</span><span class="shrink-0 tabular-nums">{sender.count.toLocaleString()}</span></div><div class="h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary/75" style={`width:${sender.count / Math.max(1, senders[0]?.count ?? 1) * 100}%`}></div></div></div>
				{:else}<p class="text-[10px] text-muted-foreground">No sender totals are available yet.</p>{/each}
				</div>
				<div class="mt-6 rounded-lg bg-muted/50 p-3"><p class="text-[10px] font-medium">Sent today</p><div class="mt-3 flex items-center gap-3"><div class="relative flex size-12 items-center justify-center rounded-full border-[5px] border-primary/80 text-[11px] font-semibold">{Number(data?.daySendTotal ?? 0).toLocaleString()}<span class="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-primary"></span></div><div><p class="text-xs font-medium">Messages sent today</p><p class="mt-1 text-[9px] text-muted-foreground">Across all users and mailboxes</p></div></div></div>
			</section>
		</div>

		<div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
			<div><p class="text-[11px] font-medium">Need message-level details?</p><p class="mt-1 text-[10px] text-muted-foreground">Review delivery status, recipients, and account activity in All mail.</p></div>
			<Button href="/all-mail" variant="outline" size="sm" class="rounded-full">Open all mail <ArrowDownRight data-icon="inline-end" /></Button>
		</div>
	</div>
</section>

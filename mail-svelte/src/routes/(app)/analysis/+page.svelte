<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowDownRight, LoaderCircle, Mail, RefreshCw, Send, Users, WalletCards } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import { scaleBand } from 'd3-scale';
	import { BarChart } from 'layerchart';
	import { fetchAnalysis, type AnalysisData } from '$lib/api/admin.js';

	let data = $state<AnalysisData | null>(null);
	let notice = $state('');
	let loading = $state(true);
	async function loadAnalytics() {
		loading = true;
		notice = '';
		try {
			data = await fetchAnalysis(Intl.DateTimeFormat().resolvedOptions().timeZone);
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Analytics could not be loaded.';
		} finally {
			loading = false;
		}
	}
	onMount(() => { void loadAnalytics(); });

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
	const senders = $derived((data?.receiveRatio?.nameRatio ?? []).map((item) => ({ name: item.name, count: Number(item.total) })));
	const chartConfig = {
		received: { label: 'Received', color: 'var(--chart-1)' },
		sent: { label: 'Sent', color: 'var(--chart-2)' }
	} satisfies Chart.ChartConfig;
</script>

<section class="min-h-full px-3 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
	<div class="mx-auto max-w-[1180px]">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div><h1 class="text-[27px] font-semibold tracking-[-0.055em] sm:text-[30px]">Analytics</h1><p class="mt-1 text-[13px] text-muted-foreground">A workspace-wide view of mailbox activity.</p></div>
			<div class="flex items-center gap-2"><Badge variant="outline" class="h-8 rounded-full px-3 text-[10px]">Last 15 days</Badge><Button variant="outline" size="sm" disabled={loading} onclick={() => void loadAnalytics()}>{#if loading}<LoaderCircle class="animate-spin" data-icon="inline-start" />{:else}<RefreshCw data-icon="inline-start" />{/if}Refresh</Button></div>
		</div>

		{#if loading && !data}
			<div class="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{#each [1, 2, 3, 4] as card (card)}<div class="animate-pulse rounded-xl bg-muted/55 p-4 sm:p-5"><div class="h-3 w-28 rounded bg-muted-foreground/15"></div><div class="mt-5 h-8 w-24 rounded bg-muted-foreground/15"></div><div class="mt-3 h-3 w-36 rounded bg-muted-foreground/10"></div></div>{/each}
			</div>
			<div class="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]"><section class="rounded-xl border p-4 sm:p-5"><LoadingState label="Loading message volume…" class="mb-5" /><div class="h-[220px] animate-pulse rounded-lg bg-muted/50"></div></section><section class="rounded-xl border p-4 sm:p-5"><LoadingState label="Loading sender totals…" class="mb-5" /><div class="space-y-4">{#each [1, 2, 3, 4] as row (row)}<div class="h-8 animate-pulse rounded bg-muted/50"></div>{/each}</div></section></div>
		{:else if !data}
			<div class="mt-7 rounded-xl border border-destructive/30 bg-destructive/5 p-5"><p role="alert" class="text-xs text-destructive">{notice || 'Analytics could not be loaded.'}</p><Button variant="outline" size="sm" class="mt-4" disabled={loading} onclick={() => void loadAnalytics()}>{#if loading}<LoaderCircle class="animate-spin" data-icon="inline-start" />{/if}Retry</Button></div>
		{:else}
			{#if notice}<p role="alert" class="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{notice}</p>{/if}
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
				<Chart.Container config={chartConfig} class="mt-5 h-[220px] w-full aspect-auto sm:h-[270px]">
					<BarChart
		data={buckets}
		xScale={scaleBand().padding(0.25)}
		x="label"
						axis="x"
						seriesLayout="group"
						series={[
							{ key: 'received', label: chartConfig.received.label, color: chartConfig.received.color },
							{ key: 'sent', label: chartConfig.sent.label, color: chartConfig.sent.color }
						]}
					>
						{#snippet tooltip()}<Chart.Tooltip indicator="dot" />{/snippet}
					</BarChart>
				</Chart.Container>
				<div class="mt-4 flex gap-4 text-[9px] text-muted-foreground"><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-chart-1"></span>Received</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-chart-2"></span>Sent</span></div>
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
		{/if}
	</div>
</section>

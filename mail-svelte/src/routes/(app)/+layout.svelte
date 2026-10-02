<script lang="ts">
	import AppShell from '$lib/components/mail/AppShell.svelte';

	let { children } = $props();
</script>

<AppShell>{@render children()}</AppShell>

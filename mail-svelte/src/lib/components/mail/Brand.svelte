<script lang="ts">
	import { Mail } from '@lucide/svelte';
</script>

<a href="/inbox" class="inline-flex items-center gap-2.5 rounded-lg" aria-label="Cloud Mail home">
	<span class="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_rgba(23,107,115,0.8)]">
		<Mail size={18} strokeWidth={1.8} />
	</span>
	<span class="text-[17px] font-bold tracking-[-0.055em]">cloud<span class="font-medium text-primary">mail</span></span>
</a>

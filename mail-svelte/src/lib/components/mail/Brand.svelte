<script lang="ts">
	import { Mail } from '@lucide/svelte';
</script>

<a href="/inbox" class="inline-flex items-center gap-2.5" aria-label="Cloud Mail home">
	<span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
		<Mail size={16} strokeWidth={1.8} />
	</span>
	<span class="text-[15px] font-semibold tracking-[-0.045em]">cloud mail</span>
</a>

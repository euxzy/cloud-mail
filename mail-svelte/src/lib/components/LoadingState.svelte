<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { label = 'Loading…', class: className = '' } = $props<{ label?: string; class?: string }>();
</script>

<div class={cn('inline-flex items-center gap-2 text-xs text-muted-foreground', className)} role="status" aria-live="polite" aria-busy="true">
	<span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
	<span>{label}</span>
</div>

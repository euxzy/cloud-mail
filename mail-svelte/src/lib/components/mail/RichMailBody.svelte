<script lang="ts">
	import { sanitizeRichHtml } from '$lib/rich-text.js';

	let { html, class: className = '' }: { html: string; class?: string } = $props();
	let content = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (content) content.innerHTML = sanitizeRichHtml(html);
	});
</script>

<div bind:this={content} class="mail-rich-content {className}"></div>

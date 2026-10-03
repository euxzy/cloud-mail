<script lang="ts">
	import { onMount } from 'svelte';

	type TurnstileInstance = {
		render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'error-callback'?: () => void; 'expired-callback'?: () => void }) => string;
		remove: (id: string) => void;
	};
	declare global { interface Window { turnstile?: TurnstileInstance } }

	let { siteKey, onToken }: { siteKey: string; onToken: (token: string) => void } = $props();
	let container: HTMLDivElement;
	let widgetId = '';

	onMount(() => {
		if (!siteKey) return;
		let disposed = false;
		let pollId: number | undefined;
		const render = () => {
			if (disposed || widgetId || !container || !window.turnstile) return;
			widgetId = window.turnstile.render(container, {
				sitekey: siteKey,
				callback: onToken,
				'error-callback': () => onToken(''),
				'expired-callback': () => onToken('')
			});
		};
		if (window.turnstile) render();
		else {
			const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
			const script = existing ?? document.createElement('script');
			script.addEventListener('load', render, { once: true });
			script.addEventListener('error', () => onToken(''), { once: true });
			if (!existing) {
				script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
				script.async = true;
				script.defer = true;
				script.dataset.turnstileScript = 'true';
				document.head.append(script);
			}
			let attempts = 0;
			pollId = window.setInterval(() => {
				render();
				attempts += 1;
				if (widgetId || attempts >= 100) {
					if (pollId !== undefined) window.clearInterval(pollId);
					pollId = undefined;
				}
			}, 100);
		}
		return () => {
			disposed = true;
			if (pollId !== undefined) window.clearInterval(pollId);
			if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
		};
	});
</script>

<div bind:this={container} class="min-h-0" aria-label="Human verification"></div>

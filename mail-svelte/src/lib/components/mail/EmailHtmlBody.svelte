<script lang="ts">
	import { onDestroy } from 'svelte';
	import { formatImage } from '$lib/mail-settings.svelte.js';

	let { html, class: className = '' }: { html: string; class?: string } = $props();
	let frame = $state<HTMLIFrameElement | null>(null);
	let srcdoc = $state('');
	let frameHeight = $state(220);
	let resizeObserver: ResizeObserver | null = null;

	function isSafeUrlAttribute(name: string, value: string) {
		const normalized = value.trim().replace(/[\u0000-\u0020]+/g, '');
		const protocol = normalized.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
		if (!protocol) return true;
		if (name === 'href' || name === 'xlink:href') return ['http', 'https', 'mailto'].includes(protocol);
		if (protocol === 'data') return /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(normalized);
		return ['http', 'https'].includes(protocol);
	}

	function buildEmailDocument(source: string) {
		if (typeof DOMParser === 'undefined') return '';
		const htmlSource = formatImage(source);
		const document = new DOMParser().parseFromString(htmlSource, 'text/html');
		document.querySelectorAll('script, iframe, frame, object, embed, base, meta[http-equiv]').forEach((element) => element.remove());
		document.querySelectorAll('form').forEach((form) => {
			const fragment = document.createDocumentFragment();
			while (form.firstChild) fragment.appendChild(form.firstChild);
			form.replaceWith(fragment);
		});

		for (const element of Array.from(document.querySelectorAll('*'))) {
			for (const attribute of Array.from(element.attributes)) {
				const name = attribute.name.toLowerCase();
				if (name.startsWith('on') || ['srcdoc', 'formaction', 'action', 'ping', 'srcset'].includes(name)) {
					element.removeAttribute(attribute.name);
					continue;
				}
				if (['href', 'src', 'xlink:href', 'background', 'poster'].includes(name) && !isSafeUrlAttribute(name, attribute.value)) {
					element.removeAttribute(attribute.name);
				}
			}
			if (element.tagName === 'A' && element.hasAttribute('href')) {
				element.setAttribute('target', '_blank');
				element.setAttribute('rel', 'noopener noreferrer');
			}
		}

		const policy = document.createElement('meta');
		policy.httpEquiv = 'Content-Security-Policy';
		policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline' https: http:; img-src https: http: data:; font-src https: http: data:; media-src https: http:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
		document.head.prepend(policy);

		const responsiveStyles = document.createElement('style');
		responsiveStyles.textContent = "html, body { width: 100%; min-height: 0; } body { margin: 0; overflow-wrap: anywhere; font-family: Inter, Arial, sans-serif; font-size: 14px; line-height: 1.5; } img:not(table img) { max-width: 100%; height: auto !important; }";
		document.head.append(responsiveStyles);
		return `<!doctype html>${document.documentElement.outerHTML}`;
	}

	$effect(() => {
		srcdoc = buildEmailDocument(html);
		frameHeight = 220;
	});

	function resizeFrame() {
		const document = frame?.contentDocument;
		if (!document) return;
		const height = Math.max(180, document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
		frameHeight = Math.min(height, 20000);
	}

	function handleFrameLoad() {
		resizeObserver?.disconnect();
		resizeFrame();
		const document = frame?.contentDocument;
		if (!document) return;
		resizeObserver = new ResizeObserver(resizeFrame);
		resizeObserver.observe(document.documentElement);
		if (document.body) resizeObserver.observe(document.body);
	}

	onDestroy(() => resizeObserver?.disconnect());
</script>

<iframe
	bind:this={frame}
	title="Email message content"
	sandbox="allow-same-origin allow-popups"
	referrerpolicy="no-referrer"
	srcdoc={srcdoc}
	onload={handleFrameLoad}
	class="block w-full border-0 {className}"
	style={`height: ${frameHeight}px`}
></iframe>

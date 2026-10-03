const allowedTags: Record<string, string> = {
	B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u',
	S: 's', STRIKE: 's', DEL: 's', CODE: 'code', PRE: 'pre',
	P: 'p', DIV: 'p', BR: 'br', UL: 'ul', OL: 'ol', LI: 'li',
	H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h5', H6: 'h6',
	BLOCKQUOTE: 'blockquote', HR: 'hr', A: 'a'
};

export function normalizeRichLink(value: string): string | null {
	if (!value.trim()) return null;
	try {
		const url = new URL(value, window.location.href);
		return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}

export function sanitizeRichHtml(html: string): string {
	const source = new DOMParser().parseFromString(html, 'text/html');
	const output = document.createElement('div');

	function copy(node: Node): Node | null {
		if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '');
		if (node.nodeType !== Node.ELEMENT_NODE) return null;
		const element = node as Element;
		if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'FORM'].includes(element.tagName)) return null;
		const tag = allowedTags[element.tagName];
		const safe = tag ? document.createElement(tag) : document.createDocumentFragment();
		if (tag === 'a') {
			const href = normalizeRichLink(element.getAttribute('href') ?? '');
			if (href) {
				(safe as HTMLAnchorElement).href = href;
				(safe as HTMLAnchorElement).target = '_blank';
				(safe as HTMLAnchorElement).rel = 'noopener noreferrer';
			}
		}
		for (const child of Array.from(element.childNodes)) {
			const clean = copy(child);
			if (clean) safe.appendChild(clean);
		}
		return safe;
	}

	for (const child of Array.from(source.body.childNodes)) {
		const clean = copy(child);
		if (clean) output.appendChild(clean);
	}
	return output.innerHTML;
}

export function plainTextToHtml(value: string): string {
	if (!value) return '';
	const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `<p>${escaped.replace(/\r?\n/g, '<br>')}</p>`;
}

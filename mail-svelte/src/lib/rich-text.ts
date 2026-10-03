const allowedTags: Record<string, string> = {
	B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u', SPAN: 'span',
	S: 's', STRIKE: 's', DEL: 's', CODE: 'code', PRE: 'pre',
	P: 'p', BR: 'br', UL: 'ul', OL: 'ol', LI: 'li',
	H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h5', H6: 'h6',
	BLOCKQUOTE: 'blockquote', HR: 'hr', A: 'a', IMG: 'img',
	TABLE: 'table', THEAD: 'thead', TBODY: 'tbody', TR: 'tr', TH: 'th', TD: 'td'
};

export const richBlockquoteStyle = 'margin: 0 0 8px; border-left: 3px solid #cbd5e1; padding-left: 12px; color: #64748b;';

export function normalizeRichImage(value: string): string | null {
	if (/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value;
	try {
		const url = new URL(value);
		return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}

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
		const hasBlockChildren = element.tagName === 'DIV' && Array.from(element.children).some((child) =>
			['DIV', 'P', 'UL', 'OL', 'LI', 'PRE', 'BLOCKQUOTE', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(child.tagName)
		);
		const tag = hasBlockChildren ? undefined : element.tagName === 'DIV' ? 'p' : allowedTags[element.tagName];
		const safe = tag ? document.createElement(tag) : document.createDocumentFragment();
		if (tag === 'blockquote') (safe as HTMLElement).setAttribute('style', richBlockquoteStyle);
		if (tag === 'span') {
			const styles: string[] = [];
			const color = (element as HTMLElement).style.color;
			const background = (element as HTMLElement).style.backgroundColor;
			const fontSize = (element as HTMLElement).style.fontSize;
			if (/^(#[0-9a-f]{3,8}|rgb\([\d\s,.%]+\)|rgba\([\d\s,.%]+\))$/i.test(color)) styles.push(`color: ${color}`);
			if (/^(#[0-9a-f]{3,8}|rgb\([\d\s,.%]+\)|rgba\([\d\s,.%]+\))$/i.test(background)) styles.push(`background-color: ${background}`);
			if (/^(8|10|12|14|16|18|24|36)px$/.test(fontSize)) styles.push(`font-size: ${fontSize}`);
			if (styles.length) (safe as HTMLElement).setAttribute('style', styles.join('; '));
		}
		if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag ?? '')) {
			const align = (element as HTMLElement).style.textAlign;
			if (['left', 'center', 'right', 'justify'].includes(align)) (safe as HTMLElement).setAttribute('style', `text-align: ${align}`);
		}
		if (tag === 'a') {
			const href = normalizeRichLink(element.getAttribute('href') ?? '');
			if (href) {
				(safe as HTMLAnchorElement).href = href;
				(safe as HTMLAnchorElement).target = '_blank';
				(safe as HTMLAnchorElement).rel = 'noopener noreferrer';
			}
		}
		if (tag === 'img') {
			const src = normalizeRichImage(element.getAttribute('src') ?? '');
			if (!src) return null;
			(safe as HTMLImageElement).src = src;
			(safe as HTMLImageElement).alt = element.getAttribute('alt') ?? '';
		}
		if (tag === 'td' || tag === 'th') {
			for (const attribute of ['colspan', 'rowspan']) {
				const count = Number(element.getAttribute(attribute));
				if (Number.isInteger(count) && count >= 2 && count <= 20) (safe as HTMLElement).setAttribute(attribute, String(count));
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

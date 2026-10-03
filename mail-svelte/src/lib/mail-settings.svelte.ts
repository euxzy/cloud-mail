export const mailSettings = $state({
	r2Domain: ''
});

function toOssDomain(domain: string) {
	if (!domain) return '';
	if (!/^https?:\/\//i.test(domain)) return `https://${domain}`;
	return domain.replace(/\/+$/, '');
}

export function formatImage(content: string) {
	return (content || '').replace(/\{\{domain\}\}/g, `${toOssDomain(mailSettings.r2Domain)}/`);
}

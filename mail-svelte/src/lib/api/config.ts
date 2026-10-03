import { apiRequest } from '$lib/api/client.js';

export type WebsiteConfig = {
	register?: number;
	title?: string;
	manyEmail?: number;
	addEmail?: number;
	autoRefresh?: number;
	addEmailVerify?: number;
	registerVerify?: number;
	send?: number;
	r2Domain?: string;
	siteKey?: string;
	background?: string;
	loginOpacity?: number;
	domainList?: string[];
	regKey?: number;
	regVerifyOpen?: boolean;
	addVerifyOpen?: boolean;
	noticeTitle?: string;
	noticeContent?: string;
	noticeType?: string;
	noticeDuration?: number;
	noticePosition?: string;
	noticeWidth?: number;
	noticeOffset?: number;
	notice?: number;
	loginDomain?: number;
	linuxdoClientId?: string;
	linuxdoSwitch?: number;
	githubClientId?: string;
	githubSwitch?: number;
	googleClientId?: string;
	googleSwitch?: number;
	minEmailPrefix?: number;
	projectLink?: boolean;
};

export const websiteConfig = () => apiRequest<WebsiteConfig>('/setting/websiteConfig', { authenticated: false });
export const getSystemSettings = () => apiRequest<Record<string, any>>('/setting/query');
export const saveSystemSettings = (value: Record<string, unknown>) => apiRequest('/setting/set', { method: 'PUT', body: value });
export const saveSystemBlacklist = (value: Pick<Record<string, string>, 'blackSubject' | 'blackContent' | 'blackFrom'>) =>
	apiRequest('/setting/setBlacklist', { method: 'PUT', body: value });
export const saveSystemBackground = (background: string) => apiRequest<string>('/setting/setBackground', { method: 'PUT', body: { background } });
export const deleteSystemBackground = () => apiRequest('/setting/deleteBackground', { method: 'DELETE' });

export function assetUrl(key?: string, r2Domain?: string) {
	if (!key) return '';
	if (/^https?:\/\//i.test(key)) return key;
	if (r2Domain) {
		const domain = /^https?:\/\//i.test(r2Domain) ? r2Domain : `https://${r2Domain}`;
		return `${domain.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
	}
	return `${import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''}/oss/${key.split('/').map(encodeURIComponent).join('/')}`;
}

import type { MailMessage } from '$lib/mail-data.svelte.js';
import { loadAttachment, removeAttachment } from '$lib/attachment-store.js';

const draftStorageKey = 'cloud-mail-drafts-v1';

function readRecords(): MailMessage[] {
	try {
		const value = JSON.parse(localStorage.getItem(draftStorageKey) ?? '[]');
		return Array.isArray(value) ? value : [];
	} catch {
		return [];
	}
}

function writeRecords(records: MailMessage[]) {
	localStorage.setItem(draftStorageKey, JSON.stringify(records.map((message) => ({
		...message,
		attachments: (message.attachments ?? []).map(({ file: _file, ...metadata }) => metadata)
	}))));
}

export async function loadDrafts() {
	return Promise.all(readRecords().map(async (message) => ({
		...message,
		attachments: await Promise.all((message.attachments ?? []).map(async (attachment) => ({
			...attachment,
			file: attachment.storageId ? (await loadAttachment(attachment.storageId) ?? undefined) : undefined
		})))
	})));
}

export function saveDraft(message: MailMessage) {
	const records = readRecords();
	const index = records.findIndex((item) => item.id === message.id);
	if (index < 0) records.unshift(message);
	else records[index] = message;
	writeRecords(records);
}

export async function deleteDrafts(ids: string[]) {
	const idSet = new Set(ids);
	const records = readRecords();
	for (const message of records) {
		if (!idSet.has(message.id)) continue;
		for (const attachment of message.attachments ?? []) if (attachment.storageId) await removeAttachment(attachment.storageId);
	}
	writeRecords(records.filter((message) => !idSet.has(message.id)));
}

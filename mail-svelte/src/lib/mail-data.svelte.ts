export type Folder = 'inbox' | 'starred' | 'sent' | 'drafts';
export type MessageFolder = Exclude<Folder, 'starred'>;

export type MailMessage = {
	id: string;
	from: string;
	address: string;
	initials: string;
	folder: MessageFolder;
	subject: string;
	preview: string;
	body: string[];
	htmlBody?: string;
	recipients?: string[];
	attachments?: MailAttachment[];
	status?: 'sent' | 'delivered' | 'bounced' | 'complained' | 'delayed' | 'failed' | 'no-recipient';
	statusMessage?: string;
	timestamp?: string;
	time: string;
	date: string;
	read: boolean;
	starred: boolean;
	archived: boolean;
	deleted?: boolean;
	ownerEmail?: string;
	label?: string;
};

export type MailAttachment = {
	filename: string;
	size: number;
	contentType?: string;
	file?: File;
	storageId?: string;
	key?: string;
};

export const mailMessages = $state<MailMessage[]>([]);

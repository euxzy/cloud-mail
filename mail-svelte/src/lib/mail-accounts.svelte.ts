export type MailAccount = {
	id: number;
	email: string;
	name?: string;
	ownerEmail?: string;
	primary: boolean;
	pinned: boolean;
	allMail: boolean;
};

export const mailAccounts = $state<MailAccount[]>([]);

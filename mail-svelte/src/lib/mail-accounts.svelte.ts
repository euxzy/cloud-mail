export type MailAccount = {
	id: number;
	email: string;
	primary: boolean;
	pinned: boolean;
	allMail: boolean;
};

export const mailAccounts = $state<MailAccount[]>([
	{ id: 1, email: 'sarah@cloudmail.id', primary: true, pinned: true, allMail: false },
	{ id: 2, email: 'support@cloudmail.id', primary: false, pinned: false, allMail: true },
	{ id: 3, email: 'alerts@cloudmail.id', primary: false, pinned: false, allMail: true }
]);

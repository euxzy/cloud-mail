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
	status?: 'queued' | 'delivered' | 'bounced' | 'complained' | 'delayed';
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
};

export const mailMessages = $state<MailMessage[]>([
	{
		id: 'm1',
		from: 'Adrian Wijaya',
		address: 'adrian@northstar.studio',
		initials: 'AW',
		folder: 'inbox',
		subject: 'Visual direction for the launch page',
		preview: 'Hi Sarah, I’ve refined the visual explorations we discussed yesterday. Two directions feel especially strong for the launch page…',
		body: [
			'Hi Sarah,',
			'I’ve refined the visual explorations we discussed yesterday. Two directions feel especially strong for the launch page: one is more editorial, while the other stays closer to the product’s current character.',
			'I added both to the shared document, along with notes on typography and content rhythm. When you have a moment, could you pick the best fit before Thursday’s review?',
			'Thanks,\nAdrian'
		],
		recipients: ['sarah@cloudmail.id'],
		attachments: [
			{ filename: 'Launch-notes.pdf', size: 684_032, contentType: 'application/pdf' },
			{ filename: 'Launch-preview.png', size: 1_284_096, contentType: 'image/png' }
		],
		time: '10:42 AM',
		date: 'Today, 10:42 AM',
		timestamp: '2026-10-02T10:42:00',
		read: false,
		starred: true,
		archived: false,
		label: 'Project'
	},
	{
		id: 'm2',
		from: 'Nisa Putri',
		address: 'nisa@ruangrupa.co',
		initials: 'NP',
		folder: 'inbox',
		subject: 'A few notes after the demo',
		preview: 'Thanks for making time today. A few points from our team, including next steps for trying the staging environment…',
		body: [
			'Hi Sarah,',
			'Thanks for making time for the demo this morning. The sending flow and activity log cover the team’s main needs.',
			'Could you send a summary of the plans and the steps for trying this in staging? I’ll share it with the operations team this afternoon.',
			'Best,\nNisa'
		],
		recipients: ['sarah@cloudmail.id'],
		time: '9:18 AM',
		date: 'Today, 9:18 AM',
		timestamp: '2026-10-02T09:18:00',
		read: false,
		starred: false,
		archived: false,
		label: 'Client'
	},
	{
		id: 'm3',
		from: 'Cloud Mail',
		address: 'updates@cloudmail.dev',
		initials: 'CM',
		folder: 'inbox',
		subject: 'Your weekly activity summary',
		preview: 'In the last seven days, 1,284 messages were sent from your account. There are no issues that need your attention…',
		body: [
			'Hi Sarah,',
			'In the last seven days, 1,284 messages were sent from your account. Delivery has been stable, and there are no issues that need your attention.',
			'You can review activity and message status at any time from the logs page.',
			'All the best,\nThe Cloud Mail team'
		],
		recipients: ['sarah@cloudmail.id'],
		time: '8:56 AM',
		date: 'Today, 8:56 AM',
		timestamp: '2026-10-02T08:56:00',
		read: true,
		starred: false,
		archived: false,
		label: 'Update'
	},
	{
		id: 'm4',
		from: 'Raka Mahendra',
		address: 'raka@studio-sore.com',
		initials: 'RM',
		folder: 'inbox',
		subject: 'Final files are ready for review',
		preview: 'All revisions are in. I’ve included the file link and a short list of changes to make review easier…',
		body: [
			'Hi Sarah,',
			'All revisions are in. I’ve included the file link and a short list of changes below to make review easier.',
			'If nothing else needs to change, our team can prepare the final assets for handoff tomorrow morning.',
			'Thanks,\nRaka'
		],
		recipients: ['sarah@cloudmail.id'],
		time: 'Yesterday',
		date: 'Yesterday, 4:24 PM',
		timestamp: '2026-10-01T16:24:00',
		read: true,
		starred: false,
		archived: false,
		label: 'Project'
	},
	{
		id: 'm5',
		from: 'Maya Sari',
		address: 'maya@kawan.id',
		initials: 'MS',
		folder: 'inbox',
		subject: 'Re: Onboarding session schedule',
		preview: 'Tuesday at 2:00 PM works for us. I’ve invited two people from the technical team…',
		body: [
			'Hi Sarah,',
			'Tuesday at 2:00 PM works for us. I’ve invited two people from the technical team so they can join the onboarding session.',
			'See you next week!',
			'Maya'
		],
		recipients: ['sarah@cloudmail.id'],
		time: 'Mon',
		date: 'Monday, September 28',
		timestamp: '2026-09-28T11:40:00',
		read: true,
		starred: true,
		archived: false
	},
	{
		id: 'm6',
		from: 'Dimas Pratama',
		address: 'dimas@ruang.studio',
		initials: 'DP',
		folder: 'inbox',
		subject: 'Invitation: Design review',
		preview: 'I’ve sent the invite for Friday morning. The agenda includes the inbox flow and mobile priorities…',
		body: [
			'Hi Sarah,',
			'I’ve sent the invite for Friday morning. The agenda includes a review of the inbox flow, mobile priorities, and a few questions for early users.',
			'Let me know if there’s anything else you’d like to add.',
			'Dimas'
		],
		recipients: ['sarah@cloudmail.id'],
		time: 'Sun',
		date: 'Sunday, September 27',
		timestamp: '2026-09-27T10:15:00',
		read: true,
		starred: false,
		archived: false,
		label: 'Team'
	},
	{
		id: 'm7',
		from: 'Sarah Anindya',
		address: 'sarah@cloudmail.id',
		initials: 'SA',
		folder: 'sent',
		subject: 'Materials for tomorrow’s session',
		preview: 'I’ve attached a short briefing and the agenda we’ll use tomorrow…',
		body: ['Hi Nisa,', 'I’ve attached a short briefing and the agenda for tomorrow’s session.', 'See you there!'],
		recipients: ['nisa@ruangrupa.co'],
		status: 'delivered',
		time: '8:12 AM',
		date: 'Today, 8:12 AM',
		timestamp: '2026-10-02T08:12:00',
		read: true,
		starred: false,
		archived: false
	},
	{
		id: 'm8',
		from: 'Sarah Anindya',
		address: 'sarah@cloudmail.id',
		initials: 'SA',
		folder: 'sent',
		subject: 'Re: Schedule confirmation',
		preview: 'That time works for me. Thanks for letting me know…',
		body: ['That time works for me. Thanks for letting me know.'],
		recipients: ['adrian@northstar.studio'],
		status: 'delayed',
		statusMessage: 'This message has been delayed by the recipient mail server. We will keep trying to deliver it.',
		time: 'Fri',
		date: 'Friday, September 25',
		timestamp: '2026-09-25T14:30:00',
		read: true,
		starred: false,
		archived: false
	},
	{
		id: 'm9',
		from: 'Sarah Anindya',
		address: 'sarah@cloudmail.id',
		initials: 'SA',
		folder: 'drafts',
		subject: 'Notes for the product team',
		preview: 'Hi, I’d like to share a few notes before tomorrow’s meeting…',
		body: ['Hi,', 'I’d like to share a few notes before tomorrow’s meeting.'],
		recipients: [],
		time: 'Yesterday',
		date: 'Yesterday, 5:30 PM',
		timestamp: '2026-10-01T17:30:00',
		read: true,
		starred: false,
		archived: false
	}
]);

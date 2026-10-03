export const mailUi = $state({
	query: '',
	composeOpen: false,
	accountsOpen: false,
	composeTo: '',
	composeSubject: '',
	composeBody: '',
	composeDraftId: '',
	currentAccountId: 1,
	refreshKey: 0,
	mailboxPage: 1,
	mailboxPageCursors: [0] as number[],
	mailboxHasMore: false,
	mailboxLoading: false
});

export function showComposer(to = '', subject = '', body = '', draftId = '') {
	mailUi.composeTo = to;
	mailUi.composeSubject = subject;
	mailUi.composeBody = body;
	mailUi.composeDraftId = draftId;
	mailUi.composeOpen = true;
}

export function hideComposer() {
	mailUi.composeOpen = false;
	mailUi.composeTo = '';
	mailUi.composeSubject = '';
	mailUi.composeBody = '';
	mailUi.composeDraftId = '';
}

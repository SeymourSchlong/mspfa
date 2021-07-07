import validate from './index.validate';
import type { APIHandler } from 'modules/server/api';
import { authenticate } from 'modules/server/auth';
import type { ClientMessage } from 'modules/client/messages';
import type { MessageDocument } from 'modules/server/messages';
import messages, { updateUnreadMessages, getClientMessage, getMessageByUnsafeID } from 'modules/server/messages';
import { ObjectId } from 'mongodb';
import { getUserByUnsafeID } from 'modules/server/users';
import { uniqBy } from 'lodash';

const Handler: APIHandler<{
	method: 'POST',
	body: Pick<ClientMessage, 'content'> & (
		{
			to: ClientMessage['to'],
			replyTo?: never,
			subject: ClientMessage['subject']
		} | {
			to?: never,
			replyTo: NonNullable<ClientMessage['replyTo']>,
			subject?: never
		}
	)
}, {
	method: 'POST',
	body: ClientMessage
}> = async (req, res) => {
	await validate(req, res);

	const { user } = await authenticate(req, res);

	if (!user) {
		res.status(403).send({
			message: 'You must be signed in to send messages.'
		});
		return;
	}

	const now = new Date();

	const replyTo = (
		req.body.replyTo === undefined
			? undefined
			: await getMessageByUnsafeID(req.body.replyTo, res)
	);

	const recipientIDs = (
		req.body.to
			// All specified recipients from `req.body.to`.
			? await Promise.all(req.body.to.map(
				async unsafeUserID => (await getUserByUnsafeID(unsafeUserID, res))._id
			))
			: uniqBy([
				// The sender of the message being replied to.
				replyTo!.from,
				// The message's recipients excluding the sender of the reply.
				...replyTo!.to.filter(userID => !userID.equals(user._id))
			], String)
	);

	const message: MessageDocument = {
		_id: new ObjectId(),
		sent: now,
		from: user._id,
		to: recipientIDs,
		...replyTo
			? {
				replyTo: replyTo._id,
				// Prepend "Re: " if it isn't already there, and replace anything overflowing the character limit of 50 with an ellipsis.
				subject: replyTo.subject.replace(/^(Re: )?/, 'Re: ').replace(/^(.{49}).{2,}$/, '$1…')
			}
			: {
				subject: req.body.subject!
			},
		notDeletedBy: uniqBy([user._id, ...recipientIDs], String),
		notReadBy: recipientIDs,
		content: req.body.content
	};

	await messages.insertOne(message);

	await Promise.all(message.notReadBy.map(updateUnreadMessages));

	res.status(201).send(getClientMessage(message, user));
};

export default Handler;
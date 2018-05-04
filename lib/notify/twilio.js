const Twilio = require('twilio');
const defaults = require('../defaults');
const sprintf = require('sprintf-js').sprintf;

module.exports = (payload, data, cb) => {
	const client = new Twilio(payload.accountSid, payload.authToken);
	const body = sprintf((payload.body || defaults.body), data);
	client.messages.create({
		body: body,
		to: payload.to,
		from: payload.from
	}).then((message) => {
		cb(null, message);
	}).catch((error) => {
		cb(error);
	});
};
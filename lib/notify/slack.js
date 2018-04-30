const Slack = require('slack');
const defaults = require('../defaults');
const sprintf = require('sprintf-js').sprintf;

module.exports = (payload, data, cb) => {
	const bot = new Slack({token: payload.token});
	const body = sprintf((payload.body || defaults.body), data);
	bot.chat.postMessage({
		channel: payload.channel,
		text: body
	}, cb);
};
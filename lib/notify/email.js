const nodemailer = require('nodemailer');
const defaults = require('../defaults');
const sprintf = require('sprintf-js').sprintf;

module.exports = (alert, data, cb) => {
	const transporter = nodemailer.createTransport(alert.conf);
	const subject = sprintf((alert.subject || defaults.subject), data);
	const body = sprintf((alert.body || defaults.body), data);
	transporter.sendMail({
		from: alert.from,
		to: alert.to,
		subject: subject,
		text: body,
		html: body
	}, cb);
};
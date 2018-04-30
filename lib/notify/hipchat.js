const Hipchat = require('node-hipchat');
const defaults = require('../defaults');
const sprintf = require('sprintf-js').sprintf;

module.exports = (payload, data, cb) => {
	const hc = new Hipchat(payload.key);
	const body = sprintf((payload.body || defaults.body), data);
	hc.postMessage({
		room: payload.room,
		from: payload.from,
		message: body,
		color: (payload.color ? payload.color : 'yellow')
	}, (err, r) => {
		if(err) {
			return cb(err);
		} else {
			try {
				r = JSON.parse(r);
			} catch(e) {
				return cb(e);
			}
			if(r.error) {
				return cb(r.error);
			} else {
				return cb(null, r);
			}
		}
	});
};
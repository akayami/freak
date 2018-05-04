const async = require('async');

module.exports = function notify(namespace, cb) {

	if (namespace.threshold < namespace.failCount) {
		const t = [];
		for (const i in namespace.alert) {
			t.push((cb) => {
				try {
					const handler = require('./notify/' + namespace.alert[i].type);
					handler(namespace.alert[i].data, namespace, cb);
				} catch(e) {
					return cb(e);
				}
			});
		}
		async.parallel(async.reflectAll(t), cb);
	} else {
		console.info('namespace ' + namespace.name + ' raised alert but is below threshold of ' + namespace.threshold + '. Fail count: ' + namespace.failCount);
	}
};
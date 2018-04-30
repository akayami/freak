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
			//cb();
			// switch (namespace.alert[i].type) {
			// 	case 'email': {
			// 		transporter.sendMail({
			// 			from: config.email.from,
			// 			to: namespace.alert[i].data.email,
			// 			subject: sprintf(subject, namespace),
			// 			text: sprintf(msg, namespace)
			// 		}, function (error, info) {
			// 			if (error) {
			// 				if (error.response) {
			// 					logger.error(error + ' - ' + error.response + '(' + config.email.from + ')');
			// 				} else {
			// 					logger.error(error);
			// 				}
			// 				return;
			// 			}
			// 			logger.info('Notifier Email - Sent to:' + info.accepted + ' for namespace:' + namespace.name);
			// 		});
			// 		break;
			// 	}
			//
			// 	case 'hipchat': {
			// 		const hc = new hipchat(namespace.alert[i].data.key);
			// 		hc.postMessage({
			// 			room: namespace.alert[i].data.room,
			// 			from: namespace.alert[i].data.from,
			// 			message: sprintf(msg, namespace),
			// 			color: (namespace.alert[i].data.color ? namespace.alert[i].data.color : 'yellow')
			// 		}, function (data) {
			// 			if (data && data != null && data.status && data.status == 'sent') {
			// 				logger.info('Hipchat alert sent to:' + this.alert.data.room + ' as ' + this.alert.data.from + ' for namespace:' + this.namespace.name);
			// 			} else {
			// 				logger.warn('Hipchat alert attempt failed');
			// 				if (data != null) {
			// 					logger.warn(data);
			// 				}
			// 			}
			// 		}.bind({namespace: namespace, alert: namespace.alert[i]}));
			// 		logger.info('Hipchat alert sent to:' + namespace.alert[i].data.room + ' as ' + namespace.alert[i].data.from + ' for namespace:' + namespace.name);
			// 		break;
			// 	}
			// 	case 'custom': {
			// 		namespace.alert[i].notify(sprintf(msg, namespace));
			// 		break;
			// 	}
			//
			// 	default: {
			// 		logger.warn('Unsupported alert type' + (namespace.alert[i].type ? namespace.alert[i].type : ' Undefined-type'));
			// 		break;
			// 	}
			// }
		}
		async.parallel(async.reflectAll(t), cb);
	} else {
		console.info('namespace ' + namespace.name + ' raised alert but is below threshold of ' + namespace.threshold + '. Fail count: ' + namespace.failCount);
	}
};
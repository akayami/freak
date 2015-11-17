var winston = require('winston');
var config = {};

config.port = 8081;

config.selfcheck_freq = 10000;

config.winston = {
	transports: [
		new(winston.transports.Console)({
			timestamp: true,
			colorize: true
		})
	]
};


config.defaultAlert = [{
	type: 'custom',
	backend: new(winston.Logger)({
		transports: [
			new(winston.transports.File)({
				filename: '/tmp/crontol-freak.log',
				timestamp: true,
				colorize: true
			})
		]
	}),
	notify: function(msg) {
		this.backend.error(msg);
	}
}];

module.exports = config;

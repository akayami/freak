var winston = require('winston');
var config = {};

config._dep = {
	winston: require('winston')
}

config.port = 8081;

config.selfcheck_freq = 10000;

config.winston = {
	transports: [
		new(config._dep.winston.transports.Console)({
			timestamp: true,
			colorize: true
		})
	]
};


config.defaultAlert = [{
	type: 'custom',
	backend: new(config._dep.winston.Logger)({
		transports: [
			new(config._dep.winston.transports.File)({
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

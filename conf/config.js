var winston = require('winston');
var config = {};

config.port = 8081;

config.selfcheck_freq = 10000;

config.winston = {
	transports: [
		new(winston.transports.Console)({
			'timestamp': true,
			'colorize': true
		})
	]
};

module.exports = config;

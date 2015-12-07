module.exports = function(config) {

	config.defaultAlert = [{
		type: 'custom',
		backend: new(config._dep.winston.Logger)({
			transports: [
				new(config._dep.winston.transports.File)({
					filename: '/tmp/crontol-freak1.log',
					timestamp: true,
					colorize: true
				})
			]
		}),
		notify: function(msg) {
			this.backend.error(msg);
		}
	}];


	return config;
}

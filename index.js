var config = require('plain-config')();
var express = require('express');
var http = require('http');
var winston = require('winston');
var bodyParser = require('body-parser');
var ejsmate = require('ejs-mate');
var logger = new(winston.Logger)(config.winston);
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var hipchat = require('node-hipchat');
var sprintf = require("sprintf-js").sprintf;

var app = express();
var server = require('http').Server(app);

var items = {}

app.set('trust proxy');
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));
app.engine('ejs', ejsmate);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs'); // so you can render('index')


app.post('/report/:item', function(req, res, next) {
	if (items[req.params.item]) {
		logger.info('Got a ping from: ' + req.params.item);
		items[req.params.item].reported = true;
		items[req.params.item].previousFailCount = items[req.params.item].failCount;
		items[req.params.item].failCount = 0;
		items[req.params.item].stamp = new Date().getTime();
		res.sendStatus(200);
	} else {
		if(req.body.frequency && req.body.alert) {
			logger.info('Adding new item: ' + req.params.item);
			items[req.params.item] = {
				name: req.params.item,
				frequency: req.body.frequency,
				threshold: (req.body.threshold ? req.body.threshold : 0),
				alert: req.body.alert,
				previousFailCount: 0,
				failCount: 0,
				reported: false,
				interval: null,
				miliseconds: 0,
				silence: null,
				silenceStart: null,
				stamp: new Date().getTime()
			}
			items[req.params.item].check = function() {
				if (!this.item.reported) {
					if (this.item.failCount != null) {
						logger.warn('Adding');
						this.item.failCount++;
					} else {
						logger.warn('Reseting');
						this.item.failCount = 0;
					}
					notify(this.item, 'Crontol-Freak [%(name)s] - Fail: %(failCount)s', 'Item: %(name)s - Failed Count: %(failCount)s');
					logger.warn('Failed: ' + this.item.name + " - Count: " + this.item.failCount);
				} else {
					logger.info(this.item.name + " UP");
				}
				this.item.reported = false;
			}.bind({
				item: items[req.params.item]
			});
			items[req.params.item].interval = setInterval(items[req.params.item].check, items[req.params.item].frequency);
			res.sendStatus(200);
		} else {
			logger.warn('Bad request received');
			res.sendStatus(400);
		}
	}
});

app.get('/list', function(req, res, next) {
	res.render('list', {
		items: items
	})
});

app.get('/remove/:item', function(req, res, next) {
	logger.log('Removing');
	if (items[req.params.item]) {
		logger.info('Removing item: ' + req.params.item);
		clearInterval(items[req.params.item].interval);
		if (items[req.params.item].silence) {
			clearTimeout(items[req.params.item].silence);
		}
		notify(items[req.params.item], 'Crontol-Freak [%(name)s] - Item Removed from Monitoring', 'Item: %(name)s - Item Removed from Monitoring');
		delete items[req.params.item];
		res.sendStatus(200);
	} else {
		logger.warn('Failed to removing item: ' + req.params.items);
		res.sendStatus(404);
	}
});

app.get('/silence/:item/:miliseconds', function(req, res, next) {
	if (items[req.params.item]) {
		logger.info('Silence of ' + req.params.miliseconds + ' was set on ' + req.params.item)
		items[req.params.item].silenceMiliseconds = req.params.miliseconds
		clearInterval(items[req.params.item].interval);
		items[req.params.item].silenceStart = new Date().getTime();
		if (items[req.params.item].silence) {
			clearTimeout(items[req.params.item].silence);
		}
		items[req.params.item].silence = setTimeout(function() {
			logger.info('Silence is over, reseting interval');
			this.item.interval = setInterval(this.item.check, this.item.frequency);
			this.item.silenceStart = null;
			this.item.silence = null;
			notify(this.item, 'Crontol-Freak [%(name)s] - Monitoring Reactivated', 'Item: %(name)s - Monitoring Reactivated');
		}.bind({
			item: items[req.params.item]
		}), items[req.params.item].silenceMiliseconds);
		notify(items[req.params.item], 'Crontol-Freak [%(name)s] - Silenced for %(silenceMiliseconds)s ms', 'Item: %(name)s - Silenced: %(silenceMiliseconds)s ms');
		res.sendStatus(200);
	} else {
		res.sendStatus(404);
	}
});


app.get('/status/:item', function(req, res, next) {
	if (items[req.params.item]) {
		res.render('status', {
			item: items[req.params.item],
			name: req.params.item
		})
	} else {
		res.sendStatus(404);
	}
});

server.listen(config.port, function() {
	var address = server.address();
	logger.log('Webserver is UP' + address.address + ":" + address.port);
	// addSelfTest();
	// setInterval(function() {
	// 	addSelfTest();
	// }, config.selfcheck_freq - 1000);

});

function notify(item, msg, subject) {
	if (item.threshold < item.failCount) {
		for (var i in item.alert) {
			var alert = item.alert[i];
			switch (alert.type) {
				case 'email':
					transporter.sendMail({
						from: 'do-not-reply-crontol-freak@jomediainc.com',
						to: alert.data.email,
						subject: sprintf(subject, item),
						text: sprintf(msg, item)
							// subject: 'Crontol-Freak [' + item.name + '] - ' + item.failCount,
							// text: 'Item:' + item.name + ' Failed Count:' + item.failCount
					});
					logger.info('Email alert sent to:' + alert.data.email + ' for item:' + item.name);
					break;
				case 'hipchat':
					var hc = new hipchat(alert.data.key);
					hc.postMessage({
						room: alert.data.room,
						from: alert.data.from,
						message: sprintf(msg, item),
						color: (alert.data.color ? alert.data.color : 'yellow')
					}, function(data) {
						if (data && data != null && data.status && data.status == 'sent') {
							logger.info('Hipchat alert sent to:' + alert.data.room + ' as ' + alert.data.from + ' for item:' + item.name);
						} else {
							logger.warn('Hipchat alert attempt failed');
							if(data != null) {
								logger.warn(data);
							}
						}
					});
					logger.info('Hipchat alert sent to:' + alert.data.room + ' as ' + alert.data.from + ' for item:' + item.name);
					break;
				default:
					logger.warn('Unsupported alert type' + alert.type);
					break;
			}
		}
	} else {
		logger.info('Item ' + item.name +' raised alert but is below threshold of '  + item.threshold + '. Fail count: ' + item.failCount);
	}
}

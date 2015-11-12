var config = require('plain-config')();
var express = require('express');
var http = require('http');
var winston = require('winston');
var bodyParser = require('body-parser');
var ejsmate = require('ejs-mate');
var logger = new(winston.Logger)(config.winston);

var app = express();
var server = require('http').Server(app);

var items = {}

app.set('trust proxy');
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));
app.engine('ejs', ejsmate);

app.set('views',__dirname + '/views');
app.set('view engine', 'ejs'); // so you can render('index')


app.post('/report/:item', function(req, res, next) {
	if (items[req.params.item]) {
		logger.info('Got a ping from: ' + req.params.item);
		items[req.params.item].reported = true;
		items[req.params.item].stamp = new Date().getTime();
		res.sendStatus(200);
	} else {
		logger.info('Adding new item: ' + req.params.item);
		items[req.params.item] = {
			frequency: req.body.frequency,
			alert: req.body.alert,
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
				logger.warn('Failed: ' + this.i + " - Count: " + this.item.failCount);
			} else {
				logger.info(this.i + " UP");
			}
			this.item.reported = false;
		}.bind({
			item: items[req.params.item],
			i: req.params.item
		});
		items[req.params.item].interval = setInterval(items[req.params.item].check, items[req.params.item].frequency);
		res.sendStatus(200);
	}
});

app.get('/remove/:item', function(req, res, next) {
	logger.log('Removing');
	if (items[req.params.item]) {
		logger.info('Removing item: ' + req.params.item);
		clearInterval(items[req.params.item].interval);
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
		items[req.params.item].silence = setTimeout(function() {
			logger.info('Silence is over, reseting interval');
			this.item.interval = setInterval(this.item.check, this.item.frequency);
			this.item.silenceStart = null;
			this.item.silence = null;
		}.bind({item : items[req.params.item]}), items[req.params.item].silenceMiliseconds);
		res.sendStatus(200);
	} else {
		res.sendStatus(404);
	}
});


app.get('/status/:item', function(req, res, next) {
	if (items[req.params.item]) {
		res.render('status', {item: items[req.params.item], name: req.params.item})
	} else {
		res.sendStatus(404);
	}
});

server.listen(config.port, function() {
	var address = server.address();
	logger.log('Webserver is UP' + address.address + ":" + address.port);
	addSelfTest();
	setInterval(function() {
		addSelfTest();
	}, config.selfcheck_freq - 1000);

});

function addSelfTest() {
	var body = JSON.stringify({
		frequency: config.selfcheck_freq,
		alert: [{
			type: 'email',
			data: {
				email: 'tomasz.rakowski@jomediainc.com'
			}
		}]
	});

	http.request({
		host: 'localhost',
		port: 8081,
		method: 'POST',
		path: '/report/selftest',
		headers: {
			"Content-Type": "application/json",
			"Content-Length": Buffer.byteLength(body)
		}
	}).end(body);
}

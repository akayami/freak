var config = require('plain-config')();
var express = require('express');
var http = require('http');
var winston = require('winston');
var bodyParser = require('body-parser');
var ejsmate = require('ejs-mate');
var logger = new(winston.Logger)(config.winston);
var fs = require('fs');
var marked = require('marked');

var sprintf = require("sprintf-js").sprintf;
var hipchat = require('node-hipchat');
var nodemailer = require('nodemailer');

var app = express();
var server = require('http').Server(app);

var transporter = nodemailer.createTransport(config.email.smtpconf);

// Namespaces to be reported
var namespaces = {}

app.set('trust proxy');
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));
app.engine('ejs', ejsmate);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs'); // so you can render('index')

app.use(express.static(__dirname + '/web'));

app.post('/report/:namespace', function(req, res, next) {
	if (namespaces[req.params.namespace]) {
		logger.info('Got a ping from: ' + req.params.namespace);
		if (req.body.frequency) {namespaces[req.params.namespace].frequency = req.body.frequency;}
		if (req.body.threshold) {namespaces[req.params.namespace].threshold = req.body.threshold;}
		if (req.body.alert) {namespaces[req.params.namespace].alert = req.body.alert;}
		namespaces[req.params.namespace].reported = true;
		namespaces[req.params.namespace].previousFailCount = namespaces[req.params.namespace].failCount;
		namespaces[req.params.namespace].failCount = 0;
		namespaces[req.params.namespace].stamp = new Date().getTime();
		res.sendStatus(200);
	} else {
		if(req.body.frequency && req.body.alert) {
			logger.info('Adding new namespace: ' + req.params.namespace);
			namespaces[req.params.namespace] = {
				name: req.params.namespace,
				frequency: req.body.frequency,
				threshold: (req.body.threshold ? req.body.threshold : 0),
				alert: req.body.alert,
				previousFailCount: 0,
				failCount: 0,
				reported: true,
				interval: null,
				miliseconds: 0,
				silence: null,
				silenceStart: null,
				stamp: new Date().getTime()
			}

			for(var x in config.defaultAlert) {
				namespaces[req.params.namespace].alert.push(config.defaultAlert[x]);
			}

			namespaces[req.params.namespace].check = function() {
				if (!this.namespace.reported) {
					if (this.namespace.failCount != null) {
						logger.warn('Adding');
						this.namespace.failCount++;
					} else {
						logger.warn('Reseting');
						this.namespace.failCount = 0;
					}
					notify(this.namespace, 'Crontol-Freak [%(name)s] - Fail: %(failCount)s\n\nhttp://' + req.hostname + ':' + config.port + '/status/%(name)s', 'namespace: %(name)s - Failed');
					logger.warn('Failed: ' + this.namespace.name + " - Count: " + this.namespace.failCount);
				} else {
					logger.info(this.namespace.name + " UP");
				}
				this.namespace.reported = false;
			}.bind({
				namespace: namespaces[req.params.namespace]
			});
			namespaces[req.params.namespace].interval = setInterval(namespaces[req.params.namespace].check, namespaces[req.params.namespace].frequency);
			res.sendStatus(200);
		} else {
			logger.warn('Bad request received');
			res.sendStatus(400);
		}
	}
});

app.get('/list', function(req, res, next) {
	res.render('list', {
		namespaces: namespaces
	})
});

app.get('/doc', function(req, res) {
	var path = __dirname + '/README.md';
	var file = fs.readFileSync(path, 'utf8');
	// res.send(marked(file));
	res.render('doc', {
		doc: marked(file)
	})
});

app.get('/remove/:namespace', function(req, res, next) {
	logger.log('Removing');
	if (namespaces[req.params.namespace]) {
		logger.info('Removing namespace: ' + req.params.namespace);
		clearInterval(namespaces[req.params.namespace].interval);
		if (namespaces[req.params.namespace].silence) {
			clearTimeout(namespaces[req.params.namespace].silence);
		}
		notify(namespaces[req.params.namespace], 'Crontol-Freak [%(name)s] - namespace Removed from Monitoring', 'namespace: %(name)s - namespace Removed from Monitoring');
		delete namespaces[req.params.namespace];
		res.sendStatus(200);
	} else {
		logger.warn('Failed to removing namespace: ' + req.params.namespaces);
		res.sendStatus(404);
	}
});

app.get('/silence/:namespace/:miliseconds', function(req, res, next) {
	if (namespaces[req.params.namespace]) {
		logger.info('Silence of ' + req.params.miliseconds + ' was set on ' + req.params.namespace)
		namespaces[req.params.namespace].silenceMiliseconds = req.params.miliseconds
		clearInterval(namespaces[req.params.namespace].interval);
		namespaces[req.params.namespace].silenceStart = new Date().getTime();
		if (namespaces[req.params.namespace].silence) {
			clearTimeout(namespaces[req.params.namespace].silence);
		}
		namespaces[req.params.namespace].silence = setTimeout(function() {
			logger.info('Silence is over, reseting interval');
			this.namespace.interval = setInterval(this.namespace.check, this.namespace.frequency);
			this.namespace.silenceStart = null;
			this.namespace.silence = null;
			notify(this.namespace, 'Crontol-Freak [%(name)s] - Monitoring Reactivated', 'namespace: %(name)s - Monitoring Reactivated');
		}.bind({
			namespace: namespaces[req.params.namespace]
		}), namespaces[req.params.namespace].silenceMiliseconds);
		notify(namespaces[req.params.namespace], 'Crontol-Freak [%(name)s] - Silenced for %(silenceMiliseconds)s ms', 'namespace: %(name)s - Silenced: %(silenceMiliseconds)s ms');
		res.sendStatus(200);
	} else {
		res.sendStatus(404);
	}
});


app.get('/status/:namespace', function(req, res, next) {
	if (namespaces[req.params.namespace]) {
		res.render('status', {
			namespace: namespaces[req.params.namespace],
			name: req.params.namespace
		})
	} else {
		res.sendStatus(404);
	}
});

server.listen(config.port, function() {
	var address = server.address();
	logger.log('Webserver is UP' + address.address + ":" + address.port);
	console.info('Listening at http://%s:%s', address.address, address.port);
});

function notify(namespace, msg, subject) {
	if (namespace.threshold < namespace.failCount) {
		for (var i in namespace.alert) {
			switch (namespace.alert[i].type) {
				case 'email':
				transporter.sendMail({
					from: config.email.from,
					to: namespace.alert[i].data.email,
					subject: sprintf(subject, namespace),
					text: sprintf(msg, namespace)
				}, function(error, info) {
					if (error) {
						if (error.response) {
							logger.error(error + ' - ' + error.response + '(' + config.email.from + ')');
						} else {
							logger.error(error);
						}
						return;
					}
					logger.info('Notifier Email - Sent to:' + info.accepted + ' for namespace:' + namespace.name);
				});
				break;

				case 'hipchat':
				var hc = new hipchat(namespace.alert[i].data.key);
				hc.postMessage({
					room: namespace.alert[i].data.room,
					from: namespace.alert[i].data.from,
					message: sprintf(msg, namespace),
					color: (namespace.alert[i].data.color ? namespace.alert[i].data.color : 'yellow')
				}, function(data) {
					if (data && data != null && data.status && data.status == 'sent') {
						logger.info('Hipchat alert sent to:' + this.alert.data.room + ' as ' + this.alert.data.from + ' for namespace:' + this.namespace.name);
					} else {
						logger.warn('Hipchat alert attempt failed');
						if(data != null) {
							logger.warn(data);
						}
					}
				}.bind({namespace: namespace, alert: namespace.alert[i]}));
				logger.info('Hipchat alert sent to:' + namespace.alert[i].data.room + ' as ' + namespace.alert[i].data.from + ' for namespace:' + namespace.name);
				break;

				case 'custom':
				namespace.alert[i].notify(sprintf(msg, namespace));
				break;

				default:
				logger.warn('Unsupported alert type' + (namespace.alert[i].type ? namespace.alert[i].type : ' Undefined-type'));
				break;
			}
		}
	} else {
		logger.info('namespace ' + namespace.name +' raised alert but is below threshold of '  + namespace.threshold + '. Fail count: ' + namespace.failCount);
	}
}





var args = [];
var tmp = process.argv.slice(2);
for(var i = 0; i < tmp.length; i++) {
	args[tmp[i]] = true;
}

/////////// Dev mode, prefill some data
// node index.js --dev
if (args['--dev']) {
	setInterval(function() {
		var freq = (Math.floor((Math.random() * 10) + 1) * 1000000) + 10000000;
		var body = JSON.stringify({frequency: freq, threshold: Math.floor(Math.random() * 10), alert: []});
		// freq = 5000;
		// var body = JSON.stringify({frequency: freq, threshold: Math.floor(Math.random() * 10), alert: [{'type': 'email', 'data': {'email': 'patrick.salomon@jomediainc.com'}}]});
		var body = JSON.stringify({frequency: freq, threshold: Math.floor(Math.random() * 10), alert: [{'type': 'email', 'data': {'email': 'patrick.salomon@jomediainc.com'}}, {'type': 'hipchat'}, {'type': 'toto'}]});
		http.request({
			host: 'localhost', port: config.port, method: 'POST',
			path: '/report/test-' + Math.floor(Math.random() * 10),
			headers: {"Content-Type": "application/json","Content-Length": Buffer.byteLength(body)}
		}).end(body);
	}, 2000);
}

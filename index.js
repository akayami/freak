const config = require('plain-config')();
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
//const ejs = require('ejs');
//const ejsmate = require('ejs-mate');
//const console = new (winston.Logger)(config.winston);
const fs = require('fs');
const marked = require('marked');

const app = express();
const server = require('http').Server(app);

// Namespaces to be reported
const namespaces = {};

const notify = require('./lib/notify');

app.set('trust proxy');
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));


app.use((req, res, next) => {
	if (!config.devSkipHttps) {
		if (req.headers && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto']) {
			const l = req.headers['x-forwarded-proto'].split(',');
			if (l[0] === 'http') {
				res.redirect(301, 'https://' + req.headers.host + req.url);
				return;
			}
		}
	} else {
		console.log('Skipping https redirect due to config settings');
	}
	next();
});

app.use((req, res, next) => {
	if (req.url === '/') {
		return res.redirect('/ui/list');
	}
	next();
});


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs'); // so you can render('index')

app.use(express.static(__dirname + '/web'));

app.post('/report/:namespace', function (req, res) {
	if (namespaces[req.params.namespace]) {
		res.sendStatus(200);
		console.info('Got a ping from: ' + req.params.namespace);
		let resetInterval = false;
		if (req.body.frequency) {
			resetInterval = true;
			namespaces[req.params.namespace].frequency = req.body.frequency;
		}
		if (req.body.threshold) {
			namespaces[req.params.namespace].threshold = req.body.threshold;
		}
		if (req.body.alert) {
			namespaces[req.params.namespace].alert = req.body.alert;
		}
		namespaces[req.params.namespace].reported = true;
		namespaces[req.params.namespace].previousFailCount = namespaces[req.params.namespace].failCount;
		namespaces[req.params.namespace].failCount = 0;
		namespaces[req.params.namespace].stamp = new Date().getTime();

		if(resetInterval) {
			// Reset interval if frequency or threshold changed
			clearInterval(namespaces[req.params.namespace].interval);
			namespaces[req.params.namespace].interval = setInterval(namespaces[req.params.namespace].check, namespaces[req.params.namespace].frequency);
		}
	} else {
		if (req.body.frequency && req.body.alert) {
			res.sendStatus(200);
			console.info('Adding new namespace: ' + req.params.namespace);
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
				stamp: new Date().getTime(),
				statusURL: 'https://' + req.headers['host'] + '/ui/status/' + req.params.namespace
			};


			// console.log(req.url);
			// console.log(req.headers);

			// for (const x in config.defaultAlert) {
			// 	namespaces[req.params.namespace].alert.push(config.defaultAlert[x]);
			// }

			namespaces[req.params.namespace].check = function () {
				if (!this.namespace.reported) {
					if (this.namespace.failCount != null) {
						console.warn('Adding');
						this.namespace.failCount++;
					} else {
						console.warn('Reseting');
						this.namespace.failCount = 0;
					}
					notify(this.namespace);
					console.warn('Failed: ' + this.namespace.name + ' - Count: ' + this.namespace.failCount);
				} else {
					console.info(this.namespace.name + ' UP');
				}
				this.namespace.reported = false;
			}.bind({
				namespace: namespaces[req.params.namespace]
			});
			namespaces[req.params.namespace].interval = setInterval(namespaces[req.params.namespace].check, namespaces[req.params.namespace].frequency);
		} else {
			console.warn('Bad request received');
			res.sendStatus(400);
		}
	}
});

app.get('/ui/list', function (req, res) {
	res.render('list', {
		namespaces: namespaces
	});
});

app.get('/ui/doc', function (req, res) {
	const path = __dirname + '/README.md';
	const file = fs.readFileSync(path, 'utf8');
	// res.send(marked(file));
	res.render('doc', {
		doc: marked(file)
	});
});

app.get('/ui/remove/:namespace', function (req, res) {
	console.log('Removing');
	if (namespaces[req.params.namespace]) {
		console.info('Removing namespace: ' + req.params.namespace);
		clearInterval(namespaces[req.params.namespace].interval);
		if (namespaces[req.params.namespace].silence) {
			clearTimeout(namespaces[req.params.namespace].silence);
		}
		notify(namespaces[req.params.namespace], 'Crontol-Freak [%(name)s] - namespace Removed from Monitoring', 'namespace: %(name)s - namespace Removed from Monitoring');
		delete namespaces[req.params.namespace];
		res.sendStatus(200);
	} else {
		console.warn('Failed to removing namespace: ' + req.params.namespaces);
		res.sendStatus(404);
	}
});

app.get('/ui/silence/:namespace/:miliseconds', function (req, res) {
	if (namespaces[req.params.namespace]) {
		console.info('Silence of ' + req.params.miliseconds + ' was set on ' + req.params.namespace);
		namespaces[req.params.namespace].silenceMiliseconds = req.params.miliseconds;
		clearInterval(namespaces[req.params.namespace].interval);
		namespaces[req.params.namespace].silenceStart = new Date().getTime();
		if (namespaces[req.params.namespace].silence) {
			clearTimeout(namespaces[req.params.namespace].silence);
		}
		namespaces[req.params.namespace].silence = setTimeout(function () {
			console.info('Silence is over, reseting interval');
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


app.get('/ui/status/:namespace', function (req, res) {
	if (namespaces[req.params.namespace]) {
		res.render('status', {
			namespace: namespaces[req.params.namespace],
			name: req.params.namespace
		});
	} else {
		res.sendStatus(404);
	}
});


console.log(config);

server.listen(config.port, function () {
	const address = server.address();
	//console.info('Webserver is UP' + address.address + ':' + address.port);
	console.info('Listening on http://%s:%s', address.address, address.port);
});


const args = [];
const tmp = process.argv.slice(2);
for (let i = 0; i < tmp.length; i++) {
	args[tmp[i]] = true;
}

/////////// Dev mode, prefill some data
// node index.js --dev
if (args['--dev']) {
	setInterval(function () {
		const freq = (Math.floor((Math.random() * 10) + 1) * 1000000) + 10000000;
		//var body = JSON.stringify({frequency: freq, threshold: Math.floor(Math.random() * 10), alert: []});
		// freq = 5000;
		// var body = JSON.stringify({frequency: freq, threshold: Math.floor(Math.random() * 10), alert: [{'type': 'email', 'data': {'email': 'patrick.salomon@jomediainc.com'}}]});
		const body = JSON.stringify({
			frequency: freq,
			threshold: Math.floor(Math.random() * 10),
			alert: [{
				'type': 'email',
				'data': {'email': 'dude@localhost'}
			}, {'type': 'hipchat'}, {'type': 'toto'}]
		});
		http.request({
			host: 'localhost', port: config.port, method: 'POST',
			path: '/report/test-' + Math.floor(Math.random() * 10),
			headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)}
		}).end(body);
	}, 2000);
}

const should = require('chai').should();
const expect = require('chai').expect;
const nodemailer = require('nodemailer');
let account;

describe('Test notifier EMAIL', () => {

	it('Needs to load a valid notifier', (done) => {
		require('../lib/notify')({
			name: 'test-test',
			statusURL: 'http://localhost',
			frequency: 1000,
			threshold: 5,
			failCount: 10,
			alert: [
				{
					type: 'email',
					data: {
						conf: {
							host: account.smtp.host,
							port: account.smtp.port,
							secure: account.smtp.secure,
							auth: {
								user: account.user,
								pass: account.pass
							}
						},
						from: 'from@localhost',
						to: 'to@localhost'
					}
				}
			]
		}, (err, result) => {
			should.not.exist(err);
			expect(result).to.be.an('Array').of.length(1);
			expect(result[0]).to.be.an('Object').to.have.property('value');
			expect(result[0].value).to.be.an('Object').to.have.property('messageId');
			done();
		});
	}).timeout(10000);


	before(function (done) {
		this.timeout(10000);
		nodemailer.createTestAccount((err, a) => {
			if(err) {
				return done(err);
			} else {
				account = a;
				done();
			}
		});
	});
});
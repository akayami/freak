const should = require('chai').should();
const expect = require('chai').expect;

describe('Test notifier SLACK', () => {

	it('Needs to load a valid notifier', (done) => {
		require('../lib/notify')({
			name: 'test-test',
			statusURL: 'http://localhost',
			frequency: 1000,
			threshold: 5,
			failCount: 10,
			alert: [
				{
					type: 'twilio',
					data: {
						accountSid: 'yourtoken',
						authToken: 'test',
						from: 'from-number-assigned-by-twilio',
						to: 'number-to-text',
						body: 'Override default message %(name)s %(silenceMiliseconds)s'
					}
				}
			]
		}, (err, result) => {
			should.not.exist(err);
			expect(result).to.be.an('Array');
			expect(result[0]).to.be.an('Object').to.have.property('error');
			done();
		});
	}).timeout(10000);
});
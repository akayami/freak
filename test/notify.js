const should = require('chai').should();
const expect = require('chai').expect;

describe('Test notifier loader', () => {

	it('Needs to load a valid notifier', (done) => {
		require('../lib/notify')({
			frequency: 1000,
			threshold: 5,
			failCount: 10,
			alert: [
				{type: 'fake'}
			]
		}, (err, result) => {
			should.not.exist(err);
			expect(result).to.be.an('Array');
			expect(result[0]).to.be.an('Object').to.have.property('value');
			done();
		});
	});

	it('Needs to fail to load invalid notifier', (done) => {
		require('../lib/notify')({
			frequency: 1000,
			threshold: 5,
			failCount: 10,
			alert: [
				{type: 'invalid'}
			]
		}, (err, result) => {
			should.not.exist(err);
			expect(result).to.be.an('Array');
			expect(result[0]).to.be.an('Object').to.have.property('error');
			done();
		});
	});

});
"use strict";

var _ = require('lodash');
var Schema = require('../index');
var async = require('async');

exports['Simple Usage'] = {
	'build - equal builds made by different approaches' : function (test) {
		var sh1 = new Schema().object(function (required, optional) {
			this.field('first_name');
			required('last_name');
			optional('middle_name');
		});
		var sh2 = new Schema().object(function () {
			this.required('first_name');
			this.field('last_name');
			this.optional('middle_name');
		});
		var sh3 = new Schema().object(function () {
			this.field('first_name');
			this.field('last_name');
			this.field('middle_name').optional();
		});
		var sh4 = new Schema();
		sh4.required('first_name');
		sh4.field('last_name');
		sh4.optional('middle_name');
		test.deepEqual(sh1, sh2);
		test.deepEqual(sh1, sh3);
		test.deepEqual(sh1, sh4);
		test.done();
	},
	'verify - no specified fields' : function (test) {
		var sh1 = new Schema().object(function () {
			this.field('first_name');
			this.required('last_name');
			this.optional('middle_name');
		});
		var value = {};
		sh1.verify(value, function (err, isValid, vError) {
			test.ok(!isValid);
			test.equal(vError.ruleName, 'required');
			test.strictEqual(vError.ruleParams, true);
			test.strictEqual(vError.value, undefined);
			//test.deepEqual(vError.path, ['first_name']);
			test.done(err);
		});
	},
	'verify - optional field isn\'t specified' : function (test) {
		var sh1 = new Schema().object(function () {
			this.field('first_name');
			this.required('last_name');
			this.optional('middle_name');
		});
		var value = {first_name : 'hello', last_name : 'world'};
		sh1.verify(value, function (err, isValid, vError) {
			test.ok(isValid);
			test.strictEqual(vError, null);
			test.done(err);
		});
	},
	'verify - correct if all available fields not empty' : function (test) {
		var sh1 = new Schema().object(function () {
			this.field('first_name');
			this.required('last_name');
			this.optional('middle_name');
		});
		var value = {first_name : 'hello', last_name : 'world', middle_name : 'param-pam-pam'};
		sh1.verify(value, function (err, isValid, vError) {
			test.ok(isValid);
			test.strictEqual(vError, null);
			test.done(err);
		});
	},
	'verify - excess field' : function (test) {
		var sh1 = new Schema().object(function () {
			this.field('first_name');
			this.required('last_name');
			this.optional('middle_name');
		});
		var value = {
			first_name  : 'hello',
			last_name   : 'world',
			middle_name : 'param-pam-pam'
		};
		var _keys = _.keys(value);
		value.excess_field = true;
		sh1.verify(value, function (err, isValid, vError) {
			test.ok(!isValid);
			test.equal(vError.ruleName, 'available_fields');
			test.deepEqual(vError.ruleParams, _keys);
			test.deepEqual(vError.value, value);
			test.deepEqual(vError.path, []);
			test.done(err);
		});
	}
};

exports['Create Schema, Register'] = {
	'equal registering': function (test) {
		var sh1 = new Schema();
		var sh2 = Schema(); // jshint ignore: line
		var sh3 = new Schema('nameForRegister1');
		var sh4 = Schema('nameForRegister2'); // jshint ignore: line
		Schema.register('someSchema1', sh1);
		Schema.register('someSchema2', sh2);

		test.strictEqual(Schema.get('someSchema1'), sh1);
		test.strictEqual(Schema.get('someSchema2'), sh2);
		test.strictEqual(Schema.get('nameForRegister1'), sh3);
		test.strictEqual(Schema.get('nameForRegister2'), sh4);

		test.done();
	}
};

exports['Object Schema Building: attachTo'] = {
	'typical': function (test) {
		var sh1_1 = new Schema().object(function () {
			this.field('hello');
			this.field('world');
		});

		var sh1_2 = new Schema('attachExampleSchema').object(function () {
			this.field('hello');
			this.field('world');
		});

		var sh2 = new Schema().array(function () {
			this.field('some');
		});


		// ATTACH
		sh2.clone().attachTo(sh1_1, 'myField');
		sh2.clone().attachTo('attachExampleSchema', 'myField');


		// EQUAL
		var sh3 = new Schema('Hello').object(function () {
			this.field('hello');
			this.field('world');
			this.field('myField').array(function () {
				this.field('some');
			});
		});

		test.deepEqual(sh1_1, sh3);
		test.deepEqual(sh1_2, sh3);

		test.done();
	}
};

exports['Object Schema Building: validate'] = {
	'custom validator': function (test) {
		var sh1 = new Schema();
		sh1.optional();
		sh1.validate(function (value, done) {
			if (_.isString(value)) {
				done();
				return;
			}
			done(new Schema.ValidationError('type', 'string'));
		});

		// example with custom validation mapper (validator)
		var validate = [1, 2, 3];
		var sh2 = sh1.clone().validate([validate]);

		var myValidator = function (validationArray) {
			return function (value, done) {
				async.reduce(validationArray, null, function (_1, validation, done) {
					if (_.isFunction(validation)) {
						validation(value, done);
						return;
					}

					if (_.isArray(validation)) {
						if (_.contains(validation, value)) {
							console.log(validation, value);
							done();
							return;
						}

						done(Schema.ValidationError('contains', validation));
					}
					done(new Error('invalid type of validation rule'));
				}, done);
			};
		};

		var value = "123";
		sh1.verify(value, { validator: myValidator }, function (err1, isValid, validationError) {
			test.ok(isValid);
			test.equal(err1, null);
			test.equal(validationError, null);

			sh2.verify(value, { validator: myValidator }, function (err2, isValid, validationError) {
				test.ok(!isValid);
				test.equal(err2, null);
				test.strictEqual(validationError.ruleName, 'contains');
				test.deepEqual(validationError.ruleParams, validate);
				test.deepEqual(validationError.value, value);
				test.done(err1||err2);
			});
		});
	}
};

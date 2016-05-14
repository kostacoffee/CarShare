// Setting up dependencies
var router = require('koa-router')();
var bcrypt = require('bcrypt');
require('./database.js');
// End setting up

/*
	How to use database functions.
	You will find many different functions inside database.js
	These functions DO NOT RETURN DATA. They return Promises.

	To use a promise, follow this pattern:
	<database.js function>()
		.then( function(<expected data>){
			do what you need to do with the expected data.
		})
		.catch( function(error){
			do what you need to do if the database gives an error.
		});

	In some cases, like an INSERT query, you do not expect data back,
	so leave the <expected data> field blank.

*/

router.get('/', function* () {
	this.status = 200;
	yield this.render('index');
});

module.exports = router;

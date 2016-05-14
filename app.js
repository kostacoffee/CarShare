var koa = require('koa');
var body = require('koa-body');
var views = require('koa-views');
var serve = require('koa-static');
var logger = require('koa-logger');
var pgp = require('pg-promise')();

var app = koa();

// database

global.db = pgp({
	host : 'localhost',
	port : 5432,
	database : 'assignment3',
	user : 'webuser',
	password : 'MnU79g&@s9nacLcB'
});

// view engine

app.use(views('views', { extension: 'jade' }));

// koa middleware

app.use(logger());
app.use(body());

// mount routes

var routes = require('./routes');
app.use(routes.middleware());
app.use(routes.allowedMethods());

// serve assets

app.use(serve('assets'));

//serve requests

var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
	console.log('Koa listening on port', port);
});

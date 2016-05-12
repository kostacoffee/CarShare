var koa = require('koa');
var body = require('koa-body');
var views = require('koa-views');
var serve = require('koa-static');
var logger = require('koa-logger');
var router = require('koa-router')();

var app = koa();

// database

var pgp = require('pg-promise')();
global.db = pgp({
	host: 'localhost',
	port: 5432,
	user: 'kostacoffee',
	database: 'assignment3'

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

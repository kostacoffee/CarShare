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
	var data = yield <database.js function>(<any parameters needed>)
		.then( function(data){
			return data;
		})
		.catch( function(error){
			<do what you need to do if the database gives an error.>
		});

	In some cases, like an INSERT query, you do not expect data back,
	so leave so you do not need to 'return data'. A good example can be seen on the POST /login route.

	Routes requiring a logged in member
	In order to enforce a user to log in before seeing a particular part of the website, you can use the
	login_required function. This function takes *another function* as its parameter, which determines what
	happens when a successfully logged in user visits the web page. 
	See the GET /home route for an example.

*/

function failed_auth(){
	this.status = 403;
	this.redirect('/');
}

function login_required(routeFunction){
	function* inner(){
		var loggedIn = this.cookies.get("loggedIn");
		if (loggedIn)
			yield routeFunction;
		else
			yield failed_auth;
		
	}
	return inner;
}

router.get('/', function* (){
	this.status = 200;
	yield this.render('index');
});

router.get('/home', login_required(function* (){
	var member = this.cookies.get("loggedIn");
	yield this.render('home', {nickname : member})
}));

router.post('/login', function* () {
	var nickname = this.request.body.nickname;
	var password = this.request.body.password;

	var member = yield getMember(nickname)
	.then( function(data){
		return data;
	})
	.catch(function(error){
		return null;
	});

	if (member == null){
		console.log('member cant be found');
		return;
	}

	var hashedPassword = password;//bcrypt.hashSync(password, 10);
	console.log(hashedPassword);

	if (member.password == hashedPassword){
		this.cookies.set("loggedIn", nickname);
		this.redirect('/home');
	}
	else
		this.redirect('/');
});
	

router.get('/logout', function* () {
	this.cookies.set("loggedIn", "bye", {expires : new Date()});
	this.redirect('/');
})

module.exports = router;

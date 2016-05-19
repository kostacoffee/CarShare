// Setting up dependencies
var router = require('koa-router')();
var crypto = require('crypto');
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

function getHash(password, salt){
	var hash = crypto.createHmac('sha512', salt);
	hash.update(password);	
	return hash.digest('base64');	
}

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
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	if (member != null)
		this.redirect('/home');
	yield this.render('index');
});

router.get('/home', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	yield this.render('home', {member : member})
}));

router.post('/login', function* () {
	var nickname = this.request.body.nickname.trim();
	var password = this.request.body.password;

	var member = yield getMember(nickname);

	var passwordHash = getHash(password, member.pw_salt);
	if (passwordHash == member.password){
		this.cookies.set("loggedIn", member.nickname);
		this.redirect('/home');
	}
	else
		this.redirect('/');
});

router.get('/booking/:id', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var booking = yield getBooking(member.memberno, this.params.id);
	console.log(booking);
	//TODO
}));

router.get('/carbay/:id', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var carBay = yield getCarBay(this.params.id);
	console.log(carBay);
	//TODO
}));

router.get('/car/:regno', login_required(function*(){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var car = yield getCar(this.params.regno);
	console.log(car);
}))

router.get('/logout', function* () {
	this.cookies.set("loggedIn", "bye", {expires : new Date()});
	this.redirect('/');
})

//Testing route. comment out for production.
router.get('/test', function* (){
	console.log(yield getBooking(1,304450));
})

module.exports = router;

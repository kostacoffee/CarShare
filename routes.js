// Setting up dependencies
var router = require('koa-router')();
var crypto = require('crypto');
require('./database.js');
// End setting up

/*
	How to use database functions.
	You will find many different functions inside database.js
	These functions DO NOT RETURN DATA. They return Promises.

	To get data *out* of a promise, follow this pattern:
	var data = yield <database.js function>(<any parameters needed>)

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
	yield this.render('index');
});

router.post('/login', function* () {
	var nickname = this.request.body.nickname.trim();
	var password = this.request.body.password;

	var member = yield getMember(nickname)

	if (member == null){
		console.log('member cant be found');
		this.redirect('/');
		return;
	}

	var passwordHash = getHash(password, member.pw_salt);
	if (passwordHash == member.password){
		this.cookies.set("loggedIn", member.nickname);
		this.redirect('/home');
	}
	else
		this.redirect('/');
});

router.get('/home', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname)
	if (member == null)
		this.redirect('/');
	yield this.render('home', {member : member})
}));

router.get('/bookingHistory', login_required(function* () {
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname)

	if (member == null){
		console.log('member cant be found');
		this.redirect('/');
		return;
	}

	var history = yield getBookingHistory(member.memberno)
	yield this.render('bookingHistory', {member : member, history : history});
}));

router.get('/booking/:id', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	// use adminGetBooking for testing.
	var booking = yield getBooking(member.memberno, this.params.id);
	booking.length = booking.end.getHours() - booking.start.getHours();
	console.log(member);
	yield this.render('bookingDetails', {booking : booking});
	//TODO
}));

router.get('/newBooking', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	//TODO
}));

router.post('/newBooking', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var car = this.params.car;
	var start = new Date(this.params.startDate);
	var end = new Date(this.params.endDate);
	// TODO Client-side verification for start and end times being on the same date.
	var duration = end.getHours() - start.getHours();
	var availabilities = yield getCarAvailabilities(car, start);
	for (var i = start.getHours(); i < end.getHours(); i++){
		if (availabilities[i] == false){
			this.redirect('/newBooking');
			return;
		}
	}

	var bookingId = yield makeBooking(car, member.memberno, start, end);
	if (bookingId == null){
		this.redirect('/newBooking');
		return;
	}

	var rate;
	if (duration < 12)
		rate = yield getHourlyRate(member.memberno);
	else
		rate = yield getDailyRate(member.memberno);
	var estimate = hours.hour*rate.rate;
	this.redirect('/booking/'+bookingId);
}));

router.get('/carbay', login_required(function*(){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var carbays = yield getAllCarBays();
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

router.get('/logout', login_required(function* () {
	this.cookies.set("loggedIn", "bye", {expires : new Date()});
	this.redirect('/');
}));

//Don't touch
module.exports = router;

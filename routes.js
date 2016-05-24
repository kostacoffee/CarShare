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

function* getCost(memberno, duration){
	var rate;
	if (duration < 12)
		rate = yield getHourlyRate(memberno);
	else
		rate = yield getDailyRate(memberno);
	return rate.rate*duration;
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
	console.log(member);
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

router.get('/newbooking', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var availableCars = yield getAllCars();	
	yield this.render('newBooking', {member : member, cars : availableCars});
}));

router.post('/newbooking', login_required(function* (){
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

	this.redirect('/booking/'+bookingId);
}));

router.get('/carbays', login_required(function*(){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);

	var results = yield searchBays(this.request.body.search_string);

	yield this.render('carbaySearch', {member : member, results : results});
}));

router.get('/carbay/:id', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var carBay = yield getCarBay(this.params.id);
	console.log(carBay);
	yield this.render('carBay', {member : member, carBay : carBay});
}));

router.get('/car/:regno', login_required(function*(){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var car = yield getCar(this.params.regno);
	console.log(car);
	yield this.render('cardetails', {member : member, car : car})
}));

router.get('/invoices', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var invoices = yield getInvoices(member.memberno);
	console.log(invoices);
	yield this.render('invoices', {member : member, invoices : invoices, latestInvoice : invoices[0]});
	//TODO invoice browser
}));

router.get('/invoice/:id', login_required(function*(){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var invoiceData = yield getInvoice(member.memberno, this.params.id);
	console.log(invoiceData);
	var bookingsForInvoice = yield getBookingsForInvoice(member.memberno, invoiceData.invoicedate);
	console.log(bookingsForInvoice);
	yield this.render('invoice', {member : member, invoice : invoiceData, bookings : bookingsForInvoice});
	
}));

router.get('/invoices', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var invoices = yield getAllInvoices(member.memberno);
	console.log(invoices);
	yield this.render('invoiceList', {member : member, invoices : invoices});
}));

router.get('/location/:id', login_required(function*(){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var location = yield getLocation(this.params.id);

	var bays = yield getCarBayAt(this.params.id);

	var parent = yield getLocation(location.is_at);

	var children = yield getChildren(this.params.id);
	if (children != null)
		for (var i = 0; i < children.length; i++){
			var desc = yield getDescendantBays(children[i].locid)
			if (desc.length == 0)
				desc = yield getCarBayAt(children[i].locid);
			children[i].descendants = desc.length;
		}

	yield this.render('locationDetails', {member : member, location : location, bays : bays, parent : parent, children : children});
}));

router.get('/logout', login_required(function* () {
	this.cookies.set("loggedIn", "bye", {expires : new Date()});
	this.redirect('/');
}));

router.get('/test', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname);
	var bookings = yield getBookingsForInvoice(member.memberno, new Date());
	var totalCost = 0;
	for (var i = 0; i < bookings.length; i++){
		totalCost += yield getCost(member.memberno, bookings[i].endtime.getHours() - bookings[i].starttime.getHours());
	}
	yield addInvoice(member.memberno, new Date(), totalCost);
}));

//Don't touch
module.exports = router;

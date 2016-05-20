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
	yield this.render('index');
});

router.get('/home', login_required(function* (){
	var nickname = this.cookies.get("loggedIn");
	var member = yield getMember(nickname)
	.then(function(data){
		return data;
	})
	.catch(function(erorr){
		return null;
	});
	if (member == null)
		this.redirect('/');
	yield this.render('home', {member : member})
}));

router.post('/login', function* () {
	var nickname = this.request.body.nickname.trim();
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
	

router.get('/logout', function* () {
	this.cookies.set("loggedIn", "bye", {expires : new Date()});
	this.redirect('/');
})

/*
	THE FOLLOWING ROUTE METHODS AND THEIR ASSOCIATED JADE FILES ARE JUST TESTING FRAMEWORKS
	AND EXAMPLES OF HOW TO USE THE BOOKING FUNCTIONS

	They will need to be rewritten when actual templates are made for them
	For example, 'makeBooking' should recieve data from a page wherein cars and times are selected
	from a limited set of options rather than just taking in raw user input
*/

	router.get('/bookingQuery', function* (){
		yield this.render('bookingQuery');
	});

	router.post('/viewBooking', function* () {
		var nickname = this.cookies.get("loggedIn");
		var member = yield getMember(nickname)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		var bookingID = this.request.body.bookingID;
		var booking = yield getBooking(member.memberno, bookingID)
		.then( function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		if (booking == null){
			console.log('booking not found or not accessible for this member');
			this.redirect('/');
			return;
		}

		this.cookies.set("bookingID", bookingID);
		this.redirect('/bookingDetails');
	});

	router.get('/bookingDetails', login_required(function* () {
		var nickname = this.cookies.get("loggedIn");
		var member = yield getMember(nickname)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		if (member == null){
			console.log('member cant be found');
			this.redirect('/');
			return;
		}

		var bookingID = this.cookies.get("bookingID");
		var booking = yield getBooking(member.memberno, bookingID)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		if (booking == null){
			console.log('booking cant be found');
			//Change this to wherever bookings are viewed from.
			this.redirect('/bookingQuery');
			return;
		}

		yield this.render('bookingDetails', {booking : booking});
	}));

	router.get('/bookingHistory', login_required(function* () {
		var nickname = this.cookies.get("loggedIn");
		var member = yield getMember(nickname)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		if (member == null){
			console.log('member cant be found');
			this.redirect('/');
			return;
		}

		var history = yield getBookingHistory(member.memberno)
		.then(function(data){
			return data;
		})

		yield this.render('bookingHistory', {member : member, history : history});
	}));

	router.get('/bookingCreation', function* (){
		yield this.render('bookingCreation');
	});

	//This one needs checking
	router.post('/makeBooking', login_required(function* () {
		var nickname = this.cookies.get("loggedIn");
		var member = yield getMember(nickname)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		if (member == null){
			console.log('member cant be found');
			this.redirect('/');
			return;
		}	

		var carname = this.request.body.carname;
		var car = yield getCar(carname)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		if (car== null){
			//Change this to wherever bookings are made from.
			console.log('car cant be found');
			this.redirect('/');
			return;
		}

		//Current assumption is that startTime and endTime will be selected from one of those selection wheels or something that limits
		//them to valid PSQL formats that are all blocks of hours

		var startTime = this.request.body.startTime;
		var endTime = this.request.body.endTime;

		var hours = yield getHourDifference(startTime, endTime)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});

		if (hours == null){
			console.log('Invalid time');
			//Change this to wherever bookings are made from.
			this.redirect('/');
			return;
		}

		if (hours.hour <= 0){
			console.log('Negative time');
			//Change this to wherever bookings are made from.
			this.redirect('/');
			return;
		}

		var clash = yield checkBookingClash(car.regno, startTime, endTime)
		.then(function(){
			return false;
		})
		.catch(function(error){
			return true;
		});

		if (clash == true){
			console.log('There is a booking clash');
			//Change this to wherever bookings are made from.
			this.redirect('/');
			return;
		}

		var rate;
		if (hours.hour < 12){
			rate = yield getHourlyRate(member.memberno);
		}
		else{
			rate = yield getDailyRate(member.memberno);
		}
		var estimate = hours.hour*rate.rate;

		console.log('Cost estimate: ' + estimate);

		//TODO: Display the cost estimate to the user and give them a confirm button
		//Then, perform the actual transaction

		this.redirect('/bookingHistory');
	}));

module.exports = router;

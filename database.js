/*
	Use this file to write the database queries.
	Please stick to the following format:

	global.<functionName> = function(<any input data>){
		var query = "<SQL query>";
		return global.db.many(query);
	}

	For example:
	
	global.getMembers = function() {
	return global.db.many("SELECT email FROM Member")
	};


	For a more indepth look, consider using:
		global.db.one <- expects exactly one row. 
		global.db.none <- expects absolutely nothing.
							If a row is found, the promise
							falls back to 'catch'.

	If you need to edit the data that comes out of the query, follow this:
	
	global.<functionName> = function(<any input data>){
		var query = "<SQL query>";
		return global.db.many(query, <any input data>)
		.then(function (data){
			<do things with data>

			return data;
		});
	}


*/


global.getMember = function(nickname) {
	nickname = nickname.toLowerCase();
	var query = "SELECT * FROM Member where LOWER(nickname)=$1 or LOWER(email)=$1";
	return global.db.one(query, nickname);
}

/*
	Booking functions. makeBooking and incrementBookings should be combined into a single transaction
*/
	global.getCar = function(car) {
		car = car.toLowerCase();
		var query = "SELECT * FROM Car where LOWER(name) LIKE $1";
		return global.db.one(query, car);
	}

	//Given a Booking ID, this will display the car details, bay (currently just the name), booked period (currently, date and hour of start and end times), and time of booking (timestamp) IF AND ONLY IF the querying user (memberNo) made that booking.
	global.getBooking = function(memberNo, bookingID){
		var query = "SELECT c.name AS car, c.regno AS regno, cb.name AS bay, b.startTime AS start, EXTRACT(HOUR FROM b.endTime - b.startTime) AS length, b.whenBooked AS booked FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID WHERE b.madeBy = $1 AND b.bookingID = $2;";
		return global.db.one(query, [memberNo, bookingID]);
	}

	//Given a memberNo, this will display the car details, reserved date (this assumes 'reserved date' is 'date of startTime'), and duration (currently in hours) of every booking made by that member in reverse chronological order.
	global.getBookingHistory = function(memberNo){
		var query = "SELECT b.bookingID as id, c.name AS car, c.regno AS regno, b.startTime::DATE AS date, EXTRACT(HOUR FROM b.endTime - b.startTime) AS length FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno WHERE madeBy = $1 ORDER BY b.startTime DESC;";
		return global.db.many(query, memberNo);
	}
	
	global.checkBookingClash = function(regno, startTime, endTime){
		var query = "SELECT * FROM Booking WHERE Car LIKE $1 AND (startTime, endTime) OVERLAPS (TIMESTAMP $2, TIMESTAMP $3);";
		return global.db.none(query, [regno, startTime, endTime]);
	}

	/*
	global.makeBooking = function(regno, memberNo, startTime, endTime){
		var query = "INSERT INTO Booking (car, madeBy, whenBooked, startTime, endTime) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4);";
		return global.db.none(query, [regno, memberNo, startTime, endTime]);
	}

	global.incrementBookings = function(memberNo){
		var query = "UPDATE Member SET stat_nrOfBookings = stat_nrOfBookings + 1 WHERE memberNo = $1;";
		global.db.query(query, memberNo);
	}
	*/

	//I really hope there is a better way to do this, but I have yet to find one.
	global.getHourDifference = function(startTime, endTime){
		var query = "SELECT EXTRACT(EPOCH FROM (TIMESTAMP $2 - TIMESTAMP $1))/3600 AS hour;";
		return global.db.one(query, [startTime, endTime]);
	}

	global.getHourlyRate = function(memberNo){
		var query = "SELECT hourly_rate AS rate FROM Member INNER JOIN MembershipPlan ON subscribed = title WHERE memberNo = $1;";
		return global.db.one(query, [memberNo]);
	}

	global.getDailyRate = function(memberNo){
		var query = "SELECT daily_rate AS rate FROM Member INNER JOIN MembershipPlan ON subscribed = title WHERE memberNo = $1;";
		return global.db.one(query, [memberNo]);
	}
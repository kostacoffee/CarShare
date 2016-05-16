/*
	Booking functions. Currently untested and may be completely wrong.
*/
	//Given a Booking ID, this will display the car details, bay (currently just the name), booked period (currently, date and hour of start and end times), and time of booking (timestamp) IF AND ONLY IF the querying user (memberNo) made that booking.
	global.getBooking = function(memberNo, bookingID){
		var query = "SELECT c.name, c.regno, cb.name, b.startTime::DATE, EXTRACT(HOUR FROM b.startTime), b.endTime::DATE, EXTRACT(HOUR FROM b.endTime), b.whenBooked FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID WHERE b.madeBy = $1 AND b.bookingID = $2;";
		return global.db.one(query);
	}

	//Given a Booking ID, this will display the car details, bay (currently just the name), booked period (currently, date and hour of start and end times), and time of booking (timestamp). This has no privacy constraints as it is intended for Admin use only, hence it does not require a memberNo.
	//Alternatively, combine this with the non-admin version and have an if-else that removes the memberNo check if the given memberNo parameter is that of the admin.
	global.adminGetBooking = function(bookingID){
		var query = "SELECT c.name, c.regno, cb.name, b.startTime::DATE, EXTRACT(HOUR FROM b.startTime), b.endTime::DATE, EXTRACT(HOUR FROM b.endTime), b.whenBooked FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID WHERE b.bookingID = $1;";
		return global.db.one(query);
	}

	//Given a memberNo, this will display the car details, reserved date (this assumes 'reserved date' is 'date of startTime'), and duration (currently in hours) of every booking made by that member in reverse chronological order.
	global.getBookingHistory = function(memberNo){
		var query = "SELECT c.name, c.regno, b.startTime::DATE, EXTRACT(HOUR FROM b.endTime - b.startTime) FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno WHERE madeBy = $1 ORDER BY b.startTime DESC;";
		return global.db.many(query);
	}

/*
	Use this file to write the database queries.
	Please stick to the following format:

	global.<functionName> = function(<any input data>){
		var query = "<SQL query>";
		return global.db.many(query).then(function(data){
			return data;
		}).catch(function(){
			return null;
		});
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
		}).catch(function(){
			return null;
		});
	}


*/


global.getMember = function(nickname) {
	nickname = nickname.toLowerCase();
	var query = "SELECT * FROM Member where LOWER(nickname)=$1 or LOWER(email)=$1";
	return global.db.one(query, nickname)
	.then(function(data){
		return data;
	}).catch(function(){
		return null;
	});
}

global.getBooking = function(memberNo, bookingID){
	var query = "SELECT c.name, c.regno, cb.name, b.startTime::DATE, EXTRACT(HOUR FROM b.startTime), b.endTime::DATE, EXTRACT(HOUR FROM b.endTime), b.whenBooked FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID WHERE b.madeBy = $1 AND b.bookingID = $2;";
	return global.db.one(query, [memberNo, bookingID])
	.then(function(data){
		return data;
	})
	.catch(function(){
		return null;
	});
}

global.adminGetBooking = function(bookingID){
	var query = "SELECT c.name, c.regno, cb.name, b.startTime::DATE, EXTRACT(HOUR FROM b.startTime), b.endTime::DATE, EXTRACT(HOUR FROM b.endTime), b.whenBooked FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID WHERE b.bookingID = $1;";
	return global.db.one(query, bookingID)
	.then(function(data){
		return data;
	})
	.catch(function(){
		return null;
	});
}

global.getBookingHistory = function(memberNo){
	var query = "SELECT c.name, c.regno, b.startTime::DATE, EXTRACT(HOUR FROM b.endTime - b.startTime) FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno WHERE madeBy = $1 ORDER BY b.startTime DESC;";
	return global.db.many(query, memberNo)
	.then(function(data){
		return data;
	})
	.catch(function(){
		return null;
	});
}

global.getCarBay = function(id){
	// Slightly more complex example here
	var bayData;
	return global.db.one("SELECT * from CarBay WHERE bayid=$1", id)
	.then(function(data){
		bayData = data;
		return global.db.many("SELECT * from Car where parkedAt=$1", id);
	})
	.then(function(carData){
		bayData.cars = carData;
		return bayData;
	})
	.catch(function(error){
		console.log(error);
		return null;
	});
}

global.getCar = function(regno){
	regno = regno.toUpperCase();
	//TODO Extract times available for current day
	return global.db.one("SELECT * from Car where regno=$1", regno)
		.then(function(data){
			return data;
		})
		.catch(function(error){
			return null;
		});
}


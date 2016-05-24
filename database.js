/*
	Use this file to write the database queries.
	Please stick to the following format:

	global.<functionName> = function(<any input data>){
		var query = "<SQL query>";
		return global.db.many(query)
	}


	For a more indepth look, consider using:
		global.db.one <- expects exactly one row. 
		global.db.none <- expects absolutely nothing.
							If a row is found, the promise
							falls back to 'catch'.
*/


function getMonth(dateIndex){
	var monthNames = ["January", "February", "March", "April", "May", "June",
					  "July", "August", "September", "October", "November", "December"];
	return monthNames[dateIndex];
}

global.getMember = function(nickname) {
	nickname = nickname.toLowerCase();
	var user;
	var query = "SELECT * FROM Member where LOWER(nickname)=$1 or LOWER(email)=$1";
	return global.db.one(query, nickname)
	.then(function(data){
		user = data;
		return global.db.any("SELECT name from carbay where bayid=$1", user.homebay);
	})
	.then(function(data){
		console.log(data.length);
		console.log(data);
		if (data.length == 0){
			user.homebayName = "No Homebay";
			user.homebay = -1;
		}
		else{
			user.homebayname = data[0].name;
		}
		return user;
	})
}

global.makeBooking = function(car, member, startDate, endDate){
	var id;
	return global.db.one("INSERT INTO booking (car, madeby, starttime, endtime) VALUES($1, $2, $3, $4) returning bookingid", [car, member, startDate, endDate])
	.then(function(data){
		id = data.bookingid;
		return global.db.query("UPDATE member SET stat_nrofbookings = stat_nrofbookings+1 where memberNo=$1", member)
	})
	.then(function(){
		return id;
	})
	.catch(function(error){
		console.log(error);
		return null;
	});
}


global.getBooking = function(memberNo, bookingID){
	var query = "SELECT c.name as car, c.regno as regno, cb.name as bay, cb.bayid as bayid, b.startTime as start, b.bookingid as bookingid, EXTRACT(HOUR FROM b.startTime), b.endTime as end, EXTRACT(HOUR FROM b.endTime), b.whenBooked FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID WHERE b.madeBy = $1 AND b.bookingID = $2";
	return global.db.one(query, [memberNo, bookingID])
}

global.adminGetBooking = function(bookingID){
	var query = "SELECT c.name as car, c.regno as regno, cb.name as bay, b.startTime as start, EXTRACT(HOUR FROM b.startTime), b.endTime as end, EXTRACT(HOUR FROM b.endTime), b.whenBooked FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno INNER JOIN CarBay AS cb ON c.parkedAt = cb.bayID WHERE b.bookingID = $1";
	return global.db.one(query, bookingID)
}

global.getBookingHistory = function(memberNo){
	var query = "SELECT b.bookingID as id, c.name AS car, c.regno AS regno, b.startTime::DATE AS date, EXTRACT(HOUR FROM b.endTime - b.startTime) AS length FROM Booking AS b INNER JOIN Car AS c ON b.car = c.regno WHERE madeBy = $1 ORDER BY b.startTime DESC;";
	return global.db.many(query, memberNo);
}
	
global.getCarAvailabilities = function(regno, date){
	return global.db.any("SELECT extract(hour from starttime) as start, extract(hour from endtime) as end from Booking where car=$1 and starttime::date=$2::date", [regno, date])
	.then(function(data){
		var available = new Array(24).fill(true);
		for (var i = 0; i < data.length; i++){
			for (var h = data[i].start; h < data[i].end; h++)
				available[h] = false;
		}
		return available;
	})
}

global.getCar = function(regno){
	var car;
	regno = regno.toUpperCase();
	return global.db.one("SELECT * from Car where regno=$1", regno)
		.then(function(data){
			car = data;
			return global.getCarAvailabilities(regno, new Date());
		})
		.then(function(data){
			var available = new Array(24).fill(true);
			for (var i = 0; i < data.length; i++){
				for (var h = data[i].start; h < data[i].end; h++)
					available[h] = false;
			}
			car.availabilities = available;
			return global.db.one("SELECT * FROM Carbay WHERE bayid = $1", car.parkedat)
		})
		.then(function(data){
			console.log(data);
			car.locatedat_name = data.name
			return car;
		})
		.catch(function(error){
			console.log(error);
			return null;
		});
}

global.getCarBay = function(id){
	// Slightly more complex example here
 	var bayData;
 	return global.db.one("SELECT * from CarBay WHERE bayid=$1", id)
 	.then(function(data){
		bayData = data;
		return global.db.many("SELECT car.*, NOT EXISTS(SELECT * FROM Booking WHERE CURRENT_TIMESTAMP BETWEEN startTime AND endTime) AS available FROM Car WHERE parkedAt = $1;", id);
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

global.getAllCars = function(){
	return global.db.many("SELECT * From Car ORDER BY name");
}


global.getHourlyRate = function(memberNo){
	var query = "SELECT hourly_rate AS rate FROM Member INNER JOIN MembershipPlan ON subscribed = title WHERE memberNo = $1;";
	return global.db.one(query, [memberNo]);
}

global.getDailyRate = function(memberNo){
	var query = "SELECT daily_rate AS rate FROM Member INNER JOIN MembershipPlan ON subscribed = title WHERE memberNo = $1;";
	return global.db.one(query, [memberNo]);
}

global.getInvoice = function(memberno, invoiceid){
	return global.db.one("SELECT * FROM invoice where memberno=$1 and invoiceno=$2", [memberno, invoiceid])
	.then(function(data){
		data.month = getMonth(data.invoicedate.getMonth());
		data.year = data.invoicedate.getFullYear();
		return data;
	});
}

global.getInvoices = function(memberno){
	return global.db.any("SELECT * FROM Invoice where memberno=$1 order by invoiceno desc", memberno)
	.then(function(data){
		for (var i = 0; i < data.length; i++){
			data[i].month = getMonth(data[i].invoicedate.getMonth());
			data[i].year = data[i].invoicedate.getFullYear();
		}
		return data;
	});
}

global.getBookingsForInvoice = function(memberno, date){
	var startDate = new Date(date.getFullYear(), date.getMonth(), 2);
	var endDate = new Date(date.getFullYear(), date.getMonth() + 1, 2);
	var query = "SELECT bookingid, car, starttime, endtime from Booking where madeby=$1 and endtime>=$2 and endtime < $3"
	return global.db.any(query, [memberno, startDate, endDate]);
}

global.addInvoice = function(memberno, date, cost){
	return global.db.any("SELECT totalamount, invoiceno from Invoice where memberno=$1 order by invoiceno desc limit 1", memberno)
	.then(function(data){
		if (data.length == 0){
			data.totalamount = 0;
			data.invoiceno = 0;
		}
		else{
			data.totalamount = data[0].totalamount;
			data.invoiceno = data[0].invoiceno;
		}

		var query = "INSERT INTO Invoice(memberno, invoiceno, invoicedate, monthlyfee, totalamount) VALUES($1, $2, $3, $4, $5)";
		return global.db.none(query, [memberno, data.invoiceno + 1, date, cost, data.totalamount + cost]);
	});
	
}

global.getLocation = function(locID){
	var query = "SELECT * FROM Location WHERE locID = $1;";
	return global.db.one(query, locID)
	.then(function(data){
		return data;
	})
	.catch(function(error){
		return null;
	});
}

global.getChildren = function(locID){
	var query = "SELECT * FROM Location WHERE is_at = $1;";
	return global.db.many(query, locID)
	.then(function(data){
		return data;
	})
	.catch(function(error){
		return null;
	});
}

global.getCarBayAt = function(locID){
	var query = "SELECT * FROM Carbay WHERE located_at = $1;";
	return global.db.many(query, locID)
	.then(function(data){
		return data;
	})
	.catch(function(error){
		return null;
	});
}

global.searchBays = function(location, name){
	var locationSearch = "%" + location.toLowerCase() + "%";
	var nameSearch = "%" + name.toLowerCase() + "%";
 	return global.db.any("SELECT Carbay.* FROM Carbay JOIN Location ON locid=located_at WHERE LOWER(Carbay.name) LIKE $1 AND LOWER(location.name) LIKE $2", [nameSearch, locationSearch])
	.then(function(data){
		return data;
	})
	.catch(function(error){
		console.log(error);
		return null;
	});
}

global.getDescendantBays = function(locID){
	var query = "WITH RECURSIVE contains(locid, is_at) AS (SELECT locid, is_at FROM Location UNION SELECT Location.locid, contains.is_at FROM Location, contains WHERE Location.is_at = contains.locid) SELECT Carbay.* FROM contains INNER JOIN Carbay ON locID = located_at WHERE is_at = $1;";
	return global.db.any(query, locID)
	.then(function(data){
		return data;
	})
	.catch(function(error){
		return null;
	});
}

global.getAllInvoices = function(memberno){
	return global.db.any("SELECT invoiceno, invoicedate, monthlyfee, totalamount FROM Invoice WHERE memberNo=$1 ORDER BY invoiceno DESC", memberno);
}
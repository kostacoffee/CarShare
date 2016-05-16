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

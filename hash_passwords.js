var pgp = require('pg-promise')();
var crypto = require('crypto');
var db = pgp({
	host : 'localhost',
	port : 5432,
	database : 'assignment3',
	user : 'webuser',
	password : 'MnU79g&@s9nacLcB'
});

db.many("SELECT memberno, nickname, password FROM member").then(function(data){
	for (var i = 0; i < data.length; i++){
		var pw = data[i].password.trim();
		var memNo = data[i].memberno;
		var salt = crypto.randomBytes(16).toString('base64');
		var hash = crypto.createHmac('sha512', salt).update(pw).digest('base64');
		db.query("UPDATE member SET pw_salt=$1, password=$2 where memberno=$3", [salt, hash, memNo])
		.then(function(){
			console.log("ran query on member");
		})
		.catch(function(error){
			console.log(error);
		});
	}
})
.catch(function(error){
	console.log(error);
});

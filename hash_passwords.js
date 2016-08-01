var pgp = require('pg-promise')();
var crypto = require('crypto');
var db = pgp({
	host : 'localhost',
	port : 5432,
	database : 'assignment3',
	user : 'webuser',
	password : 'MnU79g&@s9nacLcB'
});

db.tx(function (t) {
    return t.map("SELECT memberno, nickname, password FROM member", [], update).then(t.batch);

    function update(member) {
        var pw = member.password.trim();
        var memNo = member.memberno;
        var salt = crypto.randomBytes(16).toString('base64');
        var hash = crypto.createHmac('sha512', salt).update(pw).digest('base64');
        return t.none("UPDATE member SET pw_salt=$1, password=$2 where memberno=$3", [salt, hash, memNo]);
    }
})
    .catch(function (error) {
        console.log(error);
    });

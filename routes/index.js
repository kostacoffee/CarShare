var router = require('koa-router')();
var bcrypt = require('bcrypt');

router.get('/', function* () {
	this.status = 200;
	global.db.many("SELECT email FROM Member")
		.then( function(data){
			console.log("STUFF!!!");
			console.log(data);

		})
		.catch( function(error) {
			console.log(error);
		});
	yield this.render('index');
});

router.get('/home', function* (){
	yield this.render('home', {
		title: 'HOME!',
		numbers: [1,2,3,4]
	});
});

module.exports = router;

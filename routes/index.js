var router = require('koa-router')();

router.get('/', function* () {
	this.status = 200;
	this.body = 'Hello from Index';
});

router.get('/home', function* (){
	yield this.render('home', {
		title: 'HOME!',
		numbers: [1,2,3,4]
	});
});

module.exports = router;

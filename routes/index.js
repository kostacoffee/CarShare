var router = require('koa-router')();
var jade = require('jade');

router.get('/', function* () {
	this.status = 200;
	yield this.render('index');
});

router.get('/home', function* (){
	yield this.render('home', {
		title: 'HOME!',
		numbers: [1,2,3,4]
	});
});

module.exports = router;

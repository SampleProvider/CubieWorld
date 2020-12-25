
if(process.env.PORT){
	SERVER = 'heroku';
}
else{
	SERVER = 'localhost';
}

var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req,res){
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
if(SERVER === 'localhost'){
	var port = serv.listen(4000);
}
else{
	var port = serv.listen(process.env.PORT);
}

console.log('Server Started on port ' + port.address().port);
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();
var serveStatic = require('serve-static');
var mysql = require('mysql');
var Memcached = require('memcached');
var memcached = new Memcached('localhost:11211',{});


var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'root',
	database: 'hw7'
})

connection.connect(function(err){
	if(err){
		console.log(err);
	}
	else{
		console.log("connected to mysql");
	}
});

memcached.connect( 'localhost:11211', function( err, conn ){
  if(err){
  	console.log(err)
  }
  console.log("SUCCESS MEMCACHE")
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(require('morgan')('dev'));

app.post('/hw7',function(req,res){
	var state = req.body.state;
	var serviceType = req.body.service_type;
	var newKeyToStore = state+serviceType;
	console.log("THIS IS NEW KEY TO STORE" + newKeyToStore);
	memcached.gets(newKeyToStore,function(err,data){
		if(err){
			console.log(err);
		}
		else{
			console.log("HEHE OKAY THIS IS DATA??");
			console.log(data);
			if (data != null){
			var jsonToSend = {
				status: "OK",
				comm_rate_avg: data[newKeyToStore].comm_rate_avg,
				ind_rate_avg: data[newKeyToStore].ind_rate_avg,
				res_rate_avg: data[newKeyToStore].res_rate_avg
			}
			res.send(jsonToSend);
		}
		else{
			var query = 'SELECT comm_rate, ind_rate, res_rate FROM electric WHERE state = ' + mysql.escape(state) + ' AND service_type = ' + mysql.escape(serviceType) + ';';
	connection.query(query,function(err,result){
		if(err){
			console.log(err);
		}
		console.log("THIS IS SIZE")
		console.log(result.length);
		var totalCommRate = 0;
		var indRate = 0;
		var resRate = 0;
		console.log(result[0].comm_rate);
		for (var i = 0; i<result.length; i++){
			if(i == result.length -1){
				totalCommRate = totalCommRate + result[i].comm_rate;
				indRate = indRate + result[i].ind_rate;
				resRate = resRate + result[i].res_rate;
				var avgCommRate = totalCommRate / result.length;
				var avgIndRate = indRate / result.length;
				var avgResRate = resRate / result.length;
				var jsonToSend = {
					status: "OK",
					comm_rate_avg: avgCommRate,
					ind_rate_avg: avgIndRate,
					res_rate_avg: avgResRate
				}
				var jsonObjectToStore = {
					comm_rate_avg: avgCommRate,
					ind_rate_avg: avgIndRate,
					res_rate_avg: avgResRate
				}
				memcached.set(newKeyToStore, jsonObjectToStore, 10000, function(err){
					console.log("MEM CACHE")
					if (err){
						console.log(err);
					}
					else{
						console.log("success in cache")
					}
				})
				res.send(jsonToSend);
			}
			totalCommRate = totalCommRate + result[i].comm_rate;
			indRate = indRate + result[i].ind_rate;
			resRate = resRate + result[i].res_rate;
		}
	})

		}
	}
	})


})

app.listen(8080,"0.0.0.0",function(){
	console.log("server listening on port " + 8080);
})
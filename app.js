
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');

var routes = require('./routes');
var apiRoutes = require('./routes/api');

var app = express();

// All environments
app.set('port', process.env.PORT || 5000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use('/static', express.static(path.join(__dirname, 'static')));

// Development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/api/generate', apiRoutes.generate);
app.get('/f/:name', apiRoutes.getStoredImage);
app.post('/api/store', apiRoutes.store);

app.get('/', function(req, res) {
  if (req.query.url) {
    res.redirect('/api/generate?url=' + req.query.url);
  } else {
    return routes.index(req, res);
  }
});

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

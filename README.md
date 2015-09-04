Node based server for taking webshots using [node-webshot](https://github.com/brenden/node-webshot). Includes heroku config.

See it and use it live at <http://webshot.okfnlabs.org/>

Originally forked from [opsb/node-webshot-server](https://github.com/opsb/node-webshot-server).

## Getting started

    $ npm install
    $ node app.js
    open your browser at http://localhost:5000

## Heroku

    $ heroku create [name]
    $ heroku config:add AWS_ACCESS_KEY_ID=<......>
    $ heroku config:add AWS_SECRET_ACCESS_KEY=<......>
    $ heroku config:add AWS_S3_BUCKET=<......>
    $ heroku config:add LD_LIBRARY_PATH=/usr/local/lib:/usr/lib:/lib:/app/vendor/phantomjs/lib
    $ heroku config:add PATH=/usr/local/bin:/usr/bin:/bin:/app/vendor/phantomjs/bin
    $ git push heroku master
    open your browser at http://appname.herokuapps.com

## Service options

### Resizing
    http://localhost:5000/api/generate?url=google.com&width=500
    http://localhost:5000/api/generate?url=google.com&height=300
    http://localhost:5000/api/generate?url=google.com&width=200&height=400
    http://localhost:5000/api/generate?url=google.com&width=200&height=400&full=true

// Copyright (c) Alex Ellis 2017. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict"

const restify = require('restify');
const handler = require('./function/handler');
const app = restify.createServer();

class FunctionEvent {
    constructor(req) {
        this.body = req.body;
        this.headers = req.headers;
        this.method = req.method;
        this.query = req.query;
        this.path = req.path;
    }
}

class FunctionContext {
    constructor(cb) {
        this.value = 200;
        this.cb = cb;
        this.headerValues = {};
        this.cbCalled = 0;
    }

    status(value) {
        if(!value) {
            return this.value;
        }

        this.value = value;
        return this;
    }

    headers(value) {
        if(!value) {
            return this.headerValues;
        }

        this.headerValues = value;
        return this;    
    }

    succeed(value) {
        let err;
        this.cbCalled++;
        this.cb(err, value);
    }

    fail(value) {
        let message;
        this.cbCalled++;
        this.cb(value, message);
    }
}

var middleware = async (req, res) => {
    let cb = (err, functionResult) => {
        if (err) {
            console.error(err);
            return res.send(500, err.toString ? err.toString() : err);
        }

        if(isArray(functionResult) || isObject(functionResult)) {
            res.send(fnContext.status(), JSON.stringify(functionResult));
        } else {
            res.send(fnContext.status(), functionResult);
        }
    };

    let fnEvent = new FunctionEvent(req);
    let fnContext = new FunctionContext(cb);

    Promise.resolve(handler(fnEvent, fnContext, cb))
    .then(res => {
        if(!fnContext.cbCalled) {
            fnContext.succeed(res);
        }
    })
    .catch(e => {
        cb(e);
    });
};

app.use(restify.plugins.acceptParser(app.acceptable));
app.use(restify.plugins.queryParser());
app.use(restify.plugins.bodyParser());

app.post('/*', middleware);
app.get('/*', middleware);
app.patch('/*', middleware);
app.put('/*', middleware);

const port = process.env.http_port || 3000;

app.listen(port, () => {
    console.log(`OpenFaaS Node.js listening on port: ${port}`)
});

let isArray = (a) => {
    return (!!a) && (a.constructor === Array);
};

let isObject = (a) => {
    return (!!a) && (a.constructor === Object);
};

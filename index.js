#!/usr/bin/env node

/*!
 *
 * npm-server
 *
 * MIT licensed.
 *
 */

/**
 * Module dependencies.
 */

var fs = require('fs');
var read = fs.readFileSync;
var http = require('http');
var shasum = require('shasum');
var concat = require('concat-stream');
var tarpack = require('tar-pack').pack;
var readdir = require('fstream-npm');
var commander = require('commander');
var express = require('express');
var Proxy = require('http-proxy');
var pkg = require(__dirname + '/package.json');

/**
 * Options.
 */

var opts = commander;
opts._name = pkg.name;
opts.version(pkg.version);
opts.usage('[options] [dir]');
opts.option('-H, --host <value>', 'server host [localhost]', 'localhost');
opts.option('-p, --port <value>', 'server port [6070]', 6070);
opts.option('-e, --expire <sec>', 'cache expire time [60]', 60);
opts.parse(process.argv);
opts.dir = opts.args[0] || process.cwd();

/**
 * Cache.
 */

var cache = {};

/**
 * Proxy.
 */

var proxy = new Proxy.RoutingProxy({
  enable: { xforward: false },
  changeOrigin: true
});

/**
 * Express.
 */

var app = express();

app.use(express.logger('dev'));
app.use(app.router);
app.use(error);
app.use(forward);

app.param('name', pack);
app.get('/:name/:version?/tarball', tarball);
app.get('/:name/:version?', meta);

/**
 * Start http server.
 */

http
.createServer(app)
.listen(opts.port, opts.host, function() {
  console.log(' running : http://%s:%s', opts.host, opts.port);
  console.log(' serving : %s', opts.dir);
});

/**
 * Create package param middleware.
 *
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @param {Function} next
 * @param {String} name
 * @api private
 */

function pack(req, res, next, name) {
  if (!(name in cache)) {
    console.log(' packing : %s', name);

    var out = concat(function(tarball) {
      cache[name] = {};
      cache[name].tarball = tarball;
      cache[name].timeout = expire(name, opts.expire);
      next();
    });

    var stream = readdir(opts.dir + '/' + name);

    tarpack(stream)
    .once('error', next) // next once..
    .on('error', noop) // but don't let crash
    .pipe(out);
  }
  else {
    console.log('in cache : %s', name);

    clearTimeout(cache[name].timeout);
    cache[name].timeout = expire(name, opts.expire);

    next();
  }
}

/**
 * Serve meta handler.
 *
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @api private
 */

function meta(req, res) {
  var name = req.params.name;
  var tarball = cache[name].tarball;

  var sha = shasum(tarball);
  var file = opts.dir + '/' + name + '/package.json';

  var contents = read(file, 'utf8');

  var orig = JSON.parse(contents);
  orig._id = orig.name;
  orig.dist = {};
  orig.dist.shasum = sha;
  orig.dist.tarball = 'http://'
  + opts.host + ':'
  + opts.port + '/'
  + name + '/tarball';

  if (!req.params.version) {
    var json = JSON.parse(contents);
    json._id = json.name;
    json['dist-tags'] = {};
    json['dist-tags'].latest = json.version;
    json.versions = {};
    json.versions[json.version] = orig;
  }
  else {
    var json = orig;
  }

  console.log('    meta : %s', name);

  res.json(json);
}

/**
 * Serve tarball handler.
 *
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @api private
 */

function tarball(req, res) {
  var name = req.params.name;
  console.log(' tarball : %s', name);
  res.send(cache[name].tarball);
}

/**
 * Cache expire.
 *
 * @param {String} name
 * @param {Number} seconds
 * @return {Object} timeout
 * @api private
 */

function expire(name, seconds) {
  return setTimeout(function() {
    console.log('  expire : %s', name);
    delete cache[name];
  }, seconds * 1000);
}

/**
 * Error handler.
 *
 * @param {Error} err
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @param {Function} next
 * @api private
 */

function error(err, req, res, next) {
  console.error(err.stack);

  // let npm registry handle it :)
  forward(req, res);
}

/**
 * Forward to npm registry.
 *
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @api private
 */

function forward(req, res) {
  console.log('   proxy : %s', req.url);

  var out = {};
  out.host = 'registry.npmjs.org';
  out.port = 80;

  proxy.proxyRequest(req, res, out);
}

/**
 * No operation.
 *
 * @api private
 */

function noop() {/* noop */}

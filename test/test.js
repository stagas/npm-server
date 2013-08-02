
/**
 * Test.
 */

var assert = require('assert');
var cp = require('child_process');
var fs = require('fs');
var exec = cp.exec;
var spawn = cp.spawn;
var exists = fs.existsSync;
var print = process.stdout.write.bind(process.stdout);
var server;

prepare(
clean(
run_server(
npm_install(
verify_install(
end
)))));

function prepare(next) {
  print('.');
  process.chdir(__dirname);
  next();
}

function clean(next) {
  return function() {
    print('.');
    exec('rm -rf node_modules', next);
  };
}

function run_server(next) {
  return function() {
    print('.');
    server = spawn('node', [
      '../',
      '-H', 'localhost',
      '-p', '6171',
      'fixtures/packages'
    ]);
    server.stdout.setEncoding('utf8');
    server.stdout.on('data', function(data) {
      if (' serving : fixtures/packages\n' == data) {
        next();
      }
    });
  };
}

function npm_install(next) {
  return function() {
    print('.');
    exec('npm --registry=http://localhost:6171 install '
    + 'local-foobar-package colors', next);
  };
}

function verify_install(next) {
  return function() {
    print('.');
    assert(true === exists('node_modules/local-foobar-package'));
    assert(true === exists('node_modules/colors'));
    print('OK');
    next();
  };
}

function end(err, stdout, stderr) {
  print('-\n');
  server.kill();
}

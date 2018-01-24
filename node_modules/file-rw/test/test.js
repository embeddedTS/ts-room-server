var assert = require('chai').assert,
    rimraf = require('rimraf'),
    fs = require('fs'),
    path = require('path'),
    filerw = require('../index');

describe('file-rw', function() { 

  function p(filename) { return path.join(__dirname, filename); }

  before(function() {
    rimraf.sync(p('tmp'));
  });

  describe('readFilesUtf8', function() {
    it('should read multiple files with utf8 encoding', function(done) {
      filerw.readFilesUtf8([p('f1.txt'), p('f2.txt')], function(err, data) {
        assert(!err);
        assert.equal(data.length, 2);
        assert.equal(data[0], 'foo');
        assert.equal(data[1], 'bár');
        done();
      });
    });
    it('should allow encoding to be overridden on options', function(done) {
      filerw.readFilesUtf8([p('f2.txt')], { encoding: 'ascii' }, function(err, data) {
        assert(!err);
        assert.equal(data[0], 'bC!r');
        done();
      });
    });
    it('should callback with error if file does not exist', function(done) {
      filerw.readFilesUtf8(['unexisting file'], function(err, data) {
        assert(err);
        done();
      });
    });;
  });

  describe('mkWriteFile', function() {
    it('writes file and creates required directories', function(done) {
      outFile = p('tmp/test1/o.txt')
      filerw.mkWriteFile(outFile, 'foo', function(err, result) {
        assert(!err);
        assert.equal(result, outFile);
        assert.equal(fs.readFileSync(outFile, { encoding: 'utf-8'}), 'foo');
        done();
      }); 
    });
  });
  describe('mkWriteFiles', function() {
    it('writes multiple files and creates required directories', function(done) {
      outFile1 = p('tmp/test2/o.txt')
      outFile2 = p('tmp/test2/b/o.txt')
      filerw.mkWriteFiles([[ outFile1, 'foo'], [ outFile2, 'bar' ]], function(err, result) {
        assert(!err);
        assert.equal(result.length, 2);
        assert.equal(result[0], outFile1);
        assert.equal(result[1], outFile2);
        assert.equal(fs.readFileSync(outFile1, { encoding: 'utf-8'}), 'foo');
        assert.equal(fs.readFileSync(outFile2, { encoding: 'utf-8'}), 'bar');
        done();
      });       
    });
  });

});
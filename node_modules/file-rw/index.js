var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    _ = require('lodash'),
    async = require('async');

function readFilesUtf8(files, options, callback) {
  if(!callback && _.isFunction(options)) {
    callback = options;
    options = null;
  }

  options = options || {};
  callback = callback || function() {};
  if(options.encoding === undefined) { options.encoding = 'utf-8'; }
  if(_.isString(files)) { files = [ files ]; }

  async.map(files, (function(f, cb) { fs.readFile(f, options, cb) }), callback)
}


function mkWriteFile(filePath, contents, options, callback) {
  if(!callback && _.isFunction(options)) {
    callback = options;
    options = null;
  }

  callback = callback || function() {};

  mkdirp(path.dirname(filePath), function(err, createdDir) {
    if(err) { return callback(err); }
    fs.writeFile(filePath, contents, options, function(err, success) {
      if(err) { callback(err); }
      else { callback(null, filePath); }
    });
  });
};



function mkWriteFiles(filePairs, options, callback) {
  if(!callback && _.isFunction(options)) {
    callback = options;
    options = null;
  }

  callback = callback || function() {};

  function writeFun(filePair, cb) {
    mkWriteFile(filePair[0], filePair[1], options, cb);
  }

  async.map(filePairs, writeFun, callback);
}
  

exports.readFilesUtf8 = readFilesUtf8;
exports.mkWriteFile = mkWriteFile;
exports.mkWriteFiles = mkWriteFiles;
'use strict'

var fs          = require('fs')
var url         = require('url')
var path        = require('path')
var AWS         = require('aws-sdk')
var chalk       = require('chalk')

var config      = require('./config')
var streamImage

if (config.isAws) {
  // listing
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjects-property
  AWS.config.update(config.storage.aws)
  var s3    = new AWS.S3()

  // http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html#Amazon_Simple_Storage_Service__Amazon_S3_
  streamImage = function streamImage(imageName) {
    return s3
    .getObject({
      Bucket: config.storage.aws.bucketName,
      Key:    imageName
    })
    .createReadStream()
    .on('error', function (err) {
      // local not found
      if (err.code === 'ENOENT') return
      console.log(err);
    })
  }
} else {
  streamImage = function streamImage(imageName) {
    var imagePath = path.join(config.images.uploadDir, imageName);
    return fs.createReadStream(imagePath);
  }
}

// http://stackoverflow.com/questions/12416738/how-to-use-herokus-ephemeral-filesystem
function write(file) {
  var filePath = path.join(config.images.uploadDir, file.name)
  console.log('write', chalk.green(file.name))
  var orig = fs.createReadStream(file.path)
  // should be streamed to AWS.S3 if config say so
  var dest = fs.createWriteStream(filePath)
  orig.pipe(dest)
}

function read(req, res, next) {
  return streamImage(req.params.imageName)
  .on('error', function (err) {
    if (err.code === 'ENOENT') err.status = 404
    next(err)
  })
  .pipe(res);
}

module.exports = {
  streamImage:  streamImage,
  read:         read,
  write:        write,
}

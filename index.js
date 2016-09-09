// Basic node server for signing S3 requests

const PORT = process.env.PORT || 4005;

require('dotenv').config();

const aws = require('aws-sdk');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const youtubedl = require('youtube-dl');

//
// S3 LOGIC
//

const s3Options = {
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION || 'us-west-1',
  bucket: process.env.S3_BUCKET
};

aws.config.update(s3Options);
const client = new aws.S3();

function getSignedS3Url(fileName, fileType, cb) {
  const bucket = s3Options.bucket
  const params = {
    Bucket: bucket,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
    ACL: 'public-read'
  }

  client.getSignedUrl('putObject', params, function(err, data) {
    const url = 'https://' + bucket + '.s3.amazonaws.com/' + fileName;
    cb(err, {
      signedRequest: data,
      url: url
    });
  });
}

//
// SERVER LOGIC
//
const app = express();

// allow cors on all routes
app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());


app.post('/signed-request', function(req, res) {
  console.log('POST /signed-request: ', req.body.file);
  const body = req.body;
  const file = body.file;
  const type = body.type;

  getSignedS3Url(file, type, function(err, signedData) {
    if (err) { console.log('ERROR', err); }

    res.send(signedData);
  });
});

app.post('/youtube-url', function(req, res) {
  console.log('POST /youtube-url: ', req.body.file);
  const body = req.body;
  const url = body.url;

  const audio = youtubedl('http://www.youtube.com/watch?v=90AiXO1pAiA',
    ['-x', '--audio-format=mp3']);

  // Will be called when the download starts.
  audio.on('info', function(info) {
    console.log('Youtube download started');
    console.log('filename: ' + info.filename);
    console.log('size: ' + info.size);
    console.log('info: ' + info);
  });

  audio.pipe(fs.createWriteStream('test-file-name'));

  client.upload({
    Key: 'test-file-name',
    Body: audio,
    Bucket: process.env.S3_BUCKET
  }, function(err, data) {
    if (err) {
      console.log('ERROR /youtube-url: ', err);
    } else {
      console.log('SUCCESS /youtube-url', data);
    }
  });
});

app.listen(PORT, function() {
  console.log('Server listening on port: ', PORT);
});

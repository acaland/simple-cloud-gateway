'use strict';

var request = require('request');
var fs = require('fs');
var AdmZip = require('adm-zip');

var destFile = 'x509up.CESNET-MetaCloud';
var REMOTEURL = 'http://vialactea-sg.oact.inaf.it:8080/wspgrade/RemoteServlet';

var app = require('../../server/server.js');

function downloadProxy(_cb) {
  var url =
    'http://etokenserver2.ct.infn.it:8082/eTokenServer/eToken/bd89dbc662dc93b1e6047e788a092f2d?voms=fedcloud.egi.eu:/fedcloud.egi.eu&proxy-renewal=false&disable-voms-proxy=false&rfc-proxy=true&cn-label=eToken:Empty';

  request(url)
    .pipe(fs.createWriteStream(destFile))
    .on('close', function() {
      console.log('proxy downloaded');
      var zip = new AdmZip();
      zip.addLocalFile(destFile);
      zip.writeZip('certs.zip');
      _cb(null);
    })
    .on('error', function(err) {
      _cb(err);
    });
}

function downloadFile(url, dest, _cb) {
  request(url)
    .pipe(fs.createWriteStream(dest))
    .on('close', function() {
      console.log('file downloaded');
      _cb(null);
    })
    .on('error', function(err) {
      _cb(err);
    });
}

module.exports = function(Job) {
  Job.afterRemote('findById', function(context, modelInstance, next) {
    console.log('before findById', context.args.id);
    var formData = {
      m: 'info',
      pass: 'hp39A11',
      ID: context.args.id,
    };
    request.post({url: REMOTEURL, formData: formData}, function(
      err,
      httpResponse,
      body
    ) {
      if (err) console.log(err);
      console.log(httpResponse.statusCode, httpResponse.statusMessage);
      console.log('Job status:', body);
      if (context.result && body) {
        context.result.status = body.trim();
      }

      // salvataggio su db
      console.log(context.result);
      next();
    });
  });

  Job.beforeRemote('create', function(context, user, next) {
    console.log('Prepare for job submission');
    var req = context.req;
    var res = context.res;
    console.log('Retrieving proxy from eTokenServer');
    downloadProxy(function(err) {
      if (err)
        res.status(401).send({error: 'Error while downloading the proxy'});

      var App = app.models.App;
      var appId = context.args.data.appId;
      if (!appId) res.status(500).send({error: 'missing appId'});
      var inputZipURL = context.args.data.inputZipURL;
      console.log('Looking for appId', appId);
      App.findById(appId, function(err, instance) {
        var workflowURL = instance.workflowURL;
        var portmapping = instance.portmapping;
        // salvare su temp directory con un identificativo univoco
        console.log('Retrieving workflow file from', workflowURL);
        downloadFile(workflowURL, 'workflow.xml', function(err) {
          console.log('Retrieving input files from', inputZipURL);
          downloadFile(inputZipURL, 'inputs.zip', function(err) {
            var formData = {
              m: 'submit',
              pass: 'hp39A11',
              wfdesc: fs.createReadStream('workflow.xml'),
              inputzip: fs.createReadStream('inputs.zip'),
              portmapping: portmapping,
              certs: fs.createReadStream('certs.zip'),
            };
            console.log('Ready to submit the job to the gUSE Remote APIs');
            request.post(
              {url: REMOTEURL, formData: formData},
              function optionalCallback(err, httpResponse, body) {
                if (err) console.log(err);
                console.log(
                  httpResponse.statusCode,
                  httpResponse.statusMessage
                );
                console.log('jobID:', body);
                context.args.data.submissionDate = Date.now();
                context.args.data.jobId = body;
                // salvataggio su db
                next();
              }
            );
          });
        });
      });
    });
  });
};

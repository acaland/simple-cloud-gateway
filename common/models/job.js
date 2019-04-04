'use strict';

var request = require('request');
var fs = require('fs');
var AdmZip = require('adm-zip');

var destFile = 'x509up.CESNET-VisIVO';
var REMOTEURL = 'http://vialactea-sg.oact.inaf.it:8080/wspgrade/RemoteServlet';
var REMOTEPASSWORD = 'hp39A11';

var app = require('../../server/server.js');

function downloadProxy(_cb) {
  // use the robot on the server at the moment
  // _cb(null);
  // return;
  var url =
    'http://etokenserver2.ct.infn.it:8082/eTokenServer/eToken/c7caed84988cf58038e41860b74c8f1b?voms=fedcloud.egi.eu:/fedcloud.egi.eu&proxy-renewal=false&disable-voms-proxy=false&rfc-proxy=true&cn-label=eToken:Empty';

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
      pass: REMOTEPASSWORD,
      ID: context.args.id,
    };
    request.post({
      url: REMOTEURL,
      formData: formData
    }, function(
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
      modelInstance.updateAttribute('status', context.result.status, function(err, instance) {
          next();
      });

    });
  });



  Job.beforeRemote('create', function(context, user, next) {
    console.log('Prepare for job submission');
    var req = context.req;
    var res = context.res;
    console.log('Retrieving proxy from eTokenServer');
    downloadProxy(function(err) {
      if (err)
        res.status(401).send({
          error: 'Error while downloading the proxy'
        });

      var App = app.models.App;
      var appId = context.args.data.appId;
      if (!appId) res.status(500).send({
        error: 'missing appId'
      });
      var inputZipURL = context.args.data.inputZipURL;
      console.log('Looking for appId', appId);
      App.findById(appId, function(err, instance) {
        var workflowURL = instance.workflowURL;
        var portmappingURL = instance.portmapping;
        var credentialId = instance.credentialId;

        // salvare su temp directory con un identificativo univoco
        console.log('Retrieving workflow file from', workflowURL);
        downloadFile(workflowURL, 'workflow.xml', function(err) {
          console.log('Retrieving input files from', inputZipURL);
          downloadFile(inputZipURL, 'inputs.zip', function(err) {
            console.log('Retrieving portmapping.txt from', portmappingURL);
            downloadFile(portmappingURL, 'portmapping.txt', function(err) {
              var formData = {
                m: 'submit',
                pass: REMOTEPASSWORD,
                wfdesc: fs.createReadStream('workflow.xml'),
                inputzip: fs.createReadStream('inputs.zip'),
                portmapping: fs.createReadStream('portmapping.txt'),
                certs: fs.createReadStream('certs.zip'),
              };
              console.log('Ready to submit the job to the gUSE Remote APIs');
              request.post({
                  url: REMOTEURL,
                  formData: formData
                },
                function optionalCallback(err, httpResponse, body) {
                  if (err) console.log(err);
                  console.log(
                    httpResponse.statusCode,
                    httpResponse.statusMessage
                  );
                  console.log('jobID:', body);
                  context.args.data.submissionDate = Date.now();
                  context.args.data.jobId = body;
                  context.args.data.status = 'submitted';
                  // salvataggio su db
                  next();
                }
              );
            });
          });
        });
      });
    });
  });

  /**
   * Return the output of the current job
   * @param {string} jobId The JobId you are retrieving the output from
   * @param {Function(Error, buffer)} callback
   */

  Job.prototype.output = function(callback, id) {
    // var data = Buffer.from('this is a tést');

    var currentJob = this;
    const jobID = currentJob.jobId;
    var currentUser = currentJob.inputZipURL.split("/")[5];
    console.log("jobID", jobID);


    var formData = {
      m: 'download',
      ID: jobID,
      pass: REMOTEPASSWORD,
    };
    console.log("Job", currentJob);
    if (currentJob.status != "finished") {
      return callback({statusCode: 404, message: "Job status " + currentJob.status});
    }
    // if (currentJob.downloadURL) {
    //   return callback({statusCode: 201, downloadURL: currentJob.downloadURL});
    // }
    request({
        method: 'POST',
        url: REMOTEURL,
        formData: formData
      }
      // function optionalCallback(err, httpResponse, body) {
      //   if (err) console.log(err);
      //   console.log(
      //     httpResponse.statusCode,
      //     httpResponse.statusMessage
      //   );
      //
      //   if (body == "FALSE\n") {
      //     return callback({statusCode: 404, message: "Output already downloaded"}, body);
      //     console.log('data:', body);
      //   } else {
      //       return callback(null, body);
      //   }
      //
      //
      // }
    )
    .on('error', function(err) {
      console.log("ERRORE");
      console.error(err);
      callback(err);
    })
    .on('response', function(response) {
      console.log("response");
      // console.log(response);
      callback(null, response, 'application/octet-stream', 'attachment; filename=output.zip')
      //callback(null, response);
      var baseURL = app.get('url').replace(/\/$/, '');
      console.log("dentro la callback");
      console.log(currentJob);

      currentJob.updateAttribute("downloadURL", baseURL + "/api/containers/" + currentUser + "/download/" + jobID + "_output.zip");
    })
    .pipe(fs.createWriteStream("./server/storage/" + currentUser + "/" + jobID + "_output.zip"));

    // console.log(jobId);
    // TODO

  };

};

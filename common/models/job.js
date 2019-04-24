"use strict";

var request = require("request");
var fs = require("fs");
var AdmZip = require("adm-zip");
const axios = require("axios");

var destFile = "x509up.CESNET-VisIVO";
var REMOTEURL = "http://vialactea-sg.oact.inaf.it:8080/wspgrade/RemoteServlet";
var REMOTEPASSWORD = "hp39A11";

var app = require("../../server/server.js");

function downloadProxy(_cb) {
  // use the robot on the server at the moment
  // _cb(null);
  // return;
  var url =
    "http://etokenserver2.ct.infn.it:8082/eTokenServer/eToken/c7caed84988cf58038e41860b74c8f1b?voms=fedcloud.egi.eu:/fedcloud.egi.eu&proxy-renewal=false&disable-voms-proxy=false&rfc-proxy=true&cn-label=eToken:Empty";

  request(url)
    .pipe(fs.createWriteStream(destFile))
    .on("close", function() {
      console.log("proxy downloaded");
      var zip = new AdmZip();
      zip.addLocalFile(destFile);
      zip.writeZip("certs.zip");
      _cb(null);
    })
    .on("error", function(err) {
      _cb(err);
    });
}

function downloadFile(url, dest, _cb) {
  request(url)
    .pipe(fs.createWriteStream(dest))
    .on("close", function() {
      console.log("file downloaded");
      _cb(null);
    })
    .on("error", function(err) {
      _cb(err);
    });
}

async function downloadFileAsync(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function checkStatus(jobId, callback) {
  var formData = {
    m: "info",
    pass: REMOTEPASSWORD,
    ID: jobId
  };
  request.post(
    {
      url: REMOTEURL,
      formData: formData
    },
    function(err, httpResponse, body) {
      if (err) callback(err);
      console.log(httpResponse.statusCode, httpResponse.statusMessage);
      console.log("Job status:", body);
      if (body) {
        callback(null, body.trim());
      }
    }
  );
}

function downloadOutput(job, container, currentHost, callback) {
  var jobId = job.jobId;
  var formData = {
    m: "download",
    ID: jobId,
    pass: REMOTEPASSWORD
  };
  console.log("JobId", jobId);
  request({
    method: "POST",
    url: REMOTEURL,
    formData: formData
  })
    .on("error", function(err) {
      console.log("ERROR");
      console.error(err);
      callback(err);
    })
    .on("response", function(response) {
      // var baseURL = app.get("url").replace(/\/$/, "");
      var downloadURL =
        currentHost +
        "/api/containers/" +
        container +
        "/download/" +
        jobId +
        "_output.zip";
      console.log("Download URL:", downloadURL);
      job.updateAttribute("downloadURL", downloadURL);
      callback(null, downloadURL);
    })
    .pipe(
      fs.createWriteStream(
        "./server/storage/" + container + "/" + jobId + "_output.zip"
      )
    );
}

async function prepareInputZip(inputs, appId) {
  var inputZip = new AdmZip();
  for (var i = 0; i < inputs.length; i++) {
    let currentItem = inputs[i];
    if (currentItem.type == "string") {
      fs.writeFileSync(currentItem.name, currentItem.value);
      inputZip.addLocalFile(currentItem.name);
    }
    if (currentItem.type == "URL" || currentItem.type == "url") {
      try {
        // const resp = await axios.get(currentItem.value);
        // fs.writeFileSync(currentItem.name, resp.data);
        await downloadFileAsync(currentItem.value, currentItem.name);
        inputZip.addLocalFile(currentItem.name);
      } catch (err) {
        console.log(err);
        return err;
      }
    }
  }
  inputZip.writeZip(appId + "_inputs.zip");
}

module.exports = function(Job) {
  Job.afterRemote("findById", function(context, modelInstance, next) {
    console.log("before findById", context.args.id);
    var formData = {
      m: "info",
      pass: REMOTEPASSWORD,
      ID: context.args.id
    };
    request.post(
      {
        url: REMOTEURL,
        formData: formData
      },
      function(err, httpResponse, body) {
        if (err) console.log(err);
        console.log(httpResponse.statusCode, httpResponse.statusMessage);
        console.log("Job status:", body);
        if (context.result && body) {
          context.result.status = body.trim();
        }

        // salvataggio su db
        console.log(context.result);
        if (context.result.status.startsWith("not valid data")) {
          context.result.status = "Downloaded";
        }
        modelInstance.updateAttribute("status", context.result.status, function(
          err,
          instance
        ) {
          next();
        });
      }
    );
  });

  Job.beforeRemote("find", function(context, unused, next) {
    console.log("siamo in Job find");
    var req = context.req;
    var userId = req.accessToken.userId;
    const filter = context.args.filter;
    // context.args.filter = { "where": { "owner": { "like" : "5cb838561bb89606af204e0c"}}};
    // context.args.filter = { "where": { "ownerId": "5cb838561bb89606af204e0c"}};
    if (filter) {
      context.args.filter["where"] = { owner: userId };
    } else {
      context.args.filter = { where: { owner: userId } };
    }
    next();
  });

  Job.beforeRemote("create", function(context, user, next) {
    console.log("Prepare for job submission...");
    console.log("Current user", user);
    var req = context.req;
    var res = context.res;
    var appId = context.args.data.appId;
    var userId = req.accessToken.userId;
    console.log("userId", userId);
    // console.log(context.args);
    var inputZipURL = context.args.data.inputZipURL;
    var inputs = context.args.data.inputs;
      // ? JSON.parse(context.args.data.inputs)
      // : null;
    console.log("Inputs", typeof inputs);
    console.log(inputs);

    /*

      [{
        "name": "execute.bin",
        "type": "URL",
        "value": "http://localhost:3000/api/containers/acaland/download/SedFit_execute.bin"
      },
      {
        "name": "fit_type",
        "type": "string",
        "value": "0"
      },
      {
        "name": "params",
        "type": "string",
        "value": "[350,250,160,70],[210.906,660.184,747.864,592.131],[4.84341,16.768,10.8736,27.4032],[1,1,1,1],7992.19,0.8,sed_weights=[1,1,1],use_wave=[350,250,160,70],outdir='./',delta_chi2=3"
      },
      {
        "name": "script_idl.tar",
        "type": "URL",
        "value": "http://localhost:3000/api/containers/acaland/download/script_idl.tar"
      },
      {
        "name": "vialactea_tap_sedfit_v7_nospawn.pro",
        "type": "URL",
        "value": "http://localhost:3000/api/containers/acaland/download/vialactea_tap_sedfit_v7_nospawn.pro"
      }]


    */
    if (!(inputZipURL || inputs)) {
      console.log("inputs or inputZipURL is missing");
      return res.status(404).send({
        error: "inputs or inputZipURL is missing"
      });
    }
    if (!appId) {
      console.log("appId is missing");
      return res.status(404).send({
        error: "appId is missing"
      });
    }

    console.log("Retrieving proxy from eTokenServer");
    downloadProxy(function(err) {
      if (err)
        res.status(401).send({
          error: "Error while downloading the proxy"
        });

      var App = app.models.App;

      console.log("Looking for appId", appId);
      App.findById(appId, async function(err, instance) {
        
        console.log("instance", instance);
        if (!instance) return next(new Error("appId not found"));
        var workflowURL = instance.workflowURL;
        var portmappingURL = instance.portmapping;
        var credentialId = instance.credentialId;

        // salvare su temp directory con un identificativo univoco
        /* console.log("Retrieving workflow file from", workflowURL);
        downloadFile(workflowURL, "workflow.xml", function(err) {
          console.log("Retrieving input files from", inputZipURL);
    
          downloadFile(inputZipURL, "inputs.zip", function(err) {
            console.log("Retrieving portmapping.txt from", portmappingURL);
            downloadFile(portmappingURL, "portmapping.txt", function(err) { */

        try {
          console.log("Retrieving workflow file from", workflowURL);
          await downloadFileAsync(workflowURL, "workflow.xml");
          if (inputs && inputs.length > 0) {
            console.log("Building inputZip file", appId + "_inputs.zip");
            await prepareInputZip(inputs, appId);
          } else {
            console.log("Retrieving input files from", inputZipURL);
            await downloadFileAsync(inputZipURL, appId + "_inputs.zip");
          }
          console.log("Retrieving portmapping.txt from", portmappingURL);
          await downloadFileAsync(portmappingURL, "portmapping.txt");
        } catch (err) {
          console.log(err);

          return next(err);
        }
        var formData = {
          m: "submit",
          pass: REMOTEPASSWORD,
          wfdesc: fs.createReadStream("workflow.xml"),
          inputzip: fs.createReadStream(appId + "_inputs.zip"),
          portmapping: fs.createReadStream("portmapping.txt"),
          certs: fs.createReadStream("certs.zip")
        };
        console.log("Ready to submit the job to the gUSE Remote APIs");
        request.post(
          {
            url: REMOTEURL,
            formData: formData
          },
          function(err, httpResponse, body) {
            if (err) console.log(err);
            console.log(httpResponse.statusCode, httpResponse.statusMessage);
            console.log("jobId:", body);
            context.args.data.submissionDate = Date.now();
            context.args.data.jobId = body;
            context.args.data.status = "submitted";
            context.args.data.owner = userId;
            // salvataggio su db
            next();
          }
        );
      });
    });
  });

  /**
   * Return the output of the current job
   * @param {string} jobId The JobId you are retrieving the output from
   * @param {Function(Error, buffer)} callback
   */

  Job.prototype.getOutput = function(req, callback, id) {
    // var data = Buffer.from('this is a tést');

    var currentJob = this;
    const jobId = currentJob.jobId;
    // var userId = req.accessToken.userId;
    req.accessToken.user(function(err, user) {
      if (err) return callback(err);
      console.log("username", user.username);
      // var currentUser = currentJob.inputZipURL
      //   ? currentJob.inputZipURL.split("/")[5]
      //   : "acaland";
      var currentUser = user.username;
      console.log("jobId", jobId);

      var formData = {
        m: "download",
        ID: jobId,
        pass: REMOTEPASSWORD
      };
      console.log("Job", currentJob);
      if (
        currentJob.status != "finished" &&
        currentJob.status != "Downloaded" &&
        currentJob.status != "error"
      ) {
        return callback({
          statusCode: 404,
          message: "Job status " + currentJob.status
        });
      }
      var outputFile =
        "./server/storage/" + currentUser + "/" + jobId + "_output.zip";
      console.log(outputFile);
      if (currentJob.downloadURL) {
        return callback(
          null,
          fs.createReadStream(outputFile),
          "application/octet-stream",
          "attachment; filename=output.zip"
        );
      }

      downloadOutput(currentJob, currentUser, req.headers.host, function(err, downloadURL) {
        if (err) {
          return callback(err, null);
        }

        return callback(
          null,
          fs.createReadStream(outputFile),
          "application/octet-stream",
          "attachment; filename=output.zip"
        );
      });
      /*
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

      currentJob.updateAttribute("downloadURL", baseURL + "/api/containers/" + currentUser + "/download/" + jobId + "_output.zip");
    })
    .pipe(fs.createWriteStream("./server/storage/" + currentUser + "/" + jobId + "_output.zip"));

    // console.log(jobId);
    // TODO
  */
    });
  };

  Job.prototype.output = function(req, callback) {
    var currentJob = this;
    // console.log("currentJob", currentJob);
    
    
    if (currentJob.downloadURL) {
      return callback(null, currentJob.downloadURL);
    }
    checkStatus(currentJob.jobId, function(err, jobStatus) {
      if (err) {
        return callback(err);
      }
      currentJob.updateAttribute("status", jobStatus, function(err, instance) {
        if (err) {
          return callback(err);
        }
      });
      if (jobStatus == "finished" || jobStatus == "error") {
        // download the output and return the URL for downloading it

        req.accessToken.user(function(err, user) {
          if (err) return callback(err);
          console.log("username", user.username);
          // var currentUser = currentJob.inputZipURL
          //   ? currentJob.inputZipURL.split("/")[5]
          //   : "acaland";
          var currentUser = user.username;

        // var currentUser = currentJob.inputZipURL
        //   ? currentJob.inputZipURL.split("/")[5]
        //   : "acaland";
        // console.log(req.headers.host);
          downloadOutput(currentJob, currentUser, req.headers.host, function(err, downloadURL) {
            if (err) return callback(err);
          
          // currentJob.updateAttribute("downloadURL", downloadURL);
            return callback(null, downloadURL);
          
          });
        });
      } else {
        var error = new Error("Job status is invalid: " + jobStatus);
        error.status = 404;
        return callback(error);
      }
    });
    // // TODO:
    // console.log(this);
  };
};

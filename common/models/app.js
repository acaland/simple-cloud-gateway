"use strict";

module.exports = function(App) {
  App.beforeRemote("create", function(context, modelInstance, next) {
    console.log("Before app creation");
    console.log("Current modelInstance");
    console.log( modelInstance);
    var req = context.req;
    var res = context.res;
    var appId = context.args.data;
    var userId = req.accessToken.userId;

    console.log("userId", userId);
    context.args.data.owner = userId;
    console.log(context.args.data);
    next();

    
  });

  App.beforeRemote("find", function(context, unused, next) {
    console.log("siamo in find");
    var req = context.req;
    var userId = req.accessToken.userId;
    // const uid = String(userId);
    console.log("Current user", userId);

    req.accessToken.user(function(err, user) {
        if (err) return console.log(err);
        console.log(user.username);
    });

    // console.log(context.args.filter);
    const filter = context.args.filter;
    // context.args.filter = { "where": { "owner": { "like" : "5cb838561bb89606af204e0c"}}};
    // context.args.filter = { "where": { "ownerId": "5cb838561bb89606af204e0c"}};
    if (filter) {
        context.args.filter["where"] =  { "or" : [{ "owner": userId }, {"public": true}]};
    } else {
        context.args.filter = { "where": { "or" : [{ "owner": userId }, {"public": true}]}};
    }
   
    next();
  });

//   App.afterRemote("find", function(context, model, next) {
//       console.log("after find, adding ");
//       console.log(context.args.filter);
//     //   console.log(context.result);
//     //   console.log(model[1].owner, typeof(model[1].owner));
//       next();
//   });
};

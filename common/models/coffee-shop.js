'use strict';

module.exports = function(CoffeeShop) {
  CoffeeShop.beforeRemote('create', function(context, user, next) {
    console.log(context.args);
    console.log('user:', user);
    context.args.data.date = Date.now();
    context.args.data.publisherId = context.req.accessToken ?
      context.req.accessToken.userId :
      'anonymous';
    next();
  });

  CoffeeShop.status = function(cb) {
    var currentDate = new Date();
    var currentHour = currentDate.getHours();
    var OPEN_HOUR = 6;
    var CLOSE_HOUR = 20;
    console.log('Current hour is %d', currentHour);
    var response;
    if (currentHour >= OPEN_HOUR && currentHour < CLOSE_HOUR) {
      response = 'We are open for business.';
    } else {
      response = 'Sorry, we are closed. Open daily from 6am to 8pm.';
    }
    cb(null, response);
  };

  CoffeeShop.getName = function(shopId, cb) {
    console.log(shopId);
    CoffeeShop.findById(shopId, function(err, instance) {
      console.log(instance);
      console.log(err);
      var response = 'Name of coffee shop is ' + instance.name;
      cb(null, response);
      console.log(response);
    });
  };
  CoffeeShop.remoteMethod('status', {
    http: {
      path: '/status',
      verb: 'get',
    },
    returns: {
      arg: 'status',
      type: 'string',
    },
  });

  CoffeeShop.remoteMethod('getName', {
    http: {path: '/getname', verb: 'get'},
    accepts: {arg: 'id', type: 'string', http: {source: 'query'}},
    returns: {arg: 'name', type: 'string'},
  });
};

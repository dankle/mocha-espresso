var Winston = require('winston');
var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];


// Logging to file is not working when using mocha
module.exports = function (module) {
  var path = module.filename.split('/').slice(-2).join('/');
  var logLevel = GLOBAL.logLevel || 'info';
  var filePath = process.cwd();

  console.log(filePath);

  var logger = new (Winston.Logger)({
    levels: {
      debug: 3,
      info: 2,
      warn: 1,
      error: 0
    }
  });

  logger.add(Winston.transports.Console, {
    colorize:   true,
    prettyPrint: true,
    level:      logLevel,
    label:      path,
    timestamp: function () {
      return getLogTimeStamp();
    },
  });

  logger.add(Winston.transports.File, {
    filename: filePath + '/mocha-rerun.log',
    level: logLevel,
    label: path,
    prettyPrint: true,
    timestamp: function () {
      return getLogTimeStamp();
    },
    json: false,
    maxsize: 40000,
  });

  return logger;
};

function getLogTimeStamp() {
  var date = new Date(+new Date());
  var month = monthNames[date.getMonth()];
  var seconds = date.getSeconds();
  if (seconds < 10) {
    seconds = '0' + seconds;
  }
  return date.getDate() + ' ' + month + ' ' + date.getFullYear() + ' ' + date.getHours() +
    ':' + date.getMinutes() + ':' + seconds;
}
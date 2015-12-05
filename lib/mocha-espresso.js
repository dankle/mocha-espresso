/**
 *
 * This class will run all tests under the directory specified as the <mocha_test_folder>.
 * If any test fails it will call the script auto_rerun.js which will rerun the test <rerun_times>
 * amount of times.
 *
 * The results of the test suite will be specified in the report file 'test/reports/mocha_report_final.json'.
 *
 * USAGE:
 *
 * mocha-espresso <mocha_test_folder> [-r <rerun_times>] [-d] [-m "<mocha_args ...>"]
 *
 * From module root use e.g.
 *
 * node mocha-espresso ../test/awesome_project/regression/ -r 2 -d -m "-g @smoke"
 *
 * Options:
 *
 *  -h, --help                       output usage information
 *  -V, --version                    output the version number
 *  -r, --rerun <rerun_times>        Rerun times (min 2)
 *  -P, --prnumber <pr_number>       PR number for github comment
 *  -H, --host <host>                Host for github comment
 *  -R, --repo <repo>             Repo for github comment
 *  -u, --user <user>                User for github comment
 *  -t, --token <token>              Token for github comment
 *  -d, --debug                      Use debug output to the console
 *  -m, --mocha <"mocha_args ...">   Mocha args
 **/

var Rek = require('rekuire');
var Exec = require('child_process').exec;
var DateFormat = require('dateformat');
var Path = require('path');
var Program = require('commander');
var Rerun = Rek('auto_rerun.js');
var GitUpdate = Rek('git_update.js');
var StringBuilder = require('stringbuilder');
var ProgressBar = require('progress');
var Fs = require('fs');
var Mkdirp = require('mkdirp');


// Parse mocha-espresso.json if it exists, if not, parse all cli options
var initSettings = function(callback) {
  var configLocalPath = Path.join(process.cwd(), 'config', 'mocha-espresso.json');
  // Check main root for config file
  Fs.stat(configLocalPath, function(err, stats) {
    if(err) {
      checkArguments();
      return callback();
    } else {
      var Config = require(configLocalPath);
      checkConfigFile(Config, function() {
        return callback();
      });
    }
  });
};

// Config for using mocha-esspresso with config file
var checkConfigFile = function (config, callback) {

  if(config.test_directory) {
    mochaTestFolder = config.test_directory;
  }
  if(config.mocha_arguments) {
    mochaArguments = mochaArguments + ' ' + config.mocha_arguments;
  }
  if(config.rerun_times) {
    rerun_times = config.rerun_times;
  }
  if(config.rerun_times) {
    rerun_times = config.rerun_times;
  }
  if(config.git_user) {
    gitHubUser = config.git_user;
  }
  if(config.git_token) {
    gitHubToken = config.git_token;
  }
  if(config.git_host) {
    gitHubHost = config.git_host;
  }
  if(config.git_repo) {
    gitHubRepo = config.git_repo;
  }
  if(config.report_directory) {
    reportDirectory = config.report_directory;
  }
  if(config.debug === true) {
    debug = true;
  }
  if (process.argv[2]) {
    commentOnGithub = true;
    gitHubPrNumber = process.argv[2];
  }
  return callback();
};

// Command Line Interface
var checkArguments = function(callback) {

  var list = function(val) {
    return val;
  };

  var version = require('../package.json').version;

  Program
      .version(version)
      .usage('<mocha_test_folder> [-r <rerun_times>] [-m "<mocha_args ...>"]')
      .option('-r, --rerun <rerun_times>', 'Rerun times (min 2)', parseInt)
      .option('-H, --host <host>', 'Host for github comment', '')
      .option('-P, --prnumber <pr_number>', 'PRnumber for github comment', '')
      .option('-R, --repo <repo>', 'Repo for github comment', '')
      .option('-u, --user <user>', 'User for github comment', '')
      .option('-t, --token <token>', 'Token for github comment', '')
      .option('-d, --debug', 'Use debug output to the console', '')
      .option('-m, --mocha <\"mocha_args ...\">', 'Mocha args', list)
      .parse(process.argv);

  if (Fs.existsSync(process.argv[2])) {
    mochaTestFolder = process.argv[2];
  } else {
    console.log('"' + process.argv[2] + '"' + ' is not a valid directory');
    console.log('Usage: ' + Program.usage());
    process.exit(1);
  }
  if (Program.rerun) {
    rerun_times = Program.rerun;
  }
  if (Program.host) {
    gitHubHost = Program.host;
  }
  if (Program.prnumber) {
    commentOnGithub = true;
    gitHubPrNumber = Program.prnumber;
  }
  if (Program.repo) {
    gitHubRepo = Program.repo;
  }
  if (Program.user) {
    gitHubUser = Program.user;
  }
  if (Program.token) {
    gitHubToken = Program.token;
  }
  if (Program.debug) {
    debug = true;
  }
  if (Program.mocha) {
    mochaArguments = mochaArguments + ' ' + Program.mocha;
  }
};

// Search for js files in the provided mocha_test_folder
var filesInDirectory = function(callback) {
  var findFilesRecursiveCMD = 'find ' + mochaTestFolder + ' -name \'*.js\'';
  Exec(findFilesRecursiveCMD, function(err, stdout, stderr) {
    if(err){
      console.log('Problem when searching for all js files recursive: ' + err);
      process.exit(1);
    }

    var files = stdout.split(/\n/);
    files.splice(files.length-1, 1);
    return callback(null, files);
  });
};

// Handle result from rerun job
var handleResult = function(rerunFailed, commentOnGitHub, finalJSONreportName) {
  results.push(rerunFailed);
  rerunProcesses--;
  if(rerunProcesses === 0) {
    if(results.indexOf(true) > -1){
      console.log('There are failed tests');
      if(commentOnGithub) {
        console.log('Updating PR on github');
        parseResultFile(finalJSONreportName, false, function (statsComment) {
          GitUpdate.createGitHubComment(statsComment, gitHubPrNumber, gitHubHost, gitHubRepo, gitHubUser, gitHubToken,
              false);
        });
      }
    } else {
      console.log('All tests successful');
      if(commentOnGithub) {
        parseResultFile(finalJSONreportName, true, function (statsComment) {
          GitUpdate.createGitHubComment(statsComment, gitHubPrNumber, gitHubHost, gitHubRepo, gitHubUser, gitHubToken,
              true);
        });
      }
    }
  }
};

// Parse result json file and return important information in md format
var parseResultFile = function(finalJSONreportName, passed, callback) {
  var json_path = Path.join(reportDirectory, finalJSONreportName);
  var json = require(json_path);

  var sb = new StringBuilder( {newline:'\r\n'} );
  sb.appendLine('**TESTS RUN: ' + json.stats.tests + '**');
  sb.appendLine('**PASSED: ' + json.stats.passes + '**');
  sb.appendLine('**FAILED: ' + json.stats.failures + '**');

  if(!passed) {
    json.failures.forEach(function (failure) {
      sb.append('###### Testcase: ');
      sb.appendLine('' + failure.title.match(/\[.*\]/) + ' ######');
      sb.appendLine('> **Title**: ' + failure.title);
      sb.appendLine('> **Message**: ' + failure.err.message + '\r\n');
    });
  }

  sb.build(function(err, mdString){
    return callback(mdString);
  });
};

// Run test process
var runMochaProcess = function(file) {
  var timeStamp = DateFormat(new Date(), 'yyyy-mm-dd_hhMMss');
  var fileName = Path.basename(file).split(/.js/);
  var dirName = Path.dirname(file).split(/\//);
  var outputReportPath = timeStamp + '_' + dirName.pop() + '-' + fileName[0];
  var multiArgument = 'multi=\'tap=- xunit=' + reportDirectory + '/' + outputReportPath +
      '.xml json=' + reportDirectory + '/' + outputReportPath + '.json\'';

  var mochaCommand = multiArgument + ' ' + 'node_modules/.bin/mocha ' + mochaArguments +
      ' ' + file;

  // Exec mocha asynch
  var child = Exec(mochaCommand);
  child.stderr.on('data', function(data) {
    console.log('Error when running: ' + mochaCommand + ' : ' + data);
  });
  child.on('error', function(err) {
    console.log('Error when running: ' + mochaCommand + ' : ' + err);
  });
  child.stdout.on('data', function(data) {
    if(debug) {
      var output = data.split('\n');
      // Regexp for matching the important information from the mocha output
      var matcher = output[0].match('^\\b(not ok|ok)\\s\\d+(.+\\[.+\\])');
      if (matcher) {
        console.log('Running test: ' + matcher[2].trim());
      }
    }
  });
  child.on('close', function(code) {
    // code > 0 = rerun
    // code 0 = no rerun
    if(code > 0) {
      if(debug) console.log('Running RERUN of ' + outputReportPath);
      Rerun.reRunMain(outputReportPath + '.xml', outputReportPath + '.json', true, rerun_times, mochaTestFolder, reportDirectory, function(rerunFailed, finalJSONreportName){
        if(!debug) bar.tick(1);
        handleResult(rerunFailed, commentOnGithub, finalJSONreportName);
      });
    } else {
      Rerun.reRunMain(outputReportPath + '.xml', outputReportPath + '.json', false, 0);
      if(!debug) bar.tick(1);
      handleResult(false, commentOnGithub);
    }
  });
};

var prepareReportsDirectory = function () {
  // Create reports directory if it doesn't exist
  if (!Fs.existsSync(reportDirectory)) {
    Mkdirp(reportDirectory);
  } else {
    // Clean reports directory from *.json and *.xml
    var removeLogsCommand = 'rm -f {' + reportDirectory + '/*.json,' + reportDirectory + '/*.xml}';
    Exec(removeLogsCommand);
  }
};

var mochaTestFolder;
var reportDirectory = Path.join(process.cwd(), 'test', 'reports');
var mochaArguments = '-R mocha-multi';
var rerun_times = 2;
var commentOnGithub = false;
var debug = false;
var rerunProcesses = 0;
var results = [];

var gitHubPrNumber;
var gitHubRepo;
var gitHubHost;
var gitHubUser;
var gitHubToken;

var bar;

// Main method
exports.init = function () {
  console.log('Starting time: ' + new Date());
  initSettings(function() {
    console.log('\n==== Run All -> ' + mochaTestFolder + ' ====');
    prepareReportsDirectory();
    filesInDirectory(function(err, files){
      if(err) {
        console.log('Error when searching for testfiles: ' + err);
        process.exit(1);
      }
      console.log('Amount of files to test: ' + files.length);
      console.log('Amount of RERUN times is set to: ' + rerun_times);

      // In some cases only one file exists in directory specified
      if(files instanceof Array){
        files.forEach(function(file) {
          runMochaProcess(file);
          rerunProcesses++;
        });
      } else {
        runMochaProcess(files);
        rerunProcesses++;
      }

      if(!debug) {
        bar = new ProgressBar('  Running mocha tests [:bar] :percent Time elapsed :elapseds', {
          complete: '=',
          incomplete: ' ',
          width: 40,
          total: rerunProcesses + 1
        });
        bar.tick(1);
      }
    });
  });
};

// Initiate
exports = module.exports;
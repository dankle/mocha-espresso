/**
 *
 * This class provides rerun functionality and is executed from mocha_espresso.js if any tests from the test suite
 * are failing.
 *
 * For each test class executed this script will update and merge the 'mocha_report_final.json' report.
 *
 **/

var Fs = require('fs');
var Path = require('path');
var Libxmljs = require('libxmljs');
var Exec = require('child_process').exec;
var Logger;

var Rerun = function () {};

// Get failed cases IDs from Mocha Json report file
var getFailedTestIds = function (jsonFileName) {

  // Get Mocha json report file
  var reportPath = Path.join(reportDirectory, jsonFileName);
  var reportJson = JSON.parse(Fs.readFileSync(reportPath, 'utf8'));
  var failedCaseIds = [];
  var tcId;
  if(reportJson.failures instanceof Array) {
    reportJson.failures.forEach(function (tc) {
      tcId = matchTitle(tc);
      if(tcId){
        failedCaseIds.push(tcId);
      }
    });
  } else {
    tcId = matchTitle(reportJson.failures);
    if(tcId){
      failedCaseIds.push(tcId);
    }
  }

  return failedCaseIds;
};

var matchTitle = function(failedTc) {
  var testCaseId;
  var matchedId = failedTc.title.match(/\[.+]/);
  if(matchedId){
    testCaseId = matchedId[0].replace(/\]/, '').replace(/\[/, '');
  } else {
    Logger.info('Warning: The following failed TC is not using the correct abbreviation \'description [Cxxxx]\' and will not' +
        ' be included in the rerun - \'' + failedTc.title + '\'');
  }

  return testCaseId;
};

// Update xml report file
var updateXmlReport = function(xmlFileName, jsonFileName){

  Logger.debug('Updating xml report ' + xmlFileName);

  // Get Mocha xml report file
  var xmlPath = Path.join(reportDirectory, xmlFileName);
  var xml = Fs.readFileSync(xmlPath, 'utf8');
  var xmlDoc = Libxmljs.parseXmlString(xml);

  // Get Mocha json report file
  var jsonPath = Path.join(reportDirectory, jsonFileName);
  var json = JSON.parse(Fs.readFileSync(jsonPath, 'utf8'));

  // Get all passed cases from json report file
  // these are the tests passed in rerun
  var rerunPassCaseIds = [];
  var tcId;
  json.passes.forEach(function(tc) {
    tcId = tc.title.match(/\[.+]/gm)[0].replace(/\]/, '').replace(/\[/, '');
    rerunPassCaseIds.push(tcId);
  });

  if (rerunPassCaseIds.length > 0) {
    // find test cases which are passed in rerun and update xml report file
    var testsuite = xmlDoc.get('//testsuite');
    var failures = parseInt(testsuite.attr('failures').value(), 10);
    var errors = parseInt(testsuite.attr('errors').value(), 10);

    var testcases = xmlDoc.find('//testcase');
    rerunPassCaseIds.forEach(function(id) {
      var matchingId = new RegExp(id,'g');
      testcases.forEach(function(tc) {
        if(tc.attr('name').value().match(matchingId) !== null) {
          if (tc.child(0)) {
            if (tc.child(0).name() == 'failure') {
              tc.child(0).remove();
              testsuite.attr('failures').value((failures - 1).toString());
              testsuite.attr('errors').value((errors - 1).toString());
              failures = parseInt(testsuite.attr('failures').value(), 10);
              errors = parseInt(testsuite.attr('errors').value(), 10);
            }
          }
        }
      });
    });

    xml = xmlDoc.toString();
    Logger.debug('Writing synch to xml report ' + xmlFileName);
    Fs.writeFileSync(xmlPath, xml);
  }
};

var mergeJsonReport = function(oldJsonFileName, jsonFileName, callback) {

  Logger.debug('Merging reports: ' + jsonFileName + ' --> ' + oldJsonFileName);

  // Get previous Mocha json report file
  var jsonPath = Path.join(reportDirectory, oldJsonFileName);
  var oldJson = JSON.parse(Fs.readFileSync(jsonPath, 'utf8'));

  // Get new Mocha json report file
  jsonPath = Path.join(reportDirectory, jsonFileName);
  var json = JSON.parse(Fs.readFileSync(jsonPath, 'utf8'));

  // Merge stats section
  oldJson.stats.suites = json.stats.suites + oldJson.stats.suites;
  oldJson.stats.tests = json.stats.tests + oldJson.stats.tests;
  oldJson.stats.passes = json.stats.passes + oldJson.stats.passes;
  oldJson.stats.failures = json.stats.failures + oldJson.stats.failures;
  oldJson.stats.pending = json.stats.pending + oldJson.stats.pending;
  oldJson.stats.end = json.stats.end;
  oldJson.stats.duration = ((new Date(json.stats.end) - new Date(oldJson.stats.start)));

  json.tests.forEach(function (tc) {
    oldJson.tests.push(tc);
  });
  json.pending.forEach(function (tc) {
    oldJson.pending.push(tc);
  });
  json.failures.forEach(function (tc) {
    oldJson.failures.push(tc);
  });
  json.passes.forEach(function (tc) {
    oldJson.passes.push(tc);
  });

  jsonPath = Path.join(reportDirectory, oldJsonFileName);

  Logger.debug('Writing file sync to: ' + jsonPath);
  Fs.writeFileSync(jsonPath, JSON.stringify(oldJson, null, 2));

  return callback();
};

// Update json report file
var updateJsonReport = function(oldJsonFileName, jsonFileName){

  Logger.debug('Updating json report: ' + jsonFileName + ' --> ' + oldJsonFileName);

  // Get previous Mocha json report file
  var jsonPath = Path.join(reportDirectory, oldJsonFileName);
  var oldJson = JSON.parse(Fs.readFileSync(jsonPath, 'utf8'));

  // Get new Mocha json report file
  jsonPath = Path.join(reportDirectory, jsonFileName);
  var json = JSON.parse(Fs.readFileSync(jsonPath, 'utf8'));

  // Get all passed cases from new json report file
  // these are the tests passed in rerun
  var rerunPassCaseIds = [];
  var tcId;
  json.passes.forEach(function(tc) {
    tcId = tc.title.match(/\[.+]/gm)[0].replace(/\]/, '').replace(/\[/, '');
    rerunPassCaseIds.push(tcId);
  });

  // Find test cases which are passed in rerun and update json report file
  if (rerunPassCaseIds.length > 0) {
    json.passes.forEach(function(passedTc) {
      // Update tests section
      oldJson.tests.forEach(function(t) {
        if (t.title == passedTc.title) {
          t.err = {};
        }
      });

      // Update passes section
      var alreadyPassed = false;
      oldJson.passes.forEach(function(t) {
        if (t.title == passedTc.title) {
          alreadyPassed = true;
        }
      });
      if (alreadyPassed === false) {
        oldJson.passes.push(passedTc);
      }

      // Update failures section
      oldJson.failures.forEach(function(t) {
        if (t.title == passedTc.title) {
          oldJson.stats.passes = oldJson.stats.passes + 1;
          oldJson.stats.failures = oldJson.stats.failures - 1;
          var index = oldJson.failures.indexOf(t);
          if (index > -1) {
            oldJson.failures.splice(index, 1);
          }
        }
      });
      // Update pending section
      oldJson.pending.forEach(function(t) {
        if (t.title == passedTc.title) {
          oldJson.stats.passes = oldJson.stats.passes + 1;
          oldJson.stats.pending = oldJson.stats.pending - 1;
          var index = oldJson.pending.indexOf(t);
          if (index > -1) {
            oldJson.pending.splice(index, 1);
          }
        }
      });
    });

    jsonPath = Path.join(reportDirectory, oldJsonFileName);
    Logger.debug('Writing file sync: ' + jsonPath);
    Fs.writeFileSync(jsonPath, JSON.stringify(oldJson, null, 2));
  }
};

// Create final mocha report
var createFinalReportFiles = function(firstJsonReportName, callback) {

  var finalJsonReportPath = Path.join(reportDirectory, MOCHA_FINAL_REPORT_NAME);

  Logger.debug('Creating final report: ' + finalJsonReportPath);

  Fs.stat(finalJsonReportPath, function(err, stats) {
    if(err) {
      var firstJsonReportPath = Path.join(reportDirectory, firstJsonReportName);
      Fs.writeFileSync(finalJsonReportPath, Fs.readFileSync(firstJsonReportPath));
      return callback();
    } else {
      mergeJsonReport(MOCHA_FINAL_REPORT_NAME, firstJsonReportName, function(err) {
        if(err){
          Logger.debug('Error when merging final json report with ' + firstJsonReportName);
        }
      });
    }
    return callback();
  });
};

var rerunTimes;
var mochaRunPath;
var reportDirectory;

var MOCHA_FINAL_REPORT_NAME = 'mocha_report_final.json';

Rerun.reRunMain = function(rerunOptions, callback) {
  reportDirectory = rerunOptions.reportDirectory;

  Logger = require('./utils/logger')(module);

  createFinalReportFiles(rerunOptions.jsonPath, function() {
    if(rerunOptions.rerun) {
      rerunTimes = rerunOptions.rerunTimes;
      mochaRunPath = rerunOptions.mochaTestFolder;
      rerunOptions.loop = 0;
      rerunOptions.rerunFailed = false;
      reRun(rerunOptions, function(rerunFailed, finalReportName) {
        return callback(rerunFailed, finalReportName);
      });
    } else {
      return callback(false, MOCHA_FINAL_REPORT_NAME);
    }
  });
};

// Rerun main function
var reRun = function(rerunOptions, callback) {
  var finalReportName = MOCHA_FINAL_REPORT_NAME;
  var rerunFailed = rerunOptions.rerunFailed;

  Logger.debug(rerunOptions);

  if (rerunOptions.loop < rerunTimes) {
    var failedTestsArray = getFailedTestIds(rerunOptions.jsonPath);
    if (failedTestsArray.length !== 0) {
      var failedTests = failedTestsArray.join('|');
      var rerunMochaReportFileName = 'rerun-' + rerunOptions.loop.toString() + '_' + rerunOptions.jsonPath;
      var rerunMochaReportFilePath = Path.join(reportDirectory, rerunMochaReportFileName);
      var mochaTimeout = rerunOptions.timeout || '--timeout 900000000';

      var reRunCmd = 'node_modules/.bin/mocha' + ' --no-colors -R json --recursive --slow 5000 ' +
        mochaTimeout + ' ' + mochaRunPath + ' -g ' +
        '\'' + failedTests + '\' > ' + rerunMochaReportFilePath;

      Logger.debug('Running rerun of ' + rerunMochaReportFilePath + ' with command: ' +
        reRunCmd);

      var child = Exec(reRunCmd);
      child.stdout.on('data', function (data) {
        Logger.debug(rerunMochaReportFileName + ' STDOUT: ' + data);
      });
      child.stderr.on('data', function(data) {
        Logger.error('Error when running: ' + reRunCmd + ' : ' + data);
        rerunFailed = true;
      });
      child.on('error', function(err) {
        Logger.error('Error when running: ' + reRunCmd + ' : ' + err);
        rerunFailed = true;
      });
      child.on('close', function(code) {
        Logger.debug('Closing rerun mocha process ' + rerunMochaReportFileName);
        if(code > 0) {
          rerunFailed = true;
        } else {
          rerunFailed = false;
        }
        updateXmlReport(rerunOptions.xmlPath, rerunMochaReportFileName);
        updateJsonReport(rerunOptions.jsonPath, rerunMochaReportFileName);
        updateJsonReport(finalReportName, rerunMochaReportFileName);
        rerunOptions.jsonPath = rerunMochaReportFileName;
        rerunOptions.loop = rerunOptions.loop+1;
        rerunOptions.rerunFailed = rerunFailed;
        reRun(rerunOptions, callback);
      });
    } else {
      rerunOptions.loop = rerunOptions.loop+1;
      rerunOptions.rerunFailed = rerunFailed;
      reRun(rerunOptions, callback);
    }
  } else {
    if (rerunFailed) {
      return callback(rerunFailed, finalReportName);
    } else {
      return callback(rerunFailed, finalReportName);
    }
  }
};

exports = module.exports = Rerun;
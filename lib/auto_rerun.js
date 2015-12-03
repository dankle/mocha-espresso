/**
 *
 * This class provides rerun functionality and is executed from mocha_espresso.js if any tests from the test suite
 * are failing.
 *
 * It will run the same command as the run_all.js rerun_count amount of times which is specified as
 * an argument to reRunMain.
 *
 * For each test class executed this script will update and merge the 'mocha_report_final.json' report.
 *
 **/

var Fs = require('fs');
var Path = require('path');
var Libxmljs = require('libxmljs');
var Exec = require('child_process').exec;

var Rerun = function () {};

// Get failed cases IDs from Mocha Json report file
var getFailedTestIds = function (jsonFileName) {

  // Get Mocha json report file
  var json_file_name = jsonFileName || 'mocha_report.json';
  var report_json = require(Path.join(__dirname, '..', 'test', 'reports', json_file_name));
  var failed_case_ids = [];
  var tc_id;
  if(report_json.failures instanceof Array) {
    report_json.failures.forEach(function (tc) {
      tc_id = matchTitle(tc);
      if(tc_id){
        failed_case_ids.push(tc_id);
      }
    });
  } else {
    tc_id = matchTitle(report_json.failures);
    if(tc_id){
      failed_case_ids.push(tc_id);
    }
  }

  return failed_case_ids;
};

var matchTitle = function(failedTc) {
  var testCaseId;
  var matchedId = failedTc.title.match(/\[.+]/);
  if(matchedId){
    testCaseId = matchedId[0].replace(/\]/, '').replace(/\[/, '');
  } else {
    console.log('Warning: The following failed TC is not using the correct abbreviation \'description [Cxxxx]\' and will not' +
        ' be included in the rerun - \'' + failedTc.title + '\'');
  }

  return testCaseId;
};

// Update xml report file
var updateXmlReport = function(xmlFileName, jsonFileName){

  // Get Mocha xml report file
  var xml_name = xmlFileName || 'mocha_report.xml';
  var xml_path = Path.join(__dirname, '..', 'test', 'reports', xml_name);
  var xml = Fs.readFileSync(xml_path, 'utf8');
  var xmlDoc = Libxmljs.parseXmlString(xml);

  // Get Mocha json report file
  var json_name = jsonFileName || 'mocha_report.json';
  var json_path = Path.join(__dirname, '..', 'test', 'reports', json_name);
  var json = require(json_path);

  // Get all passed cases from json report file
  // these are the tests passed in rerun
  var rerun_pass_case_ids = [];
  var tc_id;
  json.passes.forEach(function(tc) {
    tc_id = tc.title.match(/\[.+]/gm)[0].replace(/\]/, '').replace(/\[/, '');
    rerun_pass_case_ids.push(tc_id);
  });

  if (rerun_pass_case_ids.length > 0) {
    // Find test cases which are passed in rerun and update xml report file
    var testsuite = xmlDoc.get('//testsuite');
    var failures = parseInt(testsuite.attr('failures').value(), 10);
    var errors = parseInt(testsuite.attr('errors').value(), 10);

    var testcases = xmlDoc.find('//testcase');
    rerun_pass_case_ids.forEach(function(id) {
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
    Fs.writeFileSync(xml_path, xml);
  }
};

var mergeJsonReport = function(oldJsonFileName, jsonFileName, callback) {

  // Get previous Mocha json report file
  var json_name = oldJsonFileName || 'mocha_report_final.json';
  var json_path = Path.join(__dirname, '..', 'test', 'reports', json_name);
  var oldJson = require(json_path);

  // Get new Mocha json report file
  json_name = jsonFileName;
  json_path = Path.join(__dirname, '..', 'test', 'reports', json_name);
  var json = require(json_path);

  // Merge stats section
  oldJson.stats.suites = json.stats.suites + oldJson.stats.suites;
  oldJson.stats.tests = json.stats.tests + oldJson.stats.tests;
  oldJson.stats.passes = json.stats.passes + oldJson.stats.passes;
  oldJson.stats.failures = json.stats.failures + oldJson.stats.failures;
  oldJson.stats.end = json.stats.end;
  oldJson.stats.duration = json.stats.duration + oldJson.stats.duration;

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

  json_path = Path.join(__dirname, '..', 'test', 'reports', 'mocha_report_final.json');
  Fs.writeFileSync(json_path, JSON.stringify(oldJson, null, 2));

  return callback();
};

// Update json report file
var updateJsonReport = function(oldJsonFileName, jsonFileName){

  // Get previous Mocha json report file
  var json_name = oldJsonFileName || 'mocha_report_final.json';
  var json_path = Path.join(__dirname, '..', 'test', 'reports', json_name);
  var oldJson = require(json_path);

  // Get new Mocha json report file
  json_name = jsonFileName;
  json_path = Path.join(__dirname, '..', 'test', 'reports', json_name);
  var json = require(json_path);

  // Get all passed cases from new json report file
  // these are the tests passed in rerun
  var rerun_pass_case_ids = [];
  var tc_id;
  json.passes.forEach(function(tc) {
    tc_id = tc.title.match(/\[.+]/gm)[0].replace(/\]/, '').replace(/\[/, '');
    rerun_pass_case_ids.push(tc_id);
  });

  // Find test cases which are passed in rerun and update json report file
  if (rerun_pass_case_ids.length > 0) {
    json.passes.forEach(function(passed_tc) {
      // Update tests section
      oldJson.tests.forEach(function(t) {
        if (t.title == passed_tc.title) {
          t.err = {};
        }
      });

      // Update passes section
      var alreadyPassed = false;
      oldJson.passes.forEach(function(t) {
        if (t.title == passed_tc.title) {
          alreadyPassed = true;
        }
      });
      if (alreadyPassed === false) {
        oldJson.passes.push(passed_tc);
      }

      // Update failures section
      oldJson.failures.forEach(function(t) {
        if (t.title == passed_tc.title) {
          oldJson.stats.passes = oldJson.stats.passes + 1;
          oldJson.stats.failures = oldJson.stats.failures - 1;
          var index = oldJson.failures.indexOf(t);
          if (index > -1) {
            oldJson.failures.splice(index, 1);
          }
        }
      });
    });

    json_path = Path.join(__dirname, '..', 'test', 'reports', 'mocha_report_final.json');
    Fs.writeFileSync(json_path, JSON.stringify(oldJson, null, 2));
  }
};

// Create final mocha report
var createFinalReportFiles = function(firstJsonReport, callback) {

  var final_json_report = Path.join(__dirname, '..', 'test', 'reports', 'mocha_report_final.json');

  Fs.stat(final_json_report, function(err, stats) {
    if(err) {
      var first_json_report = Path.join(__dirname, '..', 'test', 'reports', firstJsonReport);
      Fs.writeFileSync(final_json_report, Fs.readFileSync(first_json_report));
      return callback();
    } else {
      mergeJsonReport('mocha_report_final.json', firstJsonReport, function(err) {
        if(err){
          console.log('Error when merging final json report with ' + firstJsonReport);
        }
      });
    }
    return callback();
  });
};

var rerun_times;
var run_path;

Rerun.reRunMain = function(xml_name, json_name, rerun, rerun_count, mocha_test_folder, callback) {
  createFinalReportFiles(json_name, function() {
    if(rerun) {
      rerun_times = rerun_count;
      run_path = mocha_test_folder;
      reRun(xml_name, json_name, json_name, 0, false, callback);
    }
  });
};

// Rerun main function
var reRun = function(xml_name, json_name, originalFileName, loop, rerunFailed, callback) {
  var finalJSONreportName = 'mocha_report_final.json';

  if (loop < rerun_times) {
    var failedTestsArray = getFailedTestIds(json_name);
    if (failedTestsArray.length !== 0) {
      var failedTests = failedTestsArray.join('|');
      var rerun_mocha_report_file_name = 'rerun-' + loop.toString() + '_' + originalFileName;
      var rerun_mocha_report_file = Path.join(__dirname, '..', 'test', 'reports', rerun_mocha_report_file_name);

      var reRunCmd = './node_modules/.bin/mocha --no-colors -R json ' + run_path + ' -g ' +
        '\'' + failedTests + '\' > ' + rerun_mocha_report_file;

      Exec(reRunCmd, function (error, stdout, stderr) {
        if (error !== null) {
          rerunFailed = true;
        } else {
          rerunFailed = false;
        }
        updateXmlReport(xml_name, rerun_mocha_report_file_name);
        updateJsonReport(finalJSONreportName, rerun_mocha_report_file_name);
        json_name = rerun_mocha_report_file_name;
        reRun(xml_name, json_name, originalFileName, loop+1, rerunFailed, callback);
      });
    } else {
      reRun(xml_name, json_name, originalFileName, loop+1, rerunFailed, callback);
    }
  } else {
    if (rerunFailed) {
      return callback(rerunFailed, finalJSONreportName);
    } else {
      return callback(rerunFailed, finalJSONreportName);
    }
  }
};

exports = module.exports = Rerun;
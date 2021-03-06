# Mocha-espresso

Mocha-espresso is a test runner that allows you to execute mocha test suites in parallel. The main purpose of this module is to increase execution speed of mocha test suites.


## How does it work?

Mocha-espresso will execute all mocha test cases existing in a directory and its subfolders in a asynchronous way. Each *.js file will execute in its
own thread while the main thread will keep track of the reports.
When all tests are done one summarized report will be created, and if configured to do so, comment and commit status will be added to a PR on github.

This test runner will also generate reports in both json and xml, compatible with [xunit](https://wiki.jenkins-ci.org/display/JENKINS/TestComplete+xUnit+Plugin). 

---

## Table of contents

- [Installation](#installation)
- [Example](#example)
- [Usage](#usage)
- [Options](#options)
- [Jenkins](#jenkins)
- [Results](#results)
- [License](#license)

---

## Installation ##

```shell
$ npm install mocha-espresso
$ npm install mocha-multi
```
Add the following to your ```package.json```:
```shell
  "scripts": {
    "mocha-espresso": "./node_modules/.bin/mocha-espresso"
  },
```

---
## Example ##
```shell
$ npm run mocha-espresso -- ./test/foo/bar -r 2 -d -m "-g @smoke"
```

---

## Usage ##
##### Using command line options

Pull request comment updates in git disabled:
```shell
$ npm run mocha-espresso -- <mocha_test_folder> [-r <rerun_times>] [-m "<mocha_args ...>"]
```

Pull request comment updates in git enabled:
```shell
$ npm run mocha-espresso -- <mocha_test_folder> -P <pr_number> [-m "<mocha_args ...>"]
```

By default mocha-espresso will run all mocha testcases in the specified ```<mocha_test_folder>```. This is configurable 
with the option ```-m <mocha_args ...>```, which will get forwarded to mocha.

All reports will be generated to ```./test/reports/``` by default. This is only configurable when using the mocha-espresso config file. **NOTE**: For every run, all \*.json and \*.xml files will be deleted in this directory. *(Path relative to current directory)*

##### Using config file

Pull request comment updates in git disabled:
```shell
$ npm run mocha-espresso
```
Pull request comment updates in git enabled:
```shell
$ npm run mocha-espresso -- -P <prnumber>
```

For convenience all options can be added to a config file. 
If config file is used all the options from the command line will be ignored, except for ```-P```and ```--prnumber``` which activates pull request comment updates.

All options will be parsed from ```./config/mocha-espresso.json```, more information in config file section.

---

## Options ##

```shell
  -h, --help                       output usage information
  -V, --version                    output the version number
  -r, --rerun <rerun_times>        Rerun times (default 2)
  -P, --prnumber <pr_number>       PR number for github comment
  -h, --host <host>                Host for github comment
  -R, --repo <repo>                Repo for github comment
  -u, --user <user>                User for github comment
  -t, --token <token>              Token for github comment
  -d, --debug                      Use debug output to the console
  -m, --mocha <"mocha_args ...">   Mocha args
```

### Git Pull Request updates ###

When using the option ```-P``` or ```--prnumber```, github updates will be enabled. For this to work you need to set the following options:

```shell
  -h, --host <host>                Host for github comment
  -R, --repo <repo>                Repo for github comment
  -u, --user <user>                User for github comment
  -t, --token <token>              Token for github comment
```

For information on how to generate a access token for git:
[Generate personal github token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/)

## Config file ##
For using the config file create  ```./config/mocha-espresso.json``` and set the parameters according to the following example:

```
{
  "mocha_arguments": "-g @smoke",
  "test_directory": "./test/inspection_rules",
  "report_directory": "./test/bananas",
  "rerun_times": "2",
  "git_user": "test",
  "git_token": "###################################",
  "git_host": "github.com",
  "git_repo": "my-project",
  "debug": false
}
```
* **mocha_arguments**: Whatever mocha arguments you would like to pass on to the test.
* **test_directory**: Directory where the mocha tests are located. *(Path relative to current directory)*
* **report_directory**:  Directory where the reports from the mocha tests will be generated. **NOTE**: Use with caution, for every run, all *.json and *.xml files will be deleted in this directory. *(Path relative to current directory)*
* **rerun_times**: Amount of times a test will rerun, if the test is failing.
* **debug**: (default: FALSE) 
   * TRUE, the current testcase will be logged to the console.
   * FALSE, the progress will be presented as with a progressbar.

### Recommendations ###
##### Jenkins
When using mocha-espresso with a Jenkins job or in any other automated CI environment, the easiest way is to use the command line options. 
##### Manual initiation
If you are initiating mocha-espresso manually when running the test suites it's more convenient to use the config file ```./config/mocha-espresso.json```.

---
## Jenkins
##### Setup a jenkins job
It's easy to add mocha-espresso to your existing jenkins job. Just do the following steps:

* First setup your module under test under **Source Code Management**, i.e. your git repository.
* Under **Build**, add the following to the **Execute Shell** *command* field:

```shell
export PATH=/usr/local/bin:$PATH
node --version
npm prune
npm install
set +e

npm run mocha-espresso -- ./test/pangaea/regression/ -r 2 -d -m "-g @smoke"
```

* Under **Post-build Actions** add *build steps*:
  * **Publish JUnit test result report** - Test Report XMLs - ```test/reports/*.xml```
  * **Archive the artifacts** - Files to archive - ```test/reports/*```
 

---

## Results ##
After running this module a final report **mocha_report_final.json** will by default be created under the ```./test/reports```
directory with all essential information along with the following reports:
* **date_time_dir-filename.json|xml** (one for each file containing mocha tests e.g. 2015-12-10_013235_test-test_file.json and 2015-12-10_013235_test-test_file.xml)
* **rerun-1_date_time_dir-filename.json** (one for each rerun e.g. rerun-1_2015-12-10_013235_test-test_file.json)

For each rerun, the *.json and *.xml reports will be updated if a previously failed test is changed to passed. This will reflect an accurate test result if e.g. a Jenkins job uses the mocha-espresso xml reports to publish a unit result report.


##### Pull request comment and commit status
If pull request updates are activated a comment will be added to the Pull Request, provided as ```<pr_number>``` with a summary from the testrun. 
* If all tests passed the latest commit will be marked as PASSED.
* If any test fails the latest commit will be marked as FAILED.


---

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)
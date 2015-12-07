# Mocha-espresso

Mocha-espresso is a cli tool that allows you to execute mocha test suites in parallel. The main purpose of this module is to increase execution speed of mocha test suites.

## How does it work?

Mocha-espresso will execute all mocha test cases existing in a directory and its subfolders in a asynchronous way. Each *.js file will execute in its
own thread while the main thread will keep track of the reports.
When all tests are done one summarized report will be created, and if configured to do so, comment and commit status will be added to a PR on github.

---

## Table of contents

- [Installation](#installation)
- [Example](#example)
- [Usage](#usage)
- [Options](#options)
- [Results](#results)
- [License](#license)

---

## Installation ##

```shell
$ npm install mocha-espresso -g
```

---
## Example ##
```shell
$ mocha-espresso ./test/foo/bar -r 2 -d -m "-g @smoke"
```

---

## Usage ##
##### Using command line options

Pull request updates in git disabled
```shell
$ mocha-espresso <mocha_test_folder> [-r <rerun_times>] [-m "<mocha_args ...>"]
```

Pull request updates in git enabled
```shell
$ mocha-espresso <mocha_test_folder> -P <pr_number> [-m "<mocha_args ...>"]
```

By default Mocha-Espresso will also run all mocha testcases in the specified ```<mocha_test_folder>```. This is configurable 
with the option ```-m <mocha_args ...>```, which will get forwarded to mocha.

All reports will be generated to ```./test/reports/``` by default. This is only configurable when using the mocha-espresso config file. **NOTE**: For every run, all *.json and *.xml files will be deleted in this directory. *(Path relative to current directory)*

##### Using config file
All options will be parsed from ```./config/mocha-espresso.json```, more information in config file section.

Pull request updates in git disabled
```shell
$ mocha-espresso
```
Pull request updates in git enabled
```shell
$ mocha-espresso -P <prnumber>
```

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

For convenience all options can be added to a config file. **NOTE**: If config file is used all the options from the command line will be ignored, except for ```-P```and ```--prnumber``` which activates pull request updates.
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

## Results ##
After running this module a final report **mocha_report_final.json** will by default be created under the ```./test/reports```
directory with all essential information.
##### Pull request comment and commit status
If pull request updates are activated a comment will be added to the Pull Request, provided as ```<pr_number>``` with a summary from the testrun. 
* If all tests passed the latest commit will be marked as PASSED.
* If any test fails the latest commit will be marked as FAILED.


---

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)
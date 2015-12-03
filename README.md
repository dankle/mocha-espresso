# mocha-espresso 

Mocha-espresso is a tool that allows you to execute mocha test suites in parallel.

The main purpose of this module is to increase execution speed of large mocha test suites.

## How does it work?

Mocha-espresso will execute all mocha testcases existing in a directory and its subfolders in a asynchronous way. Each .js file will execute in its
own thread while the main thread will keep track of the reports and updating the PR on github.
When all tests are done one summarized report will be created.

---

## Table of contents

- [Installation](#installation)
- [Example](#example)
- [Usage](#usage)
- [Options](#options)
- [Results](#Results)
- [License](#license)

---

## Installation ##
```shell
npm install mocha-espresso
```

---

## Usage ##

Git updates disabled
```shell
    run_all <mocha_test_folder> [-r <rerun_times>] [-m "<mocha_args ...>"]
```
Git updates enabled
```shell
    run_all <mocha_test_folder> -P <pr_number> [-m "<mocha_args ...>"]
```

Where <mocha_test_folder> is your base directory for your tests, 
Mocha-Espresso will search all subfolders for mocha testcases and run them.

By default Mocha-Espresso will search for all mocha testcases in the specified directory, this is configurable 
with the option 'mocha_args' which just passes the arguments on to mocha and is therefore compatible with
any mocha arguments.

### Git Pull Request updates ###

When using the option **-P** github updates will be enabled. For this to work you need to set the following options:

```shell
  -h, --host <host>                Host for github comment
  -repo, --repo <repo>             Repo for github comment
  -u, --user <user>                User for github comment
  -t, --token <token>              Token for github comment
```

For information on how to generate a access token for git:
[Generate personal github token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/)

---

## Options ##

```shell
  -h, --help                       output usage information
  -V, --version                    output the version number
  -r, --rerun <rerun_times>        Rerun times (default 2)
  -P, --prnumber <pr_number>       PR number for github comment
  -h, --host <host>                Host for github comment
  -repo, --repo <repo>             Repo for github comment
  -u, --user <user>                User for github comment
  -t, --token <token>              Token for github comment
  -d, --debug                      Use debug output to the console
  -m, --mocha <"mocha_args ...">   Mocha args
``

For convenience these options can be added to a config file to save the settings:

Create file /config/mocha-espresso.json and set parameters according to example:

```
{
  "mocha_arguments": "-g @smoke",
  "test_directory": "./test/inspection_rules",
  "rerun_times": "2",
  "git_user": "test",
  "git_token": "###################################",
  "git_host": "github.com",
  "git_repo": "my-project",
  "debug": "false"
}
```

---

## Results ##
After running this module a final report **mocha_report_final.json** will be created under the **[reports](./test/reports)**
directory with all essential information. Also a comment will be added to the Pull Request you provided with a summary from the testrun, if all tests passed the latest commit will be marked as PASS.
If any test fails the latest commit will be marked as FAIL.

---

## License
Licensed under the [MIT](http://opensource.org/licenses/MIT)
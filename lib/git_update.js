/**
 *
 *  This class handles communication with github and is currently used only for
 *  updating comments after running run_all.js test suites.
 *
 */
var GitHubApi = require('github');

GitUpdate = function () {};

var retries = 5;
var github;

// Creates a comment on github for Pull Request that are related to 'prNumber'.
// Updates the latest commit status provided by the boolean 'passed'.
GitUpdate.createGitHubComment = function(comment, prNumber, host, repo, user, token, passed) {

  github = new GitHubApi({
    // required
    version: '3.0.0',
    // optional
    debug: false,
    protocol: 'https',
    host: host,
    pathPrefix: '/api/v3',
    timeout: 5000,
    headers: {
      'user-agent': 'Pangaea' // GitHub is happy with a unique user agent
    }
  });

  github.authenticate({
    type: 'oauth',
    token: token
  });

  createComment(user, repo, prNumber, comment, host, passed);

};

// Private create comment function
var createComment = function(user, repo, prNumber, comment, host, passed) {

  github.issues.createComment(
      {
        user: user,
        repo: repo,
        number: prNumber,
        body: comment
      },
      function(err, res) {
        if(err) {
          if(retries === 0) {
            console.log('Error when creating github comment: ' + err);
          } else {
            retries--;
            createComment(user, repo, prNumber, comment);
          }
        } else {
          console.log('Test status comment sent to github at ' + host + '/' + user + '/' + repo + '/pull/' + prNumber);
          getLatestCommit(user, repo, prNumber, host, function(latestCommitSha) {
            if(passed) {
              createStatus(user, repo, latestCommitSha, 'success');
            } else {
              createStatus(user, repo, latestCommitSha, 'failure');
            }
          });
        }
      }
  );
};

// Retrieves the latest commit on the Pull Request related to 'prNumber'
var getLatestCommit = function(user, repo, prNumber, host, callback) {

  github.pullRequests.getCommits(
      {
        user: user,
        repo: repo,
        number: prNumber
      },
      function(err, res) {
        if(err) {
          console.log(err);
        } else {
          if(res.length > 0) {
            var latestCommitSha = res.pop().sha;
            return callback(latestCommitSha);
          } else {
            console.log('Error: No commits found for at ' + host + '/' + user + '/' + repo + '/pull/' + prNumber);
          }
        }
      }
  );
};

// Creates a status on the commit identified by 'commitSha.
// Status 'success' or 'failure'.
var createStatus = function(user, repo, commitSha, status) {

  github.statuses.create(
      {
        user: user,
        repo: repo,
        sha: commitSha,
        state: status
      },
      function(err, res) {
        if(err) {
          console.log(err);
        } else {
          console.log('Test status ' + status + ' sent to github for commitSha ' + commitSha);
        }
      }
  );
};

exports = module.exports = GitUpdate;


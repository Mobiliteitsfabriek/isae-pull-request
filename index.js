const core = require('@actions/core');
const github = require('@actions/github');

const config = {
    pullRequestTitleRegex: /^\[?(mofab|io)-\d+\]?/i,
    branchNameRegex: /^[^\/]+\/(mofab|io)-\d+-/i
};

// most @actions toolkit packages have async methods
async function run() {
    try {
        const {repository, pull_request} = github.context.payload;
        const octokitPullsPayload = {
            owner: repository.owner.login,
            repo: repository.name,
            pull_number: pull_request.number
        };

        const octokit = github.getOctokit(core.getInput('repo-token', {required: true}));
        const errors = [];

        if (false === config.pullRequestTitleRegex.test(pull_request.title)) {
            errors.push('* Title does not seem to contain reference to JIRA ticket');
        }

        if (false === config.branchNameRegex.test(pull_request.head.ref)) {
            errors.push('* Branch name does not seem to contain reference to JIRA ticket (expected ^[^/]+/(MOFAB|IO)-\d+-.*$)');
        }

        const reviews = octokit.pulls.listReviews(octokitPullsPayload);
        const reviewExists = reviews.data.any(review => review.user.login === 'github-actions[bot]');

        if (errors.length > 0) {
            if (false === reviewExists) {
                octokit.pulls.createReview({
                    ...octokitPullsPayload,
                    body: errors.join('\n'),
                    event: 'REQUEST_CHANGES'
                });
            } else {
                octokit.pulls.createReview({
                    ...octokitPullsPayload,
                    body: errors.join('\n'),
                    event: 'COMMENT'
                });
            }
        } else {
            if (reviewExists) {
                for (const review of reviews.data) {
                    octokit.pulls.dismissReview({
                        ...octokitPullsPayload,
                        review_id: review.id,
                        message: 'PR title & branch is now ISAE compliant!'
                    });
                }
            }
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();

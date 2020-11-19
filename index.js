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

        const reviews = await octokit.pulls.listReviews(octokitPullsPayload);
        let reviewExists = false;
        for (const review of reviews.data) {
            reviewExists = reviewExists || review.user.login === 'github-actions[bot]';
        }

        if (errors.length > 0) {
            core.info('Validation failed');
            if (false === reviewExists) {
                core.info('Creating new review to request changes');
                await octokit.pulls.createReview({
                    ...octokitPullsPayload,
                    body: errors.join('\n'),
                    event: 'REQUEST_CHANGES'
                });
            } else {
                core.info('Creating new comment to keep requesting changes');
                await octokit.pulls.createReview({
                    ...octokitPullsPayload,
                    body: errors.join('\n'),
                    event: 'COMMENT'
                });
            }
        } else {
            core.info('Validation succeeded');

            if (reviewExists) {
                for (const review of reviews.data) {
                    if (review.state !== 'DISMISSED' && review.user.login === 'github-actions[bot]') {
                        core.info('Dismissing own review');
                        await octokit.pulls.dismissReview({
                            ...octokitPullsPayload,
                            review_id: review.id,
                            message: 'PR title & branch is now ISAE compliant!'
                        });
                    }
                }
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();

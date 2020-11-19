const core = require('@actions/core');
const github = require('@actions/github');
const jiraApiConnector = require('jira-connector');

const config = {
    pullRequestTitleRegex: /^\[?((mofab|io)-\d+)\]?/i,
    branchNameRegex: /^[^\/]+\/((mofab|io)-\d+)-/i
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

        const validateTitleMatchesWithBranch = core.getInput('title-must-match-branch').toLowerCase() === 'true';
        const validateWithJira = core.getInput('validate-with-jira').toLowerCase() === 'true';
        const validateJiraStatusCategoryDone = core.getInput('validate-jira-status-not-done').toLowerCase() === 'true';

        core.info(`title-must-match-branch: ${core.getInput('title-must-match-branch')}`);
        core.info(`validate-with-jira: ${core.getInput('validate-with-jira')}`);

        if (false === config.pullRequestTitleRegex.test(pull_request.title)) {
            errors.push(`* Title does not seem to contain reference to JIRA ticket (expected ${config.pullRequestTitleRegex.toString()})`);
        }

        if (false === config.branchNameRegex.test(pull_request.head.ref)) {
            errors.push(`* Branch name does not seem to contain reference to JIRA ticket (expected ${config.branchNameRegex.toString()})`);
        }

        if (true === validateTitleMatchesWithBranch && errors.length === 0) {
            const branchTicket = config.branchNameRegex.exec(pull_request.head.ref)[1];
            const titleTicket = config.pullRequestTitleRegex.exec(pull_request.title)[1];

            if (branchTicket !== titleTicket) {
                errors.push('* JIRA ticket reference in title does not match with JIRA ticket in branch');
            }
        }

        if (true === validateWithJira && errors.length === 0) {
            const jira = createJira();
            const branchTicket = config.branchNameRegex.exec(pull_request.head.ref)[1];
            const titleTicket = config.pullRequestTitleRegex.exec(pull_request.title)[1];

            const tickets = [branchTicket];
            if (branchTicket !== titleTicket) {
                tickets.push(titleTicket);
            }

            for (const ticket of tickets) {
                const issuePromise = jira.issue.getIssue({issueKey: ticket})
                    .then(({fields: {status: {statusCategory: {key}}}}) => {
                        return key !== 'done' ? 'issue found' : 'issue found but already done';
                    })
                    .catch(responseString => JSON.parse(responseString).statusCode === 404 ? 'issue not found' : responseString);
                const issueFetchResult = await issuePromise;

                switch (issueFetchResult) {
                    case 'issue found but already done':
                        if (true === validateJiraStatusCategoryDone) {
                            core.info(`Found issue ${ticket} in JIRA, but status category is 'done'`);
                            errors.push(`* JIRA ticket reference ${ticket} in JIRA has status category 'done'`);
                            break;
                        }
                        core.info('Skipping validation of status category');
                        // fallthrough to 'íssue found'
                    case 'issue found':
                        core.info(`Found issue ${ticket} in JIRA`);
                        break;
                    case 'issue not found':
                        core.info(`Did not find issue ${ticket} in JIRA`);
                        errors.push(`* JIRA ticket reference ${ticket} not found in JIRA`);
                        break;

                    default:
                        throw new Error(issueFetchResult);
                }
            }
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
                    if (review.state === 'REQUEST_CHANGES' && review.user.login === 'github-actions[bot]') {
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

function createJira() {
    const host = core.getInput('jira-url', {required: true});
    const email = core.getInput('jira-auth-email', {required: true});
    const token = core.getInput('jira-auth-token', {required: true});

    const config = {
        host: host,
        basic_auth: {
            email: email,
            api_token: token
        }
    };

    return new jiraApiConnector(config);
}

run();

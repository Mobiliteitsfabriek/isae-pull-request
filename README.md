# ISAE PR reviewer

This action reviews whether the Github Pull Request adheres to our ISAE requirements:

* Contains ticket reference in PR title
* Contains ticket reference in branch name

If at least one is missing, it will automatically request changes on the pull request.

If none are missing and there are any changes requested by github actions bot, they will automatically be dismissed.

## Using this in your project

You need to enable actions on the github project and create the appropriate workflow file.
Recommended .github/workflows/isae-pr-review.yml file:

```yaml
name: Pull request linter

# Controls when the action will run. Triggers the workflow on push or pull request
# events but only for the main branch
on:
  pull_request:
    types: 
      - opened
      - edited
      - reopened
      - synchronize

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "lint"
  lint:
    # The type of runner that the job will run on
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      - name: Pull Request Linter
        # Alternatively instead of a tag, you can use a branch name
        uses: Mobiliteitsfabriek/isae-pull-request@v1.0.0
        with:
          # Github token with access to the repository (secrets.GITHUB_TOKEN).
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Deploying changes to this action

Run `bin/build` to build the changes into the dist folder. This folder is committed to the repository and read by
Github when running this action.

Create a pull request to main branch with the appropriate semver label added: `major`, `minor` or `patch`.
When the pull request is merged, it will automatically create a new release

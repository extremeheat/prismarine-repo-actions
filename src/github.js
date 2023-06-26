const noop = () => {}
if (!process.env.CI) {
  // mock a bunch of things for testing locally -- https://github.com/actions/toolkit/issues/71
  process.env.GITHUB_REPOSITORY = 'PrismarineJS/bedrock-protocol'
  process.env.GITHUB_EVENT_NAME = 'issue_comment'
  process.env.GITHUB_SHA = 'cb2fd97b6eae9f2c7fee79d5a86eb9c3b4ac80d8'
  process.env.GITHUB_REF = 'refs/heads/master'
  process.env.GITHUB_WORKFLOW = 'Issue comments'
  process.env.GITHUB_ACTION = 'run1'
  process.env.GITHUB_ACTOR = 'test-user'
  module.exports = { getIssueStatus: noop, updateIssue: noop, createIssue: noop, onRepoComment: noop, repoURL: 'https://github.com/' + process.env.GITHUB_REPOSITORY }
  return
}

// const { Octokit } = require('@octokit/rest') // https://github.com/octokit/rest.js
const github = require('@actions/github')

const token = process.env.GITHUB_TOKEN
const octokit = github.getOctokit(token)
const context = github.context

async function getIssueStatus (title) {
  // https://docs.github.com/en/rest/reference/search#search-issues-and-pull-requests
  const existingIssues = await octokit.rest.search.issuesAndPullRequests({
    q: `is:issue repo:${process.env.GITHUB_REPOSITORY} in:title ${title}`
  })
  // console.log('Existing issues', existingIssues)
  const existingIssue = existingIssues.data.items.find(issue => issue.title === title)

  if (!existingIssue) return {}

  return { open: existingIssue.state === 'open', closed: existingIssue.state === 'closed', id: existingIssue.number }
}

async function updateIssue (id, payload) {
  const issue = await octokit.rest.issues.update({
    ...context.repo,
    issue_number: id,
    body: payload.body
  })
  console.log(`Updated issue ${issue.data.title}#${issue.data.number}: ${issue.data.html_url}`)
}

async function createIssue (payload) {
  const issue = await octokit.rest.issues.create({
    ...context.repo,
    ...payload
  })
  console.log(`Created issue ${issue.data.title}#${issue.data.number}: ${issue.data.html_url}`)
}

async function close (id, reason) {
  if (reason) await octokit.rest.issues.createComment({ ...context.repo, issue_number: id, body: reason })
  const issue = await octokit.rest.issues.update({ ...context.repo, issue_number: id, state: 'closed' })
  console.log(`Closed issue ${issue.data.title}#${issue.data.number}: ${issue.data.html_url}`)
}

async function onRepoComment (fn) {
  if (context.comment && context.issue) fn({ 
    role: context.comment.author_association, 
    body: context.comment.body,
    type: context.issue.pull_request ? 'pull' : 'issue', 
    isPullMerged: context.issue.pull_request?.merged,
    author: context.issue.user.login,
    triggerUser: context.comment.user.login,
    isAuthor: context.issue.user.login === context.comment.user.login
  }, context)
}

module.exports = { getIssueStatus, updateIssue, createIssue, close, onRepoComment, repoURL: 'https://github.com/' + process.env.GITHUB_REPOSITORY }
const https = require('https');
const url = require('url');

const JIRA_BASE = process.env.JIRA_BASE_URL || 'https://subex.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT = process.env.JIRA_PROJECT || 'IDT';

const AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

module.exports = async function (context, req) {
  const type = req.query.type || 'all';

  const jqlMap = {
    all:       `project = ${JIRA_PROJECT} ORDER BY updated DESC`,
    achal:     `project = ${JIRA_PROJECT} AND assignee = "${JIRA_EMAIL}" ORDER BY updated DESC`,
    others:    `project = ${JIRA_PROJECT} AND assignee != "${JIRA_EMAIL}" AND assignee is not EMPTY ORDER BY updated DESC`,
    overdue:   `project = ${JIRA_PROJECT} AND due < now() AND statusCategory != Done ORDER BY due ASC`,
  };

  const jql = jqlMap[type] || jqlMap.all;
  const fields = ['summary', 'status', 'assignee', 'duedate', 'priority', 'issuetype'];
  const maxResults = type === 'all' ? 100 : 50;

  const params = new URLSearchParams({ jql, maxResults, fields: fields.join(',') });
  const apiUrl = `${JIRA_BASE}/rest/api/3/search?${params}`;

  try {
    const data = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Accept': 'application/json',
      }
    });

    if (!data.ok) {
      context.res = {
        status: data.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Jira returned ${data.status}: ${data.statusText}` })
      };
      return;
    }

    const json = await data.json();

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(json)
    };

  } catch (err) {
    context.log.error('Jira proxy error:', err.message);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

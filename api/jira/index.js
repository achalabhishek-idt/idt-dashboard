const { app } = require('@azure/functions');

const JIRA_BASE = process.env.JIRA_BASE_URL || 'https://subex.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT = process.env.JIRA_PROJECT || 'IDT';

app.http('jira', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const type = new URL(request.url).searchParams.get('type') || 'all';
      const AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

      const jqlMap = {
        all:    `project = ${JIRA_PROJECT} ORDER BY updated DESC`,
        achal:  `project = ${JIRA_PROJECT} AND assignee = "${JIRA_EMAIL}" ORDER BY updated DESC`,
        others: `project = ${JIRA_PROJECT} AND assignee != "${JIRA_EMAIL}" AND assignee is not EMPTY ORDER BY updated DESC`,
      };

      const jql = jqlMap[type] || jqlMap.all;
      const maxResults = type === 'all' ? 100 : 50;

      const res = await fetch(`${JIRA_BASE}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${AUTH}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          jql: jql,
          maxResults: maxResults,
          fields: ['summary', 'status', 'assignee', 'duedate', 'priority']
        })
      });

      const json = await res.json();
      context.log('Jira response status:', res.status);

      return {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(json)
      };

    } catch (err) {
      context.error('Jira proxy error:', err.message);
      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: err.message })
      };
    }
  }
});

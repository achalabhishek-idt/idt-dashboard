const { app } = require('@azure/functions');

const JIRA_BASE = process.env.JIRA_BASE_URL || 'https://subex.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT = process.env.JIRA_PROJECT || 'IDT';

const AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

app.http('jira', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const type = new URL(request.url).searchParams.get('type') || 'all';

    const jqlMap = {
      all:     `project = ${JIRA_PROJECT} ORDER BY updated DESC`,
      achal:   `project = ${JIRA_PROJECT} AND assignee = "${JIRA_EMAIL}" ORDER BY updated DESC`,
      others:  `project = ${JIRA_PROJECT} AND assignee != "${JIRA_EMAIL}" AND assignee is not EMPTY ORDER BY updated DESC`,
    };

const jql = jqlMap[type] || jqlMap.all;
const maxResults = type === 'all' ? 100 : 50;

const params = new URLSearchParams({ 
  jql, 
  maxResults,
  'fields': 'summary,status,assignee,duedate,priority'
});
const apiUrl = `${JIRA_BASE}/rest/api/3/search/jql?${params}`;

    try {
      const res = await fetch(apiUrl, {
        headers: {
          'Authorization': `Basic ${AUTH}`,
          'Accept': 'application/json',
        }
      });

      const json = await res.json();

      return {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(json)
      };

    } catch (err) {
      context.error('Jira proxy error:', err.message);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message })
      };
    }
  }
});

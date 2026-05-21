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
      // Query parameter
      const type = new URL(request.url).searchParams.get('type') || 'all';

      // Basic Auth
      const AUTH = Buffer
        .from(`${JIRA_EMAIL}:${JIRA_TOKEN}`)
        .toString('base64');

      // JQL Queries
      const jqlMap = {
        all: `
          project = ${JIRA_PROJECT}
          ORDER BY updated DESC
        `,

        achal: `
          project = ${JIRA_PROJECT}
          AND assignee = "${JIRA_EMAIL}"
          ORDER BY updated DESC
        `,

        others: `
          project = ${JIRA_PROJECT}
          AND assignee != "${JIRA_EMAIL}"
          AND assignee IS NOT EMPTY
          ORDER BY updated DESC
        `
      };

      const jql = jqlMap[type] || jqlMap.all;

      // Result limit
      const maxResults = type === 'all' ? 100 : 50;

      // Jira API Call
      const res = await fetch(`${JIRA_BASE}/rest/api/3/search`, {
        method: 'POST',

        headers: {
          'Authorization': `Basic ${AUTH}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          jql,
          maxResults,

          fields: [
            'summary',
            'status',
            'assignee',
            'duedate',
            'priority'
          ]
        })
      });

      // Response
      const json = await res.json();

      context.log('Jira API Status:', res.status);

      // Handle Jira errors
      if (!res.ok) {
        context.error('Jira API Error:', json);

        return {
          status: res.status,

          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },

          body: JSON.stringify({
            success: false,
            jiraError: json
          })
        };
      }

      // Success Response
      return {
        status: 200,

        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        },

        body: JSON.stringify({
          success: true,
          total: json.total,
          issues: json.issues || []
        })
      };

    } catch (err) {

      context.error('Jira Proxy Error:', err);

      return {
        status: 500,

        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },

        body: JSON.stringify({
          success: false,
          error: err.message
        })
      };
    }
  }
});
# IDT Quality Dashboard

Live documentation quality dashboard for Subex IDT team. Pulls real data from Jira (subex.atlassian.net) via a server-side Azure Function proxy — no CORS issues, credentials never exposed in the browser.

---

## Project structure

```
idt-dashboard/
├── index.html                  ← Dashboard UI
├── staticwebapp.config.json    ← Azure SWA routing
├── .github/workflows/
│   └── deploy.yml              ← Auto-deploy on push to main
└── api/
    ├── host.json
    ├── local.settings.json     ← Local dev credentials (never commit)
    └── jira/
        ├── function.json
        └── index.js            ← Jira proxy function
```

---

## Deploy to Azure (one-time setup)

### Step 1 — Create the Azure Static Web App

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search **Static Web Apps** → **Create**
3. Fill in:
   - **Subscription**: your Subex subscription
   - **Resource Group**: create new → `idt-dashboard-rg`
   - **Name**: `idt-dashboard`
   - **Plan type**: Free
   - **Region**: Central India (closest to Bengaluru)
   - **Source**: GitHub
4. Authorize GitHub, select your repo and branch (`main`)
5. **Build details**:
   - App location: `/`
   - Api location: `api`
   - Output location: *(leave blank)*
6. Click **Review + Create**

Azure will add the GitHub Actions token to your repo automatically.

---

### Step 2 — Add Application Settings (credentials)

In the Azure portal, go to your Static Web App → **Configuration** → **Application settings**, and add:

| Name | Value |
|------|-------|
| `JIRA_BASE_URL` | `https://subex.atlassian.net` |
| `JIRA_EMAIL` | `achal.abhishek@subex.com` |
| `JIRA_API_TOKEN` | *(your Atlassian API token)* |
| `JIRA_PROJECT` | `IDT` |

Click **Save**. These are injected as environment variables into the Azure Function — never exposed to the browser.

---

### Step 3 — Push to GitHub

```bash
cd idt-dashboard
git init
git add .
git commit -m "Initial IDT dashboard"
git remote add origin https://github.com/YOUR_USERNAME/idt-dashboard.git
git push -u origin main
```

GitHub Actions will trigger automatically. Deploy takes ~2 minutes. Your dashboard will be live at the URL shown in the Azure portal (e.g. `https://idt-dashboard-abc123.azurestaticapps.net`).

---

## Local development

```bash
npm install -g @azure/static-web-apps-cli

# Fill in api/local.settings.json with your real token
swa start . --api-location api
```

Dashboard available at `http://localhost:4280`

---

## Kiosk setup (office screen)

On the display machine (Windows):

```
chrome.exe --kiosk --noerrdialogs --disable-infobars https://your-url.azurestaticapps.net
```

On Linux/Mac:
```
google-chrome --kiosk https://your-url.azurestaticapps.net
```

To prevent screen sleep on Windows: Settings → Power → Screen → Never.

---

## Refresh interval

Default: **60 seconds**. To change, edit `INTERVAL` in `index.html`:

```js
const INTERVAL = 60000; // milliseconds
```

---

## Security note

- `api/local.settings.json` contains your API token for local dev. It is listed in `.gitignore` — never commit it.
- In production, credentials live only in Azure Application Settings, never in code or the browser.

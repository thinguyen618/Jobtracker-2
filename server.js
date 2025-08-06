const express = require('express');
const { Pool } = require('pg');
const { google } = require('googleapis');
const simpleParser = require('mailparser').simpleParser;
const cors = require('cors');
const { scrapeJobDescription } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'https://jobtrackr-backend-9f1e47f25e5b.herokuapp.com/api/auth/gmail/callback'
);

// Gmail API setup
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// OAuth route
app.get('/api/auth/gmail', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  });
  res.redirect(authUrl);
});

// OAuth callback
app.post('/api/fetch-emails', async (req, res) => {
  try {
    const { code } = req.body;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:(@indeed.com | @linkedin.com | @jobs.lever.co | @careers.google.com | @jobs.netflix.com | @greenhouse.io) "application" | "applied" | "job"',
      maxResults: 10
    });

    const messages = response.data.messages || [];
    const applications = [];

    for (const message of messages) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
      const parsed = await simpleParser(msg.data.payload);
      const companyName = parsed.from.text.match(/@([\w.]+)/)?.[1]?.split('.')[0] || 'Unknown';
      let jobTitle = parsed.subject.match(/application for (.*?)(?: at|$)/i)?.[1] || parsed.subject.match(/applied - (.*)/i)?.[1] || 'Unknown';
      jobTitle = jobTitle.replace(/application|applied|job|confirmation|thank you/i, '').trim();
      const jobLinkMatch = parsed.text.match(/(https?:\/\/[^\s]+)/)?.[0] || '';
      const jobLink = jobLinkMatch.includes('jobs') ? jobLinkMatch : '';
      const dateApplied = new Date(parsed.date).toISOString().split('T')[0];

      let jobDescription = '';
      if (jobLink) {
        try {
          jobDescription = await scrapeJobDescription(jobLink);
        } catch (err) {
          console.error(`Failed to scrape ${jobLink}:`, err);
        }
      }

      const application = {
        company_name: companyName.charAt(0).toUpperCase() + companyName.slice(1),
        job_title: jobTitle,
        date_applied: dateApplied,
        status: 'applied',
        job_link: jobLink,
        job_description: jobDescription || 'No description available',
        salary_range: '',
        desired_salary: '',
        job_type: 'remote',
        source: parsed.from.text.includes('indeed') ? 'Indeed' : parsed.from.text.includes('linkedin') ? 'LinkedIn' : 'Other',
        notes: parsed.text.substring(0, 100) + '...',
        priority: 'medium'
      };

      const result = await pool.query(
        'INSERT INTO applications (company_name, job_title, date_applied, status, job_link, job_description, salary_range, desired_salary, job_type, source, notes, priority) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
        [application.company_name, application.job_title, application.date_applied, application.status, application.job_link, application.job_description, application.salary_range, application.desired_salary, application.job_type, application.source, application.notes, application.priority]
      );

      applications.push(result.rows[0]);
    }

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// CRUD routes
app.get('/api/applications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM applications ORDER BY date_applied DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.post('/api/applications', async (req, res) => {
  const { company_name, job_title, date_applied, status, job_link, job_description, salary_range, desired_salary, job_type, source, notes, priority } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO applications (company_name, job_title, date_applied, status, job_link, job_description, salary_range, desired_salary, job_type, source, notes, priority) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [company_name, job_title, date_applied, status, job_link, job_description, salary_range, desired_salary, job_type, source, notes, priority]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add application' });
  }
});

app.put('/api/applications/:id', async (req, res) => {
  const { id } = req.params;
  const { company_name, job_title, date_applied, status, job_link, job_description, salary_range, desired_salary, job_type, source, notes, priority } = req.body;
  try {
    const result = await pool.query(
      'UPDATE applications SET company_name=$1, job_title=$2, date_applied=$3, status=$4, job_link=$5, job_description=$6, salary_range=$7, desired_salary=$8, job_type=$9, source=$10, notes=$11, priority=$12 WHERE id=$13 RETURNING *',
      [company_name, job_title, date_applied, status, job_link, job_description, salary_range, desired_salary, job_type, source, notes, priority, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

app.delete('/api/applications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM applications WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
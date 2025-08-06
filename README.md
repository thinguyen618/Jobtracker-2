JobTrackr

A public, login-free app to track job applications by connecting to users' Gmail accounts to automatically fetch job application emails.

Features





Gmail Integration: Connect your Gmail to auto-fetch job applications from emails (e.g., from Indeed, LinkedIn).



Unlimited Entries: Add and manage unlimited job applications.



Status Colors: Applied (blue), Interviewed (orange), Offer (green), Rejected (gray).



Fields: Company, Job Title, Date, Status, Salary Range, Desired Salary, Job Type, Source, Notes, Priority, Job Link, Description.



Functionality: Filter by status, export to CSV, get follow-up reminders.



Deployment: Frontend on Netlify, backend on Heroku with PostgreSQL.

Usage





Visit [Netlify URL] (e.g., https://jobtrackr-2025.netlify.app).



Click "Connect Gmail" to authorize and fetch job application emails.



Optionally, click "Add Application" to manually add jobs.



Filter by status and export to CSV.

Setup

Frontend





Clone this repo: git clone https://github.com/thinguyen618/Jobtracker.git



Deploy to Netlify:





Connect to GitHub at app.netlify.com.



Select thinguyen618/Jobtracker, branch main, publish directory ..



Access at the provided Netlify URL.

Backend





Install Heroku CLI.



Create a Heroku app: heroku create jobtrackr-backend



Add PostgreSQL: heroku addons:create heroku-postgresql:essential-0



Set Google OAuth credentials:





In Google Cloud Console, enable Gmail API, set redirect URI to https://jobtrackr-backend.herokuapp.com/api/auth/gmail/callback.



Run:

heroku config:set CLIENT_ID=your_client_id
heroku config:set CLIENT_SECRET=your_client_secret



Deploy: git push heroku main



Run schema.sql: heroku pg:psql, paste schema content.

License

MIT

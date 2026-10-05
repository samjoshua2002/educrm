const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/admissions_crm' });
  await c.connect();

  const orgId = 'b792e747-dd0c-4c79-8a3a-7018f92ffb4b';
  const query = `
    SELECT log.id, log.application_no, log.applicant_name, log.category, log.subject, log.sent_at
    FROM communication_logs log
    WHERE (log.organization_id = $1 OR log.organization_id IS NULL)
      AND EXISTS (
        SELECT 1 FROM applications app
        WHERE LOWER(app.application_no) = LOWER(log.application_no)
          AND app.organization_id = $1
      )
    ORDER BY log.sent_at DESC
  `;
  const res = await c.query(query, [orgId]);
  console.log('Query success! Total logs:', res.rows.length);
  console.table(res.rows);
  await c.end();
}

main().catch(console.error);

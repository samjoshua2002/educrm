const pg = require('pg');

async function main() {
  const client = new pg.Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'admissions_crm'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    const res = await client.query("SELECT id, name, organization_id, is_active FROM branches");
    console.log('All Branches in DB:', res.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

main();

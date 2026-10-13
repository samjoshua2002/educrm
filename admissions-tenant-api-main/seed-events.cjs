
const pg = require('pg');

async function seed() {
  const client = new pg.Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'admissions_crm'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully');

    // 1. Check organizations
    const orgRes = await client.query('SELECT id, name FROM organizations LIMIT 5');
    console.log('Organizations found:', orgRes.rows);
    const orgId = orgRes.rows.length > 0 ? orgRes.rows[0].id : null;

    // 2. Ensure table exists (in case TypeORM synchronize hasn't run yet)
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcement_events (
        id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id         UUID,
        title                   VARCHAR(255) NOT NULL,
        type                    VARCHAR(50) NOT NULL DEFAULT 'announcement',
        category                VARCHAR(100) NOT NULL DEFAULT 'General Notice',
        priority                VARCHAR(50) NOT NULL DEFAULT 'Medium',
        status                  VARCHAR(50) NOT NULL DEFAULT 'Published',
        target_audience         JSONB NOT NULL DEFAULT '[]',
        target_course_id        VARCHAR(100),
        target_lead_stages      JSONB NOT NULL DEFAULT '[]',
        event_start_date        VARCHAR(50),
        event_end_date          VARCHAR(50),
        event_start_time        VARCHAR(50),
        event_end_time          VARCHAR(50),
        venue_type              VARCHAR(50) NOT NULL DEFAULT 'in_person',
        venue_location          TEXT,
        scheduled_publish_date  VARCHAR(50),
        scheduled_publish_time  VARCHAR(50),
        description             TEXT,
        poster_url              TEXT,
        attachment_url          TEXT,
        attachment_name         VARCHAR(255),
        attachment_type         VARCHAR(50) NOT NULL DEFAULT 'other',
        send_in_app_notification BOOLEAN NOT NULL DEFAULT TRUE,
        send_email_broadcast    BOOLEAN NOT NULL DEFAULT FALSE,
        send_whatsapp           BOOLEAN NOT NULL DEFAULT FALSE,
        email_template_id       VARCHAR(100),
        created_by_id           UUID,
        created_by_name         VARCHAR(150),
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Check existing events
    const countRes = await client.query('SELECT count(*) FROM announcement_events');
    console.log('Current announcement_events count:', countRes.rows[0].count);

    // 4. Sample items to insert
    const sampleItems = [
      {
        title: 'National Entrance Exam (Phase-I) Hall Ticket & Schedule Released',
        type: 'announcement',
        category: 'Exam',
        description: 'All registered applicants are hereby informed that the Admit Cards / Hall Tickets for Entrance Exam Phase-I have been published on the student portal. Please download and print your hall tickets before the exam day.',
        priority: 'Urgent',
        target_audience: JSON.stringify(['student', 'lead']),
        target_lead_stages: JSON.stringify(['Verified', 'Interested']),
        event_start_date: '2026-10-25',
        event_end_date: '2026-10-27',
        event_start_time: '09:30',
        event_end_time: '12:30',
        venue_type: 'in_person',
        venue_location: 'Examination Hall Complex, Main Campus',
        status: 'Published',
        scheduled_publish_date: '2026-10-15',
        scheduled_publish_time: '09:00',
        send_in_app_notification: true,
        send_email_broadcast: true,
        send_whatsapp: true,
        attachment_name: 'Exam_Guidelines_Phase1.pdf',
        attachment_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        attachment_type: 'pdf',
        poster_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
        created_by_name: 'Admissions Directorate'
      },
      {
        title: 'Virtual GD & Interview Preparation Workshop for Shortlisted Applicants',
        type: 'event',
        category: 'GD & Interview',
        description: 'A special interactive session with academic deans and career experts on how to excel in the upcoming Group Discussion and Personal Interview rounds. Mandatory for all shortlisted candidates.',
        priority: 'High',
        target_audience: JSON.stringify(['student', 'lead', 'counselor']),
        target_lead_stages: JSON.stringify(['Verified', 'Converted']),
        event_start_date: '2026-10-28',
        event_end_date: '2026-10-28',
        event_start_time: '14:00',
        event_end_time: '16:00',
        venue_type: 'virtual',
        venue_location: 'https://meet.google.com/edu-gdpi-prep-2026',
        status: 'Published',
        scheduled_publish_date: '2026-10-18',
        scheduled_publish_time: '10:00',
        send_in_app_notification: true,
        send_email_broadcast: true,
        send_whatsapp: true,
        attachment_name: 'GD_Topics_Curated_List.pdf',
        attachment_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        attachment_type: 'image',
        poster_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
        created_by_name: 'Counseling & Placement Cell'
      },
      {
        title: 'Staff Admissions Training: Lead Conversion & Verification Protocol',
        type: 'event',
        category: 'Academic',
        description: 'Internal faculty and staff briefing on updated document verification checklists, CRM status transitions, and student onboarding SLA compliance for the admission cycle.',
        priority: 'Medium',
        target_audience: JSON.stringify(['org_admin', 'counselor', 'lead_manager', 'application_manager']),
        target_lead_stages: JSON.stringify([]),
        event_start_date: '2026-11-02',
        event_end_date: '2026-11-02',
        event_start_time: '11:00',
        event_end_time: '13:00',
        venue_type: 'in_person',
        venue_location: 'Conference Hall 2, Administration Wing',
        status: 'Scheduled',
        scheduled_publish_date: '2026-10-20',
        scheduled_publish_time: '09:00',
        send_in_app_notification: true,
        send_email_broadcast: true,
        send_whatsapp: false,
        attachment_name: 'Verification_SOP_v2.pdf',
        attachment_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        attachment_type: 'pdf',
        poster_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
        created_by_name: 'Chief Operating Officer'
      },
      {
        title: 'Campus Open House & Interaction with Faculty Deans',
        type: 'event',
        category: 'Campus Event',
        description: 'Prospective students and their parents are invited for an on-campus tour, lab visits, live robotics demo, and direct Q&A session with department heads.',
        priority: 'Low',
        target_audience: JSON.stringify(['lead', 'student']),
        target_lead_stages: JSON.stringify(['New', 'Contacted', 'Interested']),
        event_start_date: '2026-11-10',
        event_end_date: '2026-11-10',
        event_start_time: '10:00',
        event_end_time: '15:30',
        venue_type: 'in_person',
        venue_location: 'Main Quadrangle & Central Library',
        status: 'Draft',
        scheduled_publish_date: '2026-11-01',
        scheduled_publish_time: '08:00',
        send_in_app_notification: true,
        send_email_broadcast: true,
        send_whatsapp: true,
        attachment_name: 'Campus_Tour_Map.pdf',
        attachment_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        attachment_type: 'pdf',
        poster_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
        created_by_name: 'Admissions Outreach Team'
      },
      {
        title: 'Upcoming National Holiday: University Offices Closed on Monday',
        type: 'announcement',
        category: 'General Notice',
        description: 'All university administrative offices, counseling desks, and student help centers will remain closed for Diwali festivities. Normal operations resume on Tuesday.',
        priority: 'Medium',
        target_audience: JSON.stringify(['student', 'lead', 'counselor', 'org_admin']),
        target_lead_stages: JSON.stringify([]),
        event_start_date: '2026-11-01',
        event_end_date: '2026-11-01',
        venue_type: 'in_person',
        venue_location: 'Campus Wide',
        status: 'Published',
        scheduled_publish_date: '2026-10-12',
        scheduled_publish_time: '08:00',
        send_in_app_notification: true,
        send_email_broadcast: false,
        send_whatsapp: false,
        attachment_name: 'Holiday_Notice_Circular.pdf',
        attachment_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        attachment_type: 'pdf',
        poster_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
        created_by_name: 'Registrar Office'
      }
    ];

    // Insert for each organization found, plus global (organization_id = null)
    const targetOrgs = orgRes.rows.map(r => r.id);
    if (!targetOrgs.includes(null)) targetOrgs.push(null);

    for (const targetOrgId of targetOrgs) {
      for (const item of sampleItems) {
        await client.query(`
          INSERT INTO announcement_events (
            organization_id, title, type, category, description, priority,
            target_audience, target_lead_stages, event_start_date, event_end_date,
            event_start_time, event_end_time, venue_type, venue_location, status,
            scheduled_publish_date, scheduled_publish_time, send_in_app_notification,
            send_email_broadcast, send_whatsapp, attachment_name, attachment_url,
            attachment_type, poster_url, created_by_name
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
          )
        `, [
          targetOrgId, item.title, item.type, item.category, item.description, item.priority,
          item.target_audience, item.target_lead_stages, item.event_start_date, item.event_end_date,
          item.event_start_time, item.event_end_time, item.venue_type, item.venue_location, item.status,
          item.scheduled_publish_date, item.scheduled_publish_time, item.send_in_app_notification,
          item.send_email_broadcast, item.send_whatsapp, item.attachment_name, item.attachment_url,
          item.attachment_type, item.poster_url, item.created_by_name
        ]);
      }
    }

    const finalCount = await client.query('SELECT count(*) FROM announcement_events');
    console.log(`Seeding complete! Total events in database now: ${finalCount.rows[0].count}`);
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await client.end();
  }
}

seed();

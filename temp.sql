DO $$
DECLARE
  org_id UUID := 'b792e747-dd0c-4c79-8a3a-7018f92ffb4b';
  user_ids UUID[];
  branch_ids UUID[];
  course_ids UUID[];
  first_names VARCHAR[] := ARRAY['Aarav', 'Neha', 'Rohan', 'Priya', 'Vikram'];
  last_names VARCHAR[] := ARRAY['Sharma', 'Gupta', 'Patel', 'Reddy', 'Singh'];
  cities VARCHAR[] := ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune'];
  states VARCHAR[] := ARRAY['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Maharashtra'];
  utm_mediums VARCHAR[] := ARRAY['Social', 'Email', 'CPC', 'Organic', 'Social'];
  utm_campaigns VARCHAR[] := ARRAY['Spring 2026', 'Fall 2025', 'Summer 2025', 'Winter 2025', 'Spring 2025'];
  assigned_user UUID;
  assigned_branch UUID;
  assigned_course UUID;
  i INT;
BEGIN
  SELECT array_agg(id) INTO user_ids FROM users WHERE organization_id = org_id;
  SELECT array_agg(id) INTO branch_ids FROM branches WHERE organization_id = org_id;
  SELECT array_agg(id) INTO course_ids FROM courses WHERE organization_id = org_id;

  FOR i IN 1..5 LOOP
    assigned_user := user_ids[floor(random() * array_length(user_ids, 1) + 1)];
    assigned_branch := branch_ids[floor(random() * array_length(branch_ids, 1) + 1)];
    assigned_course := course_ids[floor(random() * array_length(course_ids, 1) + 1)];

    INSERT INTO leads (
      organization_id, branch_id, course_id, assigned_to, 
      first_name, last_name, email, phone, city, state,
      source, utm_medium, utm_campaign, status, created_at, assigned_at
    ) VALUES (
      org_id, assigned_branch, assigned_course, assigned_user,
      first_names[i], last_names[i], 
      lower(first_names[i]) || '.' || lower(last_names[i]) || floor(random() * 100) || '@example.com', 
      '98' || lpad((random() * 99999999)::int::text, 8, '0'),
      cities[i], states[i],
      'Website', utm_mediums[i], utm_campaigns[i],
      (ARRAY['unverified', 'verified', 'in_progress', 'converted', 'closed'])[floor(random() * 5 + 1)],
      NOW() - (random() * interval '10 days'),
      NOW() - (random() * interval '10 days')
    );
  END LOOP;
END $$;

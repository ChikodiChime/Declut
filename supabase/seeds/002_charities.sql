-- supabase/seeds/002_charities.sql
insert into public.charities (name, description) values
  ('Lagos Food Bank Initiative',    'Provides food to vulnerable families across Lagos State'),
  ('Smile Foundation Nigeria',      'Supporting underprivileged children with education and healthcare'),
  ('Sickle Cell Foundation Nigeria','Improving quality of life for people living with sickle cell disease'),
  ('Kucheli Foundation',            'Empowering rural communities in northern Nigeria'),
  ('Reach Out To Africa (ROTA)',    'Supplying essential clothing and goods to displaced families')
on conflict (name) do nothing;

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(120) NOT NULL,
  department VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL
);

CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(30) NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  UNIQUE (employee_id, date)
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  detail TEXT NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INT,
  attachment_name VARCHAR(255),
  attachment_data TEXT
);

INSERT INTO employees (name, role, department, email, status)
VALUES
  ('Ava Carter', 'Project Manager', 'Operations', 'ava.carter@company.com', 'Active'),
  ('Noah Brooks', 'Frontend Developer', 'Engineering', 'noah.brooks@company.com', 'Remote'),
  ('Emma Walker', 'HR Specialist', 'People Ops', 'emma.walker@company.com', 'Active');

INSERT INTO attendance (employee_id, date, status, clock_in, clock_out)
VALUES
  (1, '2026-08-05', 'Present', '2026-08-05T08:57:00Z', '2026-08-05T17:12:00Z'),
  (2, '2026-08-05', 'Present', '2026-08-05T09:04:00Z', '2026-08-05T17:36:00Z'),
  (3, '2026-08-05', 'Late', '2026-08-05T09:42:00Z', '2026-08-05T18:01:00Z');

INSERT INTO tasks (employee_id, title, detail, due_date, status)
VALUES
  (1, 'Review project priorities', 'Prepare the operations update for the team meeting.', '2026-08-12', 'Pending'),
  (2, 'Fix responsive navigation', 'Resolve the mobile navigation issues in the dashboard.', '2026-08-11', 'In Progress'),
  (3, 'Prepare onboarding checklist', 'Share the updated checklist with People Ops.', '2026-08-14', 'Pending');

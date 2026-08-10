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
  status VARCHAR(30) NOT NULL
);

INSERT INTO employees (name, role, department, email, status)
VALUES
  ('Ava Carter', 'Project Manager', 'Operations', 'ava.carter@company.com', 'Active'),
  ('Noah Brooks', 'Frontend Developer', 'Engineering', 'noah.brooks@company.com', 'Remote'),
  ('Emma Walker', 'HR Specialist', 'People Ops', 'emma.walker@company.com', 'Active');

INSERT INTO attendance (employee_id, date, status)
VALUES
  (1, '2026-08-05', 'Present'),
  (2, '2026-08-05', 'Present'),
  (3, '2026-08-05', 'Late');

const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const seedEmployees = [
  { id: 1, name: 'Ava Carter', role: 'Project Manager', department: 'Operations', email: 'ava.carter@company.com', birthDate: '1991-08-12', shiftStart: '09:00', shiftEnd: '18:00', status: 'Active' },
  { id: 2, name: 'Noah Brooks', role: 'Frontend Developer', department: 'Engineering', email: 'noah.brooks@company.com', birthDate: '1994-08-18', shiftStart: '09:00', shiftEnd: '18:00', status: 'Remote' },
  { id: 3, name: 'Emma Walker', role: 'HR Specialist', department: 'People Ops', email: 'emma.walker@company.com', birthDate: '1992-09-03', shiftStart: '09:30', shiftEnd: '18:30', status: 'Active' }
];

function buildDemoAttendance() {
  const records = [];
  const cursor = new Date(2026, 6, 1);
  const end = new Date();
  let id = 1;
  let workday = 0;
  while (cursor <= end) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      const timestamp = (time) => `${date}T${time}:00.000Z`;
      records.push({ id: id++, employeeId: 1, date, status: 'Present', clockIn: timestamp('08:55'), clockOut: timestamp('17:30') });
      records.push({ id: id++, employeeId: 2, date, status: workday % 5 === 0 ? 'Late' : 'Present', clockIn: timestamp(workday % 5 === 0 ? '09:20' : '08:58'), clockOut: timestamp('17:35') });
      records.push({ id: id++, employeeId: 3, date, status: workday % 7 === 0 ? 'Absent' : 'Present', clockIn: workday % 7 === 0 ? null : timestamp('09:20'), clockOut: workday % 7 === 0 ? null : timestamp('18:10') });
      workday++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return records;
}

const seedAttendance = buildDemoAttendance();

const seedTasks = [
  { id: 1, employeeId: 1, title: 'Review project priorities', detail: 'Prepare the operations update for the team meeting.', dueDate: '2026-08-12', status: 'Pending', startedAt: null, completedAt: null, durationMinutes: null, attachmentName: null, attachmentData: null },
  { id: 2, employeeId: 2, title: 'Fix responsive navigation', detail: 'Resolve the mobile navigation issues in the dashboard.', dueDate: '2026-08-11', status: 'In Progress', startedAt: '2026-08-10T08:30:00.000Z', completedAt: null, durationMinutes: null, attachmentName: null, attachmentData: null },
  { id: 3, employeeId: 3, title: 'Prepare onboarding checklist', detail: 'Share the updated checklist with People Ops.', dueDate: '2026-08-14', status: 'Pending', startedAt: null, completedAt: null, durationMinutes: null, attachmentName: null, attachmentData: null }
];

function createPool(databaseName = process.env.DB_NAME || 'postgres') {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }

  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    return new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: databaseName,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }

  return null;
}

const pool = createPool();
let databaseMode = 'memory';
let databaseReady = false;

async function ensureDatabaseExists() {
  if (!pool) {
    return false;
  }

  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    if (!/does not exist|database .* does not exist/i.test(error.message)) {
      throw error;
    }

    const adminPool = createPool('postgres');
    if (!adminPool) {
      throw error;
    }

    try {
      await adminPool.query(`CREATE DATABASE "${process.env.DB_NAME || 'employemanagement'}"`);
      return true;
    } finally {
      await adminPool.end();
    }
  }
}

async function initializeDatabase() {
  if (!pool) {
    console.log('No database configuration found. Using in-memory storage.');
    return;
  }

  try {
    const databaseExists = await ensureDatabaseExists();
    if (!databaseExists) {
      throw new Error('Unable to verify database availability.');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        role VARCHAR(120) NOT NULL,
        department VARCHAR(120) NOT NULL,
        email VARCHAR(120) NOT NULL,
        phone VARCHAR(40),
        birth_date DATE,
        shift_start TIME NOT NULL DEFAULT '09:00',
        shift_end TIME NOT NULL DEFAULT '18:00',
        password VARCHAR(255) NOT NULL DEFAULT 'employee123',
        status VARCHAR(30) NOT NULL
      );
    `);
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone VARCHAR(40)');
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_date DATE');
    await pool.query(`
      UPDATE employees SET birth_date = CASE email
        WHEN 'ava.carter@company.com' THEN '1991-08-12'
        WHEN 'noah.brooks@company.com' THEN '1994-08-18'
        WHEN 'emma.walker@company.com' THEN '1992-09-03'
        ELSE birth_date
      END
      WHERE birth_date IS NULL
    `);
    await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_start TIME NOT NULL DEFAULT '09:00'");
    await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_end TIME NOT NULL DEFAULT '18:00'");
    await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'employee123'");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(30) NOT NULL,
        clock_in TIMESTAMPTZ,
        clock_out TIMESTAMPTZ,
        UNIQUE (employee_id, date)
      );
    `);
    await pool.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS clock_in TIMESTAMPTZ');
    await pool.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_date_idx ON attendance(employee_id, date)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
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
    `);
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ');
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ');
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_minutes INT');
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)');
    await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_data TEXT');

    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM employees');
    if (rows[0].count === 0) {
      await pool.query(
        `INSERT INTO employees (name, role, department, email, birth_date, status)
         VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12), ($13, $14, $15, $16, $17, $18)`,
        [
          'Ava Carter', 'Project Manager', 'Operations', 'ava.carter@company.com', '1991-08-12', 'Active',
          'Noah Brooks', 'Frontend Developer', 'Engineering', 'noah.brooks@company.com', '1994-08-18', 'Remote',
          'Emma Walker', 'HR Specialist', 'People Ops', 'emma.walker@company.com', '1992-09-03', 'Active'
        ]
      );

      await pool.query(
        `INSERT INTO attendance (employee_id, date, status, clock_in, clock_out)
         VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15)`,
        [1, '2026-08-05', 'Present', '2026-08-05T08:57:00Z', '2026-08-05T17:12:00Z', 2, '2026-08-05', 'Present', '2026-08-05T09:04:00Z', '2026-08-05T17:36:00Z', 3, '2026-08-05', 'Late', '2026-08-05T09:42:00Z', '2026-08-05T18:01:00Z']
      );
    }

    await pool.query(`
      INSERT INTO employees (name, role, department, email, birth_date, shift_start, shift_end, status)
      SELECT $1, $2, $3, $4, $5, $6, $7, $8
      WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = $4)
    `, ['Liam Phillips', 'QA Engineer', 'Engineering', 'liam.phillips@company.com', '1990-10-22', '09:00', '18:00', 'On Leave']);
    await pool.query(`
      INSERT INTO employees (name, role, department, email, birth_date, shift_start, shift_end, status)
      SELECT $1, $2, $3, $4, $5, $6, $7, $8
      WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = $4)
    `, ['Sophia Turner', 'Business Analyst', 'Sales', 'sophia.turner@company.com', '1995-12-07', '10:00', '19:00', 'Active']);
    await pool.query(`
      INSERT INTO employees (name, role, department, email, birth_date, shift_start, shift_end, status)
      SELECT $1, $2, $3, $4, $5, $6, $7, $8
      WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = $4)
    `, ['Mason Reed', 'Backend Developer', 'Engineering', 'mason.reed@company.com', '1993-01-15', '09:00', '18:00', 'Remote']);

    const employeeRows = await pool.query('SELECT id, email FROM employees');
    const employeeIds = new Map(employeeRows.rows.map((employee) => [employee.email, employee.id]));
    const emailsBySeedId = { 1: 'ava.carter@company.com', 2: 'noah.brooks@company.com', 3: 'emma.walker@company.com' };
    for (const record of seedAttendance) {
      const employeeId = employeeIds.get(emailsBySeedId[record.employeeId]);
      if (!employeeId) continue;
      await pool.query(
        `INSERT INTO attendance (employee_id, date, status, clock_in, clock_out)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (employee_id, date) DO NOTHING`,
        [employeeId, record.date, record.status, record.clockIn, record.clockOut]
      );
    }

    const taskCount = await pool.query('SELECT COUNT(*)::int AS count FROM tasks');
    if (taskCount.rows[0].count === 0) {
      await pool.query(
        `INSERT INTO tasks (employee_id, title, detail, due_date, status, started_at)
         VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12), ($13, $14, $15, $16, $17, $18)`,
        [1, seedTasks[0].title, seedTasks[0].detail, seedTasks[0].dueDate, seedTasks[0].status, seedTasks[0].startedAt, 2, seedTasks[1].title, seedTasks[1].detail, seedTasks[1].dueDate, seedTasks[1].status, seedTasks[1].startedAt, 3, seedTasks[2].title, seedTasks[2].detail, seedTasks[2].dueDate, seedTasks[2].status, seedTasks[2].startedAt]
      );
    }

    databaseMode = 'postgres';
    databaseReady = true;
    console.log('Database connection established.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    databaseMode = 'memory';
    databaseReady = false;
  }
}

async function getEmployees() {
  if (!pool || !databaseReady) {
    return seedEmployees;
  }

  const result = await pool.query('SELECT id, name, role, department, email, phone, password, birth_date AS "birthDate", shift_start::text AS "shiftStart", shift_end::text AS "shiftEnd", status FROM employees ORDER BY id');
  return result.rows;
}

async function getAttendance() {
  if (!pool || !databaseReady) {
    return seedAttendance;
  }

  const result = await pool.query(
        `SELECT a.id, a.employee_id AS "employeeId", a.date, a.status,
          a.clock_in AS "clockIn", a.clock_out AS "clockOut"
     FROM attendance a
     ORDER BY a.date DESC, a.id`
  );

  return result.rows;
}

app.get('/api/employees', async (req, res) => {
  const employees = await getEmployees();
  res.json(employees);
});

app.get('/api/attendance', async (req, res) => {
  const attendance = await getAttendance();
  res.json(attendance);
});

app.get('/api/tasks', async (req, res) => {
  if (!pool || !databaseReady) return res.json(seedTasks);
  const result = await pool.query(
        `SELECT id, employee_id AS "employeeId", title, detail, due_date AS "dueDate", status,
          started_at AS "startedAt", completed_at AS "completedAt", duration_minutes AS "durationMinutes",
          attachment_name AS "attachmentName", attachment_data AS "attachmentData"
     FROM tasks ORDER BY due_date ASC, id ASC`
  );
  res.json(result.rows);
});

app.post('/api/tasks', async (req, res) => {
  const { employeeId, title, detail, dueDate, status = 'Pending' } = req.body;
  if (!pool || !databaseReady) {
    const task = { id: Date.now(), employeeId: Number(employeeId), title, detail, dueDate, status, startedAt: null, completedAt: null, durationMinutes: null, attachmentName: null, attachmentData: null };
    seedTasks.push(task);
    return res.status(201).json(task);
  }
  const result = await pool.query(
    `INSERT INTO tasks (employee_id, title, detail, due_date, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, employee_id AS "employeeId", title, detail, due_date AS "dueDate", status,
       started_at AS "startedAt", completed_at AS "completedAt", duration_minutes AS "durationMinutes",
       attachment_name AS "attachmentName", attachment_data AS "attachmentData"`,
    [employeeId, title, detail, dueDate, status]
  );
  res.status(201).json(result.rows[0]);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status, startedAt, completedAt, durationMinutes, attachmentName, attachmentData } = req.body;
  if (!pool || !databaseReady) {
    const task = seedTasks.find((item) => item.id === Number(id));
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    Object.assign(task, { status, startedAt, completedAt, durationMinutes, attachmentName, attachmentData });
    return res.json(task);
  }
  const result = await pool.query(
    `UPDATE tasks SET status = $1, started_at = $2, completed_at = $3, duration_minutes = $4,
       attachment_name = $5, attachment_data = $6 WHERE id = $7
     RETURNING id, employee_id AS "employeeId", title, detail, due_date AS "dueDate", status,
       started_at AS "startedAt", completed_at AS "completedAt", duration_minutes AS "durationMinutes",
       attachment_name AS "attachmentName", attachment_data AS "attachmentData"`,
    [status, startedAt, completedAt, durationMinutes, attachmentName, attachmentData, id]
  );
  res.json(result.rows[0]);
});

app.post('/api/attendance/clock', async (req, res) => {
  const { employeeId, clockIn, status = 'Present' } = req.body;
  const now = new Date().toISOString();
  const date = now.slice(0, 10);

  if (!pool || !databaseReady) {
    const index = seedAttendance.findIndex((record) => record.employeeId === Number(employeeId) && record.date === date);
    const record = index >= 0 ? { ...seedAttendance[index] } : { id: Date.now(), employeeId: Number(employeeId), date, status, clockIn: null, clockOut: null };
    record.status = status;
    if (clockIn) record.clockIn = now;
    else record.clockOut = now;
    if (index >= 0) seedAttendance[index] = record;
    else seedAttendance.unshift(record);
    return res.json(record);
  }

  const result = await pool.query(
    `INSERT INTO attendance (employee_id, date, status, clock_in, clock_out)
     VALUES ($1, $2, $3, CASE WHEN $4 THEN $5 ELSE NULL END, CASE WHEN $4 THEN NULL ELSE $5 END)
     ON CONFLICT (employee_id, date) DO UPDATE SET
       clock_in = CASE WHEN $4 THEN EXCLUDED.clock_in ELSE attendance.clock_in END,
       clock_out = CASE WHEN $4 THEN NULL ELSE EXCLUDED.clock_out END,
       status = EXCLUDED.status
     RETURNING id, employee_id AS "employeeId", date, status, clock_in AS "clockIn", clock_out AS "clockOut"`,
    [employeeId, date, status, Boolean(clockIn), now]
  );
  res.json(result.rows[0]);
});

app.post('/api/employees', async (req, res) => {
  const employee = req.body;

  if (!pool || !databaseReady) {
    seedEmployees.push({
      id: seedEmployees.length + 1,
      ...employee
    });
    return res.status(201).json({ message: 'Employee created in memory.', data: employee });
  }

  const result = await pool.query(
    `INSERT INTO employees (name, role, department, email, phone, birth_date, shift_start, shift_end, password, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, name, role, department, email, phone, password, birth_date AS "birthDate", shift_start::text AS "shiftStart", shift_end::text AS "shiftEnd", status`,
      [employee.name, employee.role, employee.department, employee.email, employee.phone ?? null, employee.birthDate || null, employee.shiftStart || '09:00', employee.shiftEnd || '18:00', employee.password ?? 'employee123', employee.status]
  );

  res.status(201).json(result.rows[0]);
});

app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const companyEmployee = req.body;

  if (!pool || !databaseReady) {
    const index = seedEmployees.findIndex((employee) => employee.id === Number(id));
    if (index >= 0) {
      seedEmployees[index] = { ...seedEmployees[index], ...companyEmployee };
      return res.json({ message: 'Employee updated in memory.', data: seedEmployees[index] });
    }
    return res.status(404).json({ message: 'Employee not found.' });
  }

  const result = await pool.query(
    `UPDATE employees
     SET name = $1, role = $2, department = $3, email = $4, phone = $5, birth_date = $6, shift_start = $7, shift_end = $8, password = $9, status = $10
     WHERE id = $11
     RETURNING id, name, role, department, email, phone, password, birth_date AS "birthDate", shift_start::text AS "shiftStart", shift_end::text AS "shiftEnd", status`,
      [companyEmployee.name, companyEmployee.role, companyEmployee.department, companyEmployee.email, companyEmployee.phone ?? null, companyEmployee.birthDate || null, companyEmployee.shiftStart || '09:00', companyEmployee.shiftEnd || '18:00', companyEmployee.password ?? 'employee123', companyEmployee.status, id]
  );

  res.json(result.rows[0]);
});

app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;

  if (!pool || !databaseReady) {
    const index = seedEmployees.findIndex((employee) => employee.id === Number(id));
    if (index >= 0) {
      seedEmployees.splice(index, 1);
      return res.json({ message: 'Employee deleted from memory.' });
    }
    return res.status(404).json({ message: 'Employee not found.' });
  }

  await pool.query('DELETE FROM employees WHERE id = $1', [id]);
  res.json({ message: 'Employee deleted.' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: databaseMode, connected: databaseReady });
});

initializeDatabase();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Employee API listening on port ${port}`);
});

const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const seedEmployees = [
  { id: 1, name: 'Ava Carter', role: 'Project Manager', department: 'Operations', email: 'ava.carter@company.com', status: 'Active' },
  { id: 2, name: 'Noah Brooks', role: 'Frontend Developer', department: 'Engineering', email: 'noah.brooks@company.com', status: 'Remote' },
  { id: 3, name: 'Emma Walker', role: 'HR Specialist', department: 'People Ops', email: 'emma.walker@company.com', status: 'Active' }
];

const seedAttendance = [
  { id: 1, employeeId: 1, date: '2026-08-05', status: 'Present' },
  { id: 2, employeeId: 2, date: '2026-08-05', status: 'Present' },
  { id: 3, employeeId: 3, date: '2026-08-05', status: 'Late' }
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
        status VARCHAR(30) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(30) NOT NULL
      );
    `);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM employees');
    if (rows[0].count === 0) {
      await pool.query(
        `INSERT INTO employees (name, role, department, email, status)
         VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15)`,
        [
          'Ava Carter', 'Project Manager', 'Operations', 'ava.carter@company.com', 'Active',
          'Noah Brooks', 'Frontend Developer', 'Engineering', 'noah.brooks@company.com', 'Remote',
          'Emma Walker', 'HR Specialist', 'People Ops', 'emma.walker@company.com', 'Active'
        ]
      );

      await pool.query(
        `INSERT INTO attendance (employee_id, date, status)
         VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)`,
        [1, '2026-08-05', 'Present', 2, '2026-08-05', 'Present', 3, '2026-08-05', 'Late']
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

  const result = await pool.query('SELECT * FROM employees ORDER BY id');
  return result.rows;
}

async function getAttendance() {
  if (!pool || !databaseReady) {
    return seedAttendance;
  }

  const result = await pool.query(
    `SELECT a.id, a.employee_id AS "employeeId", a.date, a.status
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
    `INSERT INTO employees (name, role, department, email, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [employee.name, employee.role, employee.department, employee.email, employee.status]
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
     SET name = $1, role = $2, department = $3, email = $4, status = $5
     WHERE id = $6
     RETURNING *`,
    [companyEmployee.name, companyEmployee.role, companyEmployee.department, companyEmployee.email, companyEmployee.status, id]
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

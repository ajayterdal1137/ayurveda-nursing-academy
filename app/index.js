const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/', async (req, res) => {
  let dbStatus = 'not configured';
  if (process.env.DATABASE_URL) {
    try {
      const result = await pool.query('SELECT NOW()');
      dbStatus = `ok (now=${result.rows[0].now})`;
    } catch (err) {
      dbStatus = `error: ${err.message}`;
    }
  }

  res.json({
    app: 'Emergents - Ayurveda Nursing Academy (example)',
    db: dbStatus
  });
});

app.listen(port, () => {
  console.log(`ENA example web listening on port ${port}`);
});

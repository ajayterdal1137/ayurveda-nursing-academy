const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      video_url TEXT
    );
  `);

  const res = await pool.query('SELECT COUNT(*) FROM courses');
  const count = parseInt(res.rows[0].count, 10);
  if (count === 0) {
    // seed sample data
    const course1 = await pool.query(
      `INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING id`,
      ['Introduction to Ayurveda Nursing', 'Foundational course covering Ayurveda principles and nursing fundamentals.']
    );
    const course1Id = course1.rows[0].id;
    await pool.query(
      `INSERT INTO lessons (course_id, title, content, video_url) VALUES ($1, $2, $3, $4)`,
      [course1Id, 'Lesson 1: History and Principles', 'Overview of history and core principles of Ayurveda.', '']
    );
    await pool.query(
      `INSERT INTO lessons (course_id, title, content, video_url) VALUES ($1, $2, $3, $4)`,
      [course1Id, 'Lesson 2: Basic Nursing Care', 'Basic nursing care in an Ayurvedic context.', '']
    );

    const course2 = await pool.query(
      `INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING id`,
      ['Herbal Treatments & Preparations', 'Practical guide to common Ayurvedic herbs and their preparations.']
    );
    const course2Id = course2.rows[0].id;
    await pool.query(
      `INSERT INTO lessons (course_id, title, content, video_url) VALUES ($1, $2, $3, $4)`,
      [course2Id, 'Lesson 1: Common Herbs', 'Identification and uses of common Ayurvedic herbs.', '']
    );
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/courses', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title, description FROM courses ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const courseRes = await pool.query('SELECT id, title, description FROM courses WHERE id = $1', [id]);
    if (courseRes.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    const course = courseRes.rows[0];
    const lessonsRes = await pool.query('SELECT id, title, content, video_url FROM lessons WHERE course_id = $1 ORDER BY id', [id]);
    course.lessons = lessonsRes.rows;
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enroll', async (req, res) => {
  const { userName, courseId } = req.body || {};
  if (!userName || !courseId) return res.status(400).json({ error: 'userName and courseId required' });
  // For demo purposes we don't persist enrollments; just acknowledge.
  res.json({ status: 'enrolled', user: userName, courseId });
});

// Serve index.html for root (static middleware will handle it)

(async () => {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`ENA example web listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();

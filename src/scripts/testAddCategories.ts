// src/scripts/devAddCategories.ts
import { addCategories } from '../services/categoryService';
import { pool } from '../db/postgres';

(async () => {
  try {
    // 1️⃣ Try inserting a few category names
    const inserted = await addCategories(['sandbox-a', 'sandbox-b', 'sandbox-c']);
    console.log('🟢 Inserted rows:', inserted);

    // 2️⃣ Query to see everything currently in the table
    const { rows: all } = await pool.query('SELECT id, text FROM categories ORDER BY text');
    console.log('📋 Current categories:', all);
  } catch (err) {
    console.error('🔴 Error:', err);
  } finally {
    await pool.end(); // cleanly close the PG connection
  }
})();

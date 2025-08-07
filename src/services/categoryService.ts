import { getPool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import type { Category } from '../types/types';

export const addCategories = async (categories: string[]): Promise<Category[]> => {
  const pool = getPool();
  try {
    const values: string[] = [];
    const placeholders: string[] = [];

    categories.forEach((cat, i) => {
      const index = i * 2;
      const id = uuidv4();
      placeholders.push(`($${index + 1}, $${index + 2})`);
      values.push(id, cat);
    });

    const query = `
        INSERT INTO categories (id, text)
        VALUES ${placeholders.join(', ')}
        RETURNING id, text
    `;

    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

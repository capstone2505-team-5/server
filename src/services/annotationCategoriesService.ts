import { pool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import type { CategorizedAnnotation, CategorizedSpan, CategoryWithId, Annotation } from '../types/types';

export const addCategoriesToAnnotations = async (categoriesWithIds: CategoryWithId[], fullAnnotations: Annotation[], categorizedSpans: CategorizedSpan[]): Promise<CategorizedAnnotation[]> => {
  try {
    const catMap = mapCategories(categoriesWithIds);
    const annMap = mapAnnotations(fullAnnotations);

    const values: string[] = [];
    const placeholders: string[] = [];
    let index = 1;

    categorizedSpans.forEach(({ spanId, categories }) => {
      const annId = annMap.get(spanId);
      categories.forEach(category => {
        const catId = catMap.get(category); 
        const id = uuidv4();
        placeholders.push(`($${index}, $${index+1}, $${index+2})`);
        values.push(id, annId as string, catId as string);
        index = index + 3;
      });
    });

    const query = `
      INSERT INTO annotation_categories (id, annotation_id, category_id)
      VALUES ${placeholders.join(', ')}
      RETURNING id, annotation_id, category_id
    `;

    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

const mapCategories = (categoriesWithIds: CategoryWithId[]): Map<string, string> => {
  return new Map(categoriesWithIds.map(({ id, text }) => {
      return [text, id] as const;
    })
  );
};

const mapAnnotations = (fullAnnotations: Annotation[]): Map<string, string> => {
    return new Map(fullAnnotations.map(({ spanId, id }) => {
      return [spanId, id] as const;
    })
  );
}


/*
CategorizedTrace {
  traceId: string;
  categories: string[];
}

fullAnnotations: 
{
  id: string;
  traceId: string;
  note: string;
  rating: Rating;
  categories: string[];
}

CategoryWithId {
  id: string;
  text: string;
}

*/
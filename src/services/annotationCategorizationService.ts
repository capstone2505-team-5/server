import { getPool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import type { CategorizedAnnotation, CategorizedRootSpan, Category, Annotation } from '../types/types';
import { getAnnotationsByBatch, clearCategoriesFromAnnotations } from './annotationService';
import { openai } from '../lib/openaiClient';
import { addCategories } from './categoryService';
import { OpenAIError } from '../errors/errors';
import { jsonCleanup } from '../utils/jsonCleanup'
import { Result } from 'pg';

interface CategorizeResult {
  [key: string]: number;
}

// categorizes all bad annotations in one batch
export const categorizeBatch = async (batchId: string): Promise<CategorizeResult> => {

  const countAndFormat = (categorizedRootSpans: CategorizedRootSpan[]): CategorizeResult => {
    const result: CategorizeResult = {};

    const categories = categorizedRootSpans.map(crs => crs.categories).flat();

    categories.forEach(category => {
      if (result[category] === undefined) {
        result[category] = 1;
      } else {
        result[category] += 1;
      }
    });

    return result;
  }

  try {
    const batchAnnotations = await getAnnotationsByBatch(batchId);
    console.log("batch annotations:", batchAnnotations); //de
    const badBatchAnnotations = batchAnnotations.filter(a => a.rating === 'bad');

    if (badBatchAnnotations.length < 1) {
      return {};
    }

    const annotationIds = badBatchAnnotations.map(a => a.id)
    await clearCategoriesFromAnnotations(annotationIds);
    
    const notes = pullNotes(badBatchAnnotations);
    const notesWithRootSpanIds = pullNotesWithRootSpanId(badBatchAnnotations);

    const categories = await createCategories(notes);
    const categoriesWithIds = await addCategories(categories);
    const categorizedRootSpans = await getCategorizedRootSpans(
      categories, 
      notesWithRootSpanIds,
    );
    await addCategoriesToAnnotations(
      categoriesWithIds, 
      badBatchAnnotations, 
      categorizedRootSpans
    );

    console.log(categorizedRootSpans)
    return countAndFormat(categorizedRootSpans);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// categorizedRootSpans contains root spans each paired with their own array of categories
// each root span/category pair is added to the join table annotation_categories
export const addCategoriesToAnnotations = async (
  categories: Category[], // Used to get categoryId from category text
  annotations: Annotation[], // Used to get annotation Id from the RootSpanId
  categorizedRootSpans: CategorizedRootSpan[] // RootSpanId with categories to apply
): Promise<CategorizedAnnotation[]> => {
  const pool = getPool();
  try {
    const catMap = mapCategories(categories);
    const annMap = mapAnnotations(annotations);

    const values: string[] = [];
    const placeholders: string[] = [];
    let index = 1;

    categorizedRootSpans.forEach(({ rootSpanId, categories }) => {
      const annId = annMap.get(rootSpanId);
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

const mapCategories = (categoriesWithIds: Category[]): Map<string, string> => {
  return new Map(categoriesWithIds.map(({ id, text }) => {
      return [text, id] as const;
    })
  );
};

const mapAnnotations = (annotations: Annotation[]): Map<string, string> => {
    return new Map(annotations.map(({ rootSpanId, id }) => {
      return [rootSpanId, id] as const;
    })
  );
}

export const createCategories = async (notes: string[]): Promise<string[]> => {
  const systemPrompt = `
  You are an AI assistant helping with error analysis.
  Group similar annotation notes into failure-mode categories.
  Return ONLY a valid JSON array of strings, no markdown fences.
  Example: ["poor spelling","too much food temperature"]
  `.trim();

  let raw: string;
  try {
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: notes.join('\n') },
        ],
      },
      { timeout: 15_000 },
    );

    raw = completion.choices[0].message.content ?? '';
  } catch (err) {
    console.error(err);
    throw new OpenAIError('OpenAI request failed');
  }

  const clean = jsonCleanup(raw);

  try {
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error('Wrong Datatype from ChatGPT');
    if (arr.length < 1) throw new Error('No categories provided from LLM');
    console.log(arr);
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};

export const pullNotes = (fullAnnotations: Annotation[]): string[] => {
  return fullAnnotations.map(annotation => {
    return annotation.note;
  });
};

export const pullNotesWithRootSpanId = (fullAnnotations: Annotation[]): string[] => {
  return fullAnnotations.map(annotation => {
    return `${annotation.note}\nrootSpanID: ${annotation.rootSpanId}`;
  });
};

export const getCategorizedRootSpans = async (categories: string[], notesWithRootSpanId: string[]): Promise<CategorizedRootSpan[]> => {
  const systemPrompt = `
  You are an AI assistant helping with error analysis.
  You are provided a list of error categories.
  The categories represent different types of errors that could apply to a note.
  Then you are provided a list of notes and their rootSpanIds.
  The rootSpanID will always follow the note that it is attached to on a new line.
  Your job is to figure out which categories are relevant for each note.
  Multiple categories might apply to one note.  
  Return ONLY a valid JSON array of objects, no markdown fences.
  Each object will have a rootSpanId property and an array of categories.
  Example: [
    {"rootSpanId": "SYN018", "categories": ["spelling", "speed"]},
    {"rootSpanId": "SYN019", "categories": ["spelling", "attitude"]},
    {"rootSpanId": "SYN021", "categories": ["spelling", "speed"]},
    {"rootSpanId": "SYN008", "categories": ["speed"]},
  ];
  `.trim();

  const userContent = `Categories:\n${categories.join('\n')}\n\nNotes:\n${notesWithRootSpanId.join('\n')}`;

  let raw: string;
  try {
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent },
        ],
      }, 
      { timeout: 15_000 },
    );
    raw = completion.choices[0].message.content ?? '';
  } catch (err) {
    console.error(err);
    throw new OpenAIError('OpenAI request failed');
  }

  const clean = jsonCleanup(raw);

  try {
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error('Not an array');
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};

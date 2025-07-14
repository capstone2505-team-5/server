import { pool } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';
import type { CategorizedAnnotation, CategorizedTrace, Category, Annotation } from '../types/types';
import { getAllAnnotations } from '../services/annotationService';
import { openai } from '../lib/openaiClient';
import { addCategories } from '../services/categoryService';
import { OpenAIError } from '../errors/errors';

export const categorizeBadAnnotations = async () => {
  try {
    const allAnnotations = await getAllAnnotations();
    const badAnnotations = allAnnotations.filter(a => a.rating === 'bad');

    if (badAnnotations.length === 0) {
      return;
    }

    const notes = pullNotes(badAnnotations);
    const notesWithTraceIds = pullNotesWithTraceId(badAnnotations);
    const categories = await createCategories(notes);
    const categoriesWithIds = await addCategories(categories);
    const categorizedTraces = await getCategorizedTraces(
      categories, 
      notesWithTraceIds,
    );
    await addCategoriesToAnnotations(
      categoriesWithIds, 
      badAnnotations, 
      categorizedTraces
    );
    return categorizedTraces;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// categorizedTraces contains traces each paired with their own array of categories
// each trace/category pair is added to the join table annotation_categories
const addCategoriesToAnnotations = async (
  categories: Category[], // Used to get categoryId from category text
  annotations: Annotation[], // Used to get annotation Id from the TraceId
  categorizedTraces: CategorizedTrace[] // TraceId with categories to apply
): Promise<CategorizedAnnotation[]> => {
  try {
    const catMap = mapCategories(categories);
    const annMap = mapAnnotations(annotations);

    const values: string[] = [];
    const placeholders: string[] = [];
    let index = 1;

    categorizedTraces.forEach(({ traceId, categories }) => {
      const annId = annMap.get(traceId);
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
    return new Map(annotations.map(({ traceId, id }) => {
      return [traceId, id] as const;
    })
  );
}

const createCategories = async (notes: string[]): Promise<string[]> => {
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

  const clean = raw
    .replace(/```json\s*([\s\S]*?)```/i, '$1')
    .replace(/```([\s\S]*?)```/i, '$1')
    .trim();

  try {
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error('Wrong Datatype from ChatGPT');
    if (arr.length < 1) throw new Error('No categories provided from LLM');
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};

const pullNotes = (fullAnnotations: Annotation[]): string[] => {
  return fullAnnotations.map(annotation => {
    return annotation.note;
  });
};

const pullNotesWithTraceId = (fullAnnotations: Annotation[]): string[] => {
  return fullAnnotations.map(annotation => {
    return `${annotation.note}\ntraceID: ${annotation.traceId}`;
  });
};

const getCategorizedTraces = async (categories: string[], notesWithTraceId: string[]): Promise<CategorizedTrace[]> => {
  const systemPrompt = `
  You are an AI assistant helping with error analysis.
  You are provided a list of error categories.
  The categories represent different types of errors that could apply to a note.
  Then you are provided a list of notes and their traceIds.
  The traceID will always follow the note that it is attached to on a new line.
  Your job is to figure out which categories are relevant for each note.
  Multiple categories might apply to one note.  
  Return ONLY a valid JSON array of objects, no markdown fences.
  Each object will have a traceId property and an array of cateogires.
  Example: [
    {traceId: "SYN018", categories: ["spelling", "speed"]},
    {traceId: "SYN019", categories: ["spelling", "attitude"]},
    {traceId: "SYN021", categories: ["spelling", "speed"]},
    {traceId: "SYN008", categories: ["speed"]},
  ];
};
  `.trim();

  const userContent = `Categories:\n${categories.join('\n')}\n\nNotes:\n${notesWithTraceId.join('\n')}`;

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


  const clean = raw
    .replace(/```json\s*([\s\S]*?)```/i, '$1')
    .replace(/```([\s\S]*?)```/i, '$1')
    .trim();

  try {
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error('Not an array');
    if (arr.length < notesWithTraceId.length) {
      throw new OpenAIError('Not enough traces categorized');
    }
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};
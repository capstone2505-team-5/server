import { Request, Response } from "express";
import { AnnotationNotFoundError, createNewAnnotation, deleteAnnotationById, getAllAnnotations, getAnnotationById, updateAnnotationById } from '../services/annotationService';
import { CreateAnnotationRequest, Annotation, CategorizedTrace } from "../types/types";
import { getAllTraces } from "../services/traceService";
import { openai } from '../lib/openaiClient';
import { addCategories } from '../services/categoryService';
import { addCategoriesToAnnotations } from '../services/annotationCategoriesService';
import { OpenAIError } from '../errors/errors';

export const getAnnotations = async (req: Request, res: Response) => {
  try {
    const mockAnnotations = await getAllAnnotations();
    res.json(mockAnnotations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
}

export const getAnnotation = async (req: Request, res: Response) => {
  try {
    const annotation: Annotation = await getAnnotationById(req.params.id)
    
    res.json(annotation);
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch annotation' });
  }
}

export const createAnnotation = async (req: Request, res: Response) => {
  try {
    const { traceId, note, rating = 'none' }: CreateAnnotationRequest = req.body;
    
    // Validate required fields
    if (!traceId || !note) {
      res.status(400).json({ error: 'traceId and note are required' });
      return
    }
    
    // Check if trace exists
    const traces = await getAllTraces()

    const traceExists = traces.find(t => t.id === traceId);
    if (!traceExists) {
      res.status(404).json({ error: 'Trace not found' });
      return
    }

    // should replace this with a service to get next ID probably
    const annotation = await createNewAnnotation({traceId, note, rating})
        
    res.status(201).json(annotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create annotation' });
  }
}

export const updateAnnotation = async (req: Request, res: Response) => {
  try {
    const { note, rating }: Annotation = req.body;
    
    // Validate that at least one field is provided for update
    if (!note && !rating) {
      res.status(400).json({ error: 'At least one field (note or rating) is required for update' });
      return;
    }
    const updatedAnnotation = await updateAnnotationById(req.params.id, {note, rating})
    
    res.json(updatedAnnotation);
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update annotation' });
  }
}

export const deleteAnnotation = async (req: Request, res: Response) => {
  try {    
    // Find the annotation to delete
    const deletedAnnotation = await deleteAnnotationById(req.params.id);
        
    res.json({ 
      message: 'Annotation deleted successfully',
      deletedAnnotation 
    });
  } catch (error) {
    if (error instanceof AnnotationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
}

export const categorizeAnnotations = async (req: Request, res: Response) => {
  try {
    const allAnnotations = await getAllAnnotations();
    const badAnnotations = allAnnotations.filter(a => a.rating === 'bad');

    if (badAnnotations.length === 0) {
      res.sendStatus(204);
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
    res.status(201).json(categorizedTraces);
  } catch (err) {
    console.error(err);
    res.status(400);
  }
};

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
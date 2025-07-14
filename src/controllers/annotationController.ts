import { Request, Response } from "express";
import { AnnotationNotFoundError, createNewAnnotation, deleteAnnotationById, getAllAnnotations, getAnnotationById, updateAnnotationById } from '../services/annotationService';
import { CreateAnnotationRequest, Annotation, CategorizedSpan } from "../types/types";
import { getAllSpans } from "../services/traceService";
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
    const { spanId, note, rating = 'none' }: CreateAnnotationRequest = req.body;
    
    // Validate required fields
    if (!spanId || !note) {
      res.status(400).json({ error: 'spanId and note are required' });
      return
    }
    
    // Check if span exists
    const spans = await getAllSpans()

    const spanExists = spans.find(s => s.id === spanId);
    if (!spanExists) {
      res.status(404).json({ error: 'Span not found' });
      return
    }

    // should replace this with a service to get next ID probably
    const annotation = await createNewAnnotation({spanId, note, rating})
        
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
    const notesWithSpanIds = pullNotesWithSpanId(badAnnotations);
    const categories = await createCategories(notes);
    const categoriesWithIds = await addCategories(categories);
    const categorizedSpans = await getCategorizedSpans(
      categories, 
      notesWithSpanIds,
    );
    await addCategoriesToAnnotations(
      categoriesWithIds, 
      badAnnotations, 
      categorizedSpans
    );
    res.status(201).json(categorizedSpans);
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

const pullNotesWithSpanId = (fullAnnotations: Annotation[]): string[] => {
  return fullAnnotations.map(annotation => {
    return `${annotation.note}\nspanID: ${annotation.spanId}`;
  });
};

const getCategorizedSpans = async (categories: string[], notesWithSpanId: string[]): Promise<CategorizedSpan[]> => {
  const systemPrompt = `
  You are an AI assistant helping with error analysis.
  You are provided a list of error categories.
  The categories represent different types of errors that could apply to a note.
  Then you are provided a list of notes and their spanIds.
  The spanID will always follow the note that it is attached to on a new line.
  Your job is to figure out which categories are relevant for each note.
  Multiple categories might apply to one note.  
  Return ONLY a valid JSON array of objects, no markdown fences.
  Each object will have a spanId property and an array of cateogires.
  Example: [
    {spanId: "SYN018", categories: ["spelling", "speed"]},
    {spanId: "SYN019", categories: ["spelling", "attitude"]},
    {spanId: "SYN021", categories: ["spelling", "speed"]},
    {spanId: "SYN008", categories: ["speed"]},
  ];
};
  `.trim();

  const userContent = `Categories:\n${categories.join('\n')}\n\nNotes:\n${notesWithSpanId.join('\n')}`;

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
    if (arr.length < notesWithSpanId.length) {
      throw new OpenAIError('Not enough span categorized');
    }
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};
import { Request, Response } from "express";
import type { Annotation } from '../types/types';
import { getAllAnnotations } from "../services/annotationService";
import { openai } from '../lib/openaiClient';
import { deleteTraceById, getAllTraces, getTraceById, TraceNotFoundError } from "../services/traceService";

export const getTraces = async (req: Request, res: Response) => {
  try {
    const traces = await getAllTraces()
    res.json(traces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traces' });
  }
};

export const getTrace = async (req: Request, res: Response) => {
  try {
    const trace = await getTraceById(req.params.id)
    
    res.json(trace);
  } catch (error) {
    if (error instanceof TraceNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to fetch trace' });
  }
};

export const deleteTrace = async (req: Request, res: Response) => {
  try {
    const deletedTrace = await deleteTraceById(req.params.id)
    
    res.json({ 
      message: 'Trace deleted successfully',
      deletedTrace 
    });
  } catch (error) {
    if (error instanceof TraceNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete trace' });
  }
}

export const categorizeTraces = async (req: Request, res: Response) => {
  try {
    const fullAnnotations: Annotation[] = await getAllAnnotations();
    const notes = pullNotes(fullAnnotations);
    const categories = await getCategories(notes);
    const categorizedTraces = await getCategorizedTraces(categories, pullNotesWithTraceId(fullAnnotations));
    res.json(categorizedTraces);
  } catch (err) {
    console.error(err);
    throw err;
  }
};


const getCategories = async (notes: string[]): Promise<string[]> => {
  const systemPrompt = `
  You are an AI assistant helping with error analysis.
  Group similar annotation notes into failure-mode categories.
  Return ONLY a valid JSON array of strings, no markdown fences.
  Example: ["poor spelling","too much food temperature"]
  `.trim();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: notes.join('\n') },
    ],
  });

  const raw = completion.choices[0].message.content ?? '';
  const clean = raw
    .replace(/```json\s*([\s\S]*?)```/i, '$1')
    .replace(/```([\s\S]*?)```/i, '$1')
    .trim();

  try {
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error('Not an array');
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};

const pullNotes = (fullAnnotations: Annotation[]): string[] => {
  return fullAnnotations.filter(annotation => {
    return annotation.rating === 'bad';
  }).map(annotation => {
    return annotation.note;
  });
};

const pullNotesWithTraceId = (fullAnnotations: Annotation[]): string[] => {
  return fullAnnotations.filter(annotation => {
    return annotation.rating === 'bad';
  }).map(annotation => {
    return `${annotation.note}\ntraceID: ${annotation.traceId}`;
  });
};

const getCategorizedTraces = async (categories: string[], notesWithTraceId: string[]) => {
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

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
  });

  const raw = completion.choices[0].message.content ?? '';
  const clean = raw
    .replace(/```json\s*([\s\S]*?)```/i, '$1')
    .replace(/```([\s\S]*?)```/i, '$1')
    .trim();

  try {
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error('Not an array');
    return arr;
  } catch (e) {
    console.error('Bad JSON from model:', clean);
    throw e;
  }
};

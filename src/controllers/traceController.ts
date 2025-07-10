import { Request, Response } from "express";
import type { Annotation } from '../types/types';
import { mockTraces } from "../db/mockData";
import { getAllAnnotations } from "../services/annotationService";
import { openai } from '../lib/openaiClient';

export const getTraces = (req: Request, res: Response) => {
  try {
    res.json(mockTraces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traces' });
  }
};

export const getTrace = (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const trace = mockTraces.find(t => t.id === id);

    if (!trace) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }
    
    res.json(trace);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trace' });
  }
};

export const deleteTrace = (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Find the trace to delete
    const traceIndex = mockTraces.findIndex(a => a.id === id);
    
    if (traceIndex === -1) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }
    
    // Remove the trace from the array
    const deletedTrace = mockTraces.splice(traceIndex, 1)[0];
    
    res.json({ 
      message: 'Trace deleted successfully',
      deletedTrace 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete trace' });
  }
}

export const categorizeTraces = async (req: Request, res: Response) => {
  try {
    const fullAnnotations: Annotation[] = getAllAnnotations();
    const notes: string[] = fullAnnotations.map(annotation => {
      return annotation.note;
    });
    const categories = await getCategories(notes);
    res.json(categories);
  } catch (err) {
    console.error(err);
    throw err;
  }

  // const result = [
  //   {traceId: "SYN018", categories: ["spelling", "speed"]},
  //   {traceId: "SYN019", categories: ["spelling", "attitude"]},
  //   {traceId: "SYN021", categories: ["spelling", "speed"]},
  //   {traceId: "SYN008", categories: ["speed"]},
  // ];
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

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizeBatch = void 0;
const postgres_1 = require("../db/postgres");
const uuid_1 = require("uuid");
const annotationService_1 = require("./annotationService");
const openaiClient_1 = require("../lib/openaiClient");
const categoryService_1 = require("./categoryService");
const errors_1 = require("../errors/errors");
const jsonCleanup_1 = require("../utils/jsonCleanup");
// categorizes all bad annotations in one batch
const categorizeBatch = (batchId) => __awaiter(void 0, void 0, void 0, function* () {
    const countAndFormat = (categorizedRootSpans) => {
        const result = {};
        const categories = categorizedRootSpans.map(crs => crs.categories).flat();
        categories.forEach(category => {
            if (result[category] === undefined) {
                result[category] = 1;
            }
            else {
                result[category] += 1;
            }
        });
        return result;
    };
    try {
        const batchAnnotations = yield (0, annotationService_1.getAnnotationsByBatch)(batchId);
        console.log("batch annotations:", batchAnnotations); //de
        const badBatchAnnotations = batchAnnotations.filter(a => a.rating === 'bad');
        if (badBatchAnnotations.length < 1) {
            return {};
        }
        const annotationIds = badBatchAnnotations.map(a => a.id);
        yield (0, annotationService_1.clearCategoriesFromAnnotations)(annotationIds);
        const notes = pullNotes(badBatchAnnotations);
        const notesWithRootSpanIds = pullNotesWithRootSpanId(badBatchAnnotations);
        const categories = yield createCategories(notes);
        const categoriesWithIds = yield (0, categoryService_1.addCategories)(categories);
        const categorizedRootSpans = yield getCategorizedRootSpans(categories, notesWithRootSpanIds);
        yield addCategoriesToAnnotations(categoriesWithIds, badBatchAnnotations, categorizedRootSpans);
        console.log(categorizedRootSpans);
        return countAndFormat(categorizedRootSpans);
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
exports.categorizeBatch = categorizeBatch;
// categorizedRootSpans contains root spans each paired with their own array of categories
// each root span/category pair is added to the join table annotation_categories
const addCategoriesToAnnotations = (categories, // Used to get categoryId from category text
annotations, // Used to get annotation Id from the RootSpanId
categorizedRootSpans // RootSpanId with categories to apply
) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const catMap = mapCategories(categories);
        const annMap = mapAnnotations(annotations);
        const values = [];
        const placeholders = [];
        let index = 1;
        categorizedRootSpans.forEach(({ rootSpanId, categories }) => {
            const annId = annMap.get(rootSpanId);
            categories.forEach(category => {
                const catId = catMap.get(category);
                const id = (0, uuid_1.v4)();
                placeholders.push(`($${index}, $${index + 1}, $${index + 2})`);
                values.push(id, annId, catId);
                index = index + 3;
            });
        });
        const query = `
      INSERT INTO annotation_categories (id, annotation_id, category_id)
      VALUES ${placeholders.join(', ')}
      RETURNING id, annotation_id, category_id
    `;
        const result = yield postgres_1.pool.query(query, values);
        return result.rows;
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
const mapCategories = (categoriesWithIds) => {
    return new Map(categoriesWithIds.map(({ id, text }) => {
        return [text, id];
    }));
};
const mapAnnotations = (annotations) => {
    return new Map(annotations.map(({ rootSpanId, id }) => {
        return [rootSpanId, id];
    }));
};
const createCategories = (notes) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const systemPrompt = `
  You are an AI assistant helping with error analysis.
  Group similar annotation notes into failure-mode categories.
  Return ONLY a valid JSON array of strings, no markdown fences.
  Example: ["poor spelling","too much food temperature"]
  `.trim();
    let raw;
    try {
        const completion = yield openaiClient_1.openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: notes.join('\n') },
            ],
        }, { timeout: 15000 });
        raw = (_a = completion.choices[0].message.content) !== null && _a !== void 0 ? _a : '';
    }
    catch (err) {
        console.error(err);
        throw new errors_1.OpenAIError('OpenAI request failed');
    }
    const clean = (0, jsonCleanup_1.jsonCleanup)(raw);
    try {
        const arr = JSON.parse(clean);
        if (!Array.isArray(arr))
            throw new Error('Wrong Datatype from ChatGPT');
        if (arr.length < 1)
            throw new Error('No categories provided from LLM');
        console.log(arr);
        return arr;
    }
    catch (e) {
        console.error('Bad JSON from model:', clean);
        throw e;
    }
});
const pullNotes = (fullAnnotations) => {
    return fullAnnotations.map(annotation => {
        return annotation.note;
    });
};
const pullNotesWithRootSpanId = (fullAnnotations) => {
    return fullAnnotations.map(annotation => {
        return `${annotation.note}\nrootSpanID: ${annotation.rootSpanId}`;
    });
};
const getCategorizedRootSpans = (categories, notesWithRootSpanId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
    let raw;
    try {
        const completion = yield openaiClient_1.openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
        }, { timeout: 15000 });
        raw = (_a = completion.choices[0].message.content) !== null && _a !== void 0 ? _a : '';
    }
    catch (err) {
        console.error(err);
        throw new errors_1.OpenAIError('OpenAI request failed');
    }
    const clean = (0, jsonCleanup_1.jsonCleanup)(raw);
    try {
        const arr = JSON.parse(clean);
        if (!Array.isArray(arr))
            throw new Error('Not an array');
        return arr;
    }
    catch (e) {
        console.error('Bad JSON from model:', clean);
        throw e;
    }
});

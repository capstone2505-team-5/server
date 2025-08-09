import { formatBatch } from './services/batchService';

interface FormatBatchEvent {
  batchId: string;
}

export const handler = async (event: FormatBatchEvent): Promise<{ ok: boolean }> => {
  console.log('Received event to format batch:', event);

  if (!event || !event.batchId) {
    throw new Error('batchId not provided in the event');
  }

  await formatBatch(event.batchId);
  return { ok: true };
};


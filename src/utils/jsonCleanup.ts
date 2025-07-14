export const jsonCleanup = (rawOutput: string): string => {
    return rawOutput
    .replace(/```json\s*([\s\S]*?)```/i, '$1')
    .replace(/```([\s\S]*?)```/i, '$1')
    .trim();
}
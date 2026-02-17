import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a purifier instance that works in both Node.js (SSR) and Browser
const purifier = typeof window !== 'undefined'
    ? DOMPurify
    : DOMPurify(new JSDOM('').window as any);

export const sanitizeInput = (content: string): string => {
    return purifier.sanitize(content);
};

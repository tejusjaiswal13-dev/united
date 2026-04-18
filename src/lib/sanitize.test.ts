import { describe, it, expect } from 'vitest';
import { sanitizeInput } from './sanitize';

describe('sanitizeInput', () => {
    it('should remove dangerous script tags', () => {
        const input = `<script>alert("xss")</script><p>Hello</p>`;
        const result = sanitizeInput(input);
        expect(result).toBe('<p>Hello</p>');
    });

    it('should keep safe html', () => {
        const input = `<strong>Bold</strong> and <em>italics</em>`;
        const result = sanitizeInput(input);
        expect(result).toBe('<strong>Bold</strong> and <em>italics</em>');
    });

    it('should not throw on empty input', () => {
        expect(sanitizeInput('')).toBe('');
    });
});

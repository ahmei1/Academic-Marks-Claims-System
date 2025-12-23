import { describe, it, expect } from 'vitest';
import { calculateTotalMark, getGrade } from './calculations';

describe('Mark Calculations', () => {
    it('should correctly sum CAT, FAT, and Assignment', () => {
        expect(calculateTotalMark(20, 50, 10)).toBe(80);
    });

    it('should handle decimal values correctly', () => {
        expect(calculateTotalMark(20.5, 50.2, 10.1)).toBe(80.8);
    });

    it('should treat missing or null values as 0', () => {
        expect(calculateTotalMark(20, null, undefined)).toBe(20);
    });

    it('should return 0 for all invalid inputs', () => {
        expect(calculateTotalMark('a', 'b', 'c')).toBe(0);
    });
});

describe('Grade Determination', () => {
    it('should return A for 70 and above', () => {
        expect(getGrade(70)).toBe('A');
        expect(getGrade(95)).toBe('A');
    });

    it('should return B for 60-69', () => {
        expect(getGrade(60)).toBe('B');
        expect(getGrade(69.9)).toBe('B');
    });

    it('should return F for below 40', () => {
        expect(getGrade(39)).toBe('F');
        expect(getGrade(0)).toBe('F');
    });
});

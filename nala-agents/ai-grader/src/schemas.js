import { z } from 'zod';

export const DescribeImageSchema = z.object({
    image: z.string().min(1, "Image data required"),
    mimeType: z.string().optional().default('image/png')
});

export const InputBundleSchema = z.object({
    latex: z.string().optional(),
    sketch: z.string().optional().nullable(),
    file: z.object({
        name: z.string(),
        type: z.string(),
        content: z.string()
    }).optional().nullable(),
    studentAnswer: z.string().optional(),
    correctAnswer: z.string().optional(),
    questionText: z.string().optional(),
    questionId: z.string().optional(),
    setId: z.union([z.string(), z.number()]).optional(),
    context: z.string().optional(),
    rubrics: z.any().optional(), // Flexible for now, could be stricter
    hint: z.string().optional(),
    answerKey: z.any().optional(),
    timestamp: z.string().optional()
});

export const GradeRequestSchema = z.object({
    userId: z.string().min(1),
    courseCode: z.string().min(1),
    inputBundle: InputBundleSchema
});

export const SeedQuestionsSchema = z.object({
    courseCode: z.string().min(1),
    count: z.number().optional().default(5),
    academicYear: z.string().optional(),
    semester: z.string().optional()
});

import { z } from 'zod';

export const submitApplicationSchema = z.object({
  body: z.object({
    course: z.coerce.number().int().min(1).max(6).optional(),
    faculty: z.string().min(1).optional(),
    privilegeCategoryId: z.string().optional().nullable(),
    clusteringVector: z.string().min(1).optional(),
    type: z.enum(['CHECK_IN', 'TRANSFER', 'CHECK_OUT']).optional()
  })
});

export const joinGroupSchema = z.object({
  body: z.object({
    code: z.string().min(1)
  })
});

export const submitComplaintSchema = z.object({
  body: z.object({
    accusedId: z.string().uuid(),
    content: z.string().min(1)
  })
});

export const submitRepairRequestSchema = z.object({
  body: z.object({
    description: z.string().min(1),
    masterId: z.string().uuid().optional().nullable()
  })
});

export const updateRepairStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  })
});

export const donateToJarSchema = z.object({
  body: z.object({
    jarId: z.string().uuid(),
    amount: z.coerce.number().positive(),
    comment: z.string().optional()
  })
});

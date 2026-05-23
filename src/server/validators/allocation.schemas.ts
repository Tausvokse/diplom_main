import { z } from 'zod';

export const evictStudentSchema = z.object({
  body: z.object({
    studentId: z.string().uuid()
  })
});

export const allocateStudentSchema = z.object({
  params: z.object({
    roomId: z.string().uuid()
  }),
  body: z.object({
    studentId: z.string().uuid()
  })
});

export const confirmAllocationPlanSchema = z.object({
  body: z.object({
    plan: z.array(z.object({
      roomId: z.string().uuid(),
      students: z.array(z.object({
        id: z.string().uuid(),
        clusterId: z.number().optional().nullable()
      })).min(1)
    })).min(1)
  })
});

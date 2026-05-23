import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { beforeEach } from 'vitest';

export const prisma = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prisma);
});

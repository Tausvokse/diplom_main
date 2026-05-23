import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MonobankService } from './monobank.service';
import https from 'https';

vi.mock('../lib/prisma');

vi.mock('../config', () => ({
  config: { monobankToken: 'fake-token' }
}));

// Mock https.request
vi.mock('https', () => {
  return {
    default: {
      request: vi.fn(),
    }
  };
});

describe('MonobankService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear static caches in MonobankService using reflection/any
    (MonobankService as any).cachedClientInfo = null;
    (MonobankService as any).lastFetchTime = 0;
    (MonobankService as any).clientInfoPromise = null;
    (MonobankService as any).statementCache.clear();
    (MonobankService as any).statementPromises.clear();
  });

  const mockHttpsRequest = (statusCode: number, responseData: any) => {
    const requestMock = {
      on: vi.fn(),
      end: vi.fn(),
    };
    
    vi.mocked(https.request).mockImplementation(((options: any, callback?: (res: any) => void) => {
      if (callback) {
        const resMock = {
          statusCode,
          on: vi.fn((event, handler) => {
            if (event === 'data') handler(JSON.stringify(responseData));
            if (event === 'end') handler();
          }),
        };
        callback(resMock);
      }
      return requestMock;
    }) as any);
  };

  describe('getClientInfo', () => {
    it('fetches client info successfully', async () => {
      mockHttpsRequest(200, { name: 'Test User', jars: [] });
      const result = await MonobankService.getClientInfo();
      expect(result.name).toBe('Test User');
    });

    it('throws error on non-200 status code', async () => {
      mockHttpsRequest(400, { errorDescription: 'Bad request' });
      await expect(MonobankService.getClientInfo()).rejects.toThrow();
    });
  });

  describe('getJarDetails', () => {
    it('extracts jar ID and returns matching jar', async () => {
      const mockInfo = { jars: [{ id: '123', sendId: 'jar/8oXoRfoAC6' }] };
      mockHttpsRequest(200, mockInfo);

      const result = await MonobankService.getJarDetails('https://send.monobank.ua/jar/8oXoRfoAC6');
      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });

    it('returns null if jar not found', async () => {
      const mockInfo = { jars: [{ id: '123', sendId: 'jar/8oXoRfoAC6' }] };
      mockHttpsRequest(200, mockInfo);

      const result = await MonobankService.getJarDetails('jar/invalid');
      expect(result).toBeNull();
    });
  });

  describe('getJarStatement', () => {
    it('fetches statement successfully', async () => {
      const mockStatement = [{ id: 'stmt1', amount: 100 }];
      mockHttpsRequest(200, mockStatement);

      const result = await MonobankService.getJarStatement('jar-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('stmt1');
    });
  });
});

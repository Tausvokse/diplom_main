import https from 'https';
import { config } from '../config';

interface MonoJar {
  id: string;
  sendId: string;
  title: string;
  description: string;
  currencyCode: number;
  balance: number;
  goal: number;
}

interface MonoStatementItem {
  id: string;
  time: number;
  description: string;
  mcc: number;
  hold: boolean;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  comment?: string;
  receiptId?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
  counterName?: string;
}

export class MonobankService {
  private static cachedClientInfo: any = null;
  private static lastFetchTime: number = 0;
  private static CACHE_TTL = 60000; // 60 seconds

  private static async apiRequest<T>(path: string): Promise<T> {
    if (!config.monobankToken) {
      throw new Error('Monobank API token is not configured');
    }

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.monobank.ua',
        port: 443,
        path,
        method: 'GET',
        headers: {
          'X-Token': config.monobankToken,
          'User-Agent': 'Dormitory-Management-SaaS'
        }
      };

      const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse Monobank API response'));
            }
          } else {
            reject(new Error(`Monobank API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  static async getClientInfo() {
    const now = Date.now();
    if (this.cachedClientInfo && (now - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cachedClientInfo;
    }

    try {
      const info = await this.apiRequest<any>('/personal/client-info');
      this.cachedClientInfo = info;
      this.lastFetchTime = now;
      return info;
    } catch (error) {
      console.error('Error fetching Monobank client info:', error);
      // Return cached if failed, or throw
      if (this.cachedClientInfo) return this.cachedClientInfo;
      throw error;
    }
  }

  static async getJarDetails(monobankUrl: string): Promise<MonoJar | null> {
    // Extract ID from URL like https://send.monobank.ua/jar/8oXoRfoAC6 or 8oXoRfoAC6
    let jarId = monobankUrl.split('/').pop() || '';
    
    const info = await this.getClientInfo();
    const jars = info.jars as MonoJar[];
    
    // Match by sendId (e.g. "jar/8oXoRfoAC6" or "8oXoRfoAC6")
    const jar = jars.find(j => j.sendId.includes(jarId) || j.id === jarId);
    return jar || null;
  }

  static async getJarStatement(jarAccountId: string, days: number = 30): Promise<MonoStatementItem[]> {
    const to = Math.floor(Date.now() / 1000);
    const from = to - (days * 24 * 60 * 60);
    
    try {
      return await this.apiRequest<MonoStatementItem[]>(`/personal/statement/${jarAccountId}/${from}/${to}`);
    } catch (error) {
      console.error(`Error fetching Monobank statement for jar ${jarAccountId}:`, error);
      return [];
    }
  }
}

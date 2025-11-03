import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isDevelopment = process.env.NODE_ENV !== 'production';

let redis: any;
let isRedisConnected = false;

// Create a mock Redis client for development when Redis is not available
const createMockRedis = () => {
  const mockStore = new Map<string, string>();
  const mockSortedSets = new Map<string, Map<string, number>>();
  const mockHashes = new Map<string, Map<string, string>>();

  return {
    get: async (key: string) => mockStore.get(key) || null,
    set: async (key: string, value: string) => mockStore.set(key, value),
    setEx: async (key: string, seconds: number, value: string) => {
      mockStore.set(key, value);
      // In a real implementation, you'd set a timeout to delete the key
      return 'OK';
    },
    del: async (keys: string | string[]) => {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      let deleted = 0;
      keyArray.forEach(key => {
        if (mockStore.delete(key)) deleted++;
        if (mockSortedSets.delete(key)) deleted++;
        if (mockHashes.delete(key)) deleted++;
      });
      return deleted;
    },
    keys: async (pattern: string) => {
      const allKeys = [...mockStore.keys(), ...mockSortedSets.keys(), ...mockHashes.keys()];
      if (pattern === '*') return allKeys;
      // Simple pattern matching for development
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return allKeys.filter(key => regex.test(key));
    },
    expire: async (key: string, seconds: number) => {
      // Mock implementation - in real use, you'd set a timeout
      return mockStore.has(key) || mockSortedSets.has(key) || mockHashes.has(key) ? 1 : 0;
    },
    zIncrBy: async (key: string, increment: number, member: string) => {
      if (!mockSortedSets.has(key)) {
        mockSortedSets.set(key, new Map<string, number>());
      }
      const sortedSet = mockSortedSets.get(key)!;
      const currentScore = sortedSet.get(member) || 0;
      const newScore = currentScore + increment;
      sortedSet.set(member, newScore);
      return newScore.toString();
    },
    zRange: async (key: string, start: number, stop: number, options?: any) => {
      const sortedSet = mockSortedSets.get(key);
      if (!sortedSet) return [];
      
      const entries = Array.from(sortedSet.entries()) as [string, number][];
      entries.sort((a, b) => options?.REV ? b[1] - a[1] : a[1] - b[1]);
      
      const slice = entries.slice(start, stop + 1);
      return slice.map(([member]) => member);
    },
    zRangeWithScores: async (key: string, start: number, stop: number, options?: any) => {
      const sortedSet = mockSortedSets.get(key);
      if (!sortedSet) return [];
      
      const entries = Array.from(sortedSet.entries()) as [string, number][];
      entries.sort((a, b) => options?.REV ? b[1] - a[1] : a[1] - b[1]);
      
      const slice = entries.slice(start, stop + 1);
      return slice.map(([member, score]) => ({ value: member, score }));
    },
    zRemRangeByScore: async (key: string, min: number, max: number) => {
      const sortedSet = mockSortedSets.get(key);
      if (!sortedSet) return 0;
      
      let removed = 0;
      for (const [member, score] of sortedSet.entries()) {
        if (score >= min && score <= max) {
          sortedSet.delete(member);
          removed++;
        }
      }
      return removed;
    },
    zRemRangeByRank: async (key: string, start: number, stop: number) => {
      const sortedSet = mockSortedSets.get(key);
      if (!sortedSet) return 0;
      
      const entries = Array.from(sortedSet.entries()) as [string, number][];
      entries.sort((a, b) => a[1] - b[1]);
      
      const toRemove = entries.slice(start, stop + 1);
      toRemove.forEach(([member]) => sortedSet.delete(member));
      return toRemove.length;
    },
    zAdd: async (key: string, scoreMembers: { score: number; value: string } | { score: number; value: string }[]) => {
      if (!mockSortedSets.has(key)) {
        mockSortedSets.set(key, new Map<string, number>());
      }
      const sortedSet = mockSortedSets.get(key)!;
      const items = Array.isArray(scoreMembers) ? scoreMembers : [scoreMembers];
      
      items.forEach(({ score, value }) => {
        sortedSet.set(value, score);
      });
      return items.length;
    },
    hIncrBy: async (key: string, field: string, increment: number) => {
      if (!mockHashes.has(key)) {
        mockHashes.set(key, new Map<string, string>());
      }
      const hash = mockHashes.get(key)!;
      const currentValue = parseInt(hash.get(field) || '0');
      const newValue = currentValue + increment;
      hash.set(field, newValue.toString());
      return newValue;
    },
    hGet: async (key: string, field: string) => {
      const hash = mockHashes.get(key);
      return hash ? hash.get(field) || null : null;
    },
    quit: async () => Promise.resolve(),
    connect: async () => Promise.resolve(),
    on: () => {},
    isReady: true
  };
};

// Initialize Redis with fallback to mock for development
if (isDevelopment) {
  console.log('🔄 Using mock Redis for development (Redis server not required)');
  redis = createMockRedis();
  isRedisConnected = false;
} else {
  try {
    redis = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000
      }
    });

    redis.on('error', (err: any) => {
      console.error('❌ Redis Client Error:', err.message);
    });

    redis.on('connect', () => {
      console.log('✅ Connected to Redis');
      isRedisConnected = true;
    });

    redis.on('ready', () => {
      isRedisConnected = true;
    });

    redis.on('end', () => {
      isRedisConnected = false;
    });

    // Try to connect to Redis
    redis.connect().catch((error: any) => {
      console.error('❌ Failed to connect to Redis:', error);
    });

  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (isRedisConnected && redis.quit) {
    await redis.quit();
  }
});

export { redis, isRedisConnected };
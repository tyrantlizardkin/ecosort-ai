const SUPABASE_URL = 'https://siizqmfumpksoojubezr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaXpxbWZ1bXBrc29vanViZXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDg1MjQsImV4cCI6MjA5MjcyNDUyNH0.fL4DEToHk1uXFJKuyPa-jXBD6BDEpGyUZZYZqfvBvDA';

const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export const storeMemory = (scan: {
  item: string;
  category: string;
  kwhSaved: number;
  co2Saved: number;
  weightDiverted: number;
  timestamp: number;
}): void => {
  fetch(`${SUPABASE_URL}/functions/v1/backboard-store`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(scan),
  }).catch(() => {});
};

export interface MemoryResult {
  id: string;
  content: string;
  score: number;
  created_at: string;
}

export const searchMemories = async (query: string): Promise<MemoryResult[]> => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/backboard-search`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query }),
  });
  const data = await response.json();
  return data.memories ?? [];
};

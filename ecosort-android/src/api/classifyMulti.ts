import { MultiClassification } from '../types';

const SUPABASE_URL = 'https://siizqmfumpksoojubezr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaXpxbWZ1bXBrc29vanViZXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDg1MjQsImV4cCI6MjA5MjcyNDUyNH0.fL4DEToHk1uXFJKuyPa-jXBD6BDEpGyUZZYZqfvBvDA';

export const classifyMulti = async (imageDataUrl: string): Promise<MultiClassification[]> => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/classify-waste-multi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ image: imageDataUrl }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Multi-item classification failed');
  if (!data.items?.length) throw new Error('No items detected. Try a clearer photo.');
  return data.items as MultiClassification[];
};

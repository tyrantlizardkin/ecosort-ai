import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const SUPABASE_URL = 'https://siizqmfumpksoojubezr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaXpxbWZ1bXBrc29vanViZXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDg1MjQsImV4cCI6MjA5MjcyNDUyNH0.fL4DEToHk1uXFJKuyPa-jXBD6BDEpGyUZZYZqfvBvDA';

export const speak = async (text: string): Promise<void> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) return;
    const json = await response.json();
    if (!json.audio) return;

    const path = (FileSystem.cacheDirectory ?? '') + 'ecosort_speech.mp3';
    await FileSystem.writeAsStringAsync(path, json.audio, {
      encoding: 'base64' as any,
    });

    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri: path });
    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {
    // Silent fail — TTS is an enhancement, not core functionality
  }
};

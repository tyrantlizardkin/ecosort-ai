import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

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

    if (!response.ok) {
      Alert.alert('TTS Debug', `HTTP error: ${response.status}`);
      return;
    }

    const json = await response.json();
    if (!json.audio) {
      Alert.alert('TTS Debug', `No audio in response. Keys: ${Object.keys(json).join(', ')}`);
      return;
    }

    Alert.alert('TTS Debug', `Got audio (${json.audio.length} chars). Writing file...`);

    const path = (FileSystem.cacheDirectory ?? '') + 'ecosort_speech.mp3';
    await FileSystem.writeAsStringAsync(path, json.audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri: path });
    await sound.playAsync();
    Alert.alert('TTS Debug', 'playAsync called');

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e: any) {
    Alert.alert('TTS Debug', `Error: ${e?.message ?? String(e)}`);
  }
};

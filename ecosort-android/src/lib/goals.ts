import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ecosort_goals';

export interface Goals {
  kwhTarget: number;
  co2Target: number;
  weightTarget: number;
}

export const DEFAULT_GOALS: Goals = { kwhTarget: 5, co2Target: 3, weightTarget: 2 };

export const getGoals = async (): Promise<Goals> => {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULT_GOALS };
  return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
};

export const saveGoals = async (goals: Goals): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(goals));
};

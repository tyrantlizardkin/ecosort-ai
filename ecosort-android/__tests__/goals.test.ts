import AsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { getGoals, saveGoals, DEFAULT_GOALS } from '../src/lib/goals';

beforeEach(() => AsyncStorage.clear());

test('getGoals returns defaults when nothing stored', async () => {
  const goals = await getGoals();
  expect(goals.kwhTarget).toBe(DEFAULT_GOALS.kwhTarget);
  expect(goals.co2Target).toBe(DEFAULT_GOALS.co2Target);
  expect(goals.weightTarget).toBe(DEFAULT_GOALS.weightTarget);
});

test('saveGoals persists and getGoals retrieves', async () => {
  await saveGoals({ kwhTarget: 10, co2Target: 5, weightTarget: 3 });
  const goals = await getGoals();
  expect(goals.kwhTarget).toBe(10);
  expect(goals.co2Target).toBe(5);
  expect(goals.weightTarget).toBe(3);
});

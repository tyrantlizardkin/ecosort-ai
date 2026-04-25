# Multi-Item Analysis — Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-item scan mode to the Android app — a second button on the preview screen calls a new Supabase edge function that returns all visible items with bounding boxes, rendered as coloured overlays on the photo.

**Architecture:** A new Supabase Edge Function `classify-waste-multi` returns `{ items: [...] }` where each item includes a fractional bounding box. The Android app gets a `classifyMulti()` API module, a `MultiResultView` component that absolutely positions coloured overlays on the image using percentage-based coordinates, and a new `'multi-result'` App.tsx phase. PreviewView gets a second button wired to `onAnalyzeMulti`.

**Tech Stack:** Expo React Native, Supabase Edge Functions (Deno), Gemini 2.5 Flash via Lovable AI Gateway

---

## IMPORTANT: Deploy the backend first

Before testing anything on the phone, the Supabase function must be deployed. Do this once before running any tasks:

```bash
npx supabase login
npx supabase link --project-ref txdpuiukpicwxbzgpbdu
npx supabase functions deploy classify-waste-multi
```

The first command opens a browser tab. Run from `C:\Users\jpcarlson\hackaz26\ecosort-ai\`.

---

## Task 1: Create the Supabase Edge Function

**Files:**
- Create: `supabase/functions/classify-waste-multi/index.ts`

All commands run from `C:\Users\jpcarlson\hackaz26\ecosort-ai\`.

- [ ] **Step 1: Create the function file**

Create `supabase/functions/classify-waste-multi/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are EcoSort AI, a waste classification assistant for University of Arizona students.
Look at the image and identify ALL visible disposable items.

For each item categorize as exactly one of:
- "recycling" → plastic bottles, aluminum cans, glass, clean paper, cardboard, metal
- "compost" → food scraps, fruit/vegetable waste, coffee grounds, napkins with food, organic matter
- "landfill" → mixed materials, soiled items, styrofoam, plastic film, unknown items

Return a bounding box for each item as fractions (0.0–1.0) of image width and height, where x and y are the top-left corner.
Only include clearly visible disposable items. Ignore surfaces, backgrounds, and non-disposable objects.
Tip should be ONE short actionable sentence (max 12 words).
Respond with ONLY a tool call.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "image required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify all disposable items in this image with their bounding boxes." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_items",
              description: "Return all detected disposable items with classifications and bounding boxes.",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item:       { type: "string", description: "Short name of the item" },
                        category:   { type: "string", enum: ["recycling", "compost", "landfill"] },
                        confidence: { type: "number", description: "0-100" },
                        tip:        { type: "string", description: "One short disposal tip, max 12 words" },
                        bbox: {
                          type: "object",
                          properties: {
                            x:      { type: "number", description: "Left edge as fraction 0-1" },
                            y:      { type: "number", description: "Top edge as fraction 0-1" },
                            width:  { type: "number", description: "Width as fraction 0-1" },
                            height: { type: "number", description: "Height as fraction 0-1" },
                          },
                          required: ["x", "y", "width", "height"],
                          additionalProperties: false,
                        },
                      },
                      required: ["item", "category", "confidence", "tip", "bbox"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_items" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No classification returned");
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-waste-multi error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/classify-waste-multi/index.ts
git commit -m "feat: add classify-waste-multi Supabase edge function"
```

- [ ] **Step 3: Deploy**

```bash
npx supabase functions deploy classify-waste-multi
```
Expected: `Deployed: classify-waste-multi`

---

## Task 2: Add types and classifyMulti API module

**Files:**
- Modify: `ecosort-android/src/types.ts`
- Create: `ecosort-android/src/api/classifyMulti.ts`
- Create: `ecosort-android/__tests__/classifyMulti.test.ts`

All commands run from `C:\Users\jpcarlson\hackaz26\ecosort-ai\ecosort-android\`.

- [ ] **Step 1: Append new types to src/types.ts**

Add after the existing exports:

```typescript
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MultiClassification {
  item: string;
  category: Category;
  confidence: number;
  tip: string;
  bbox: BoundingBox;
}
```

- [ ] **Step 2: Write the failing tests**

Create `__tests__/classifyMulti.test.ts`:

```typescript
import { classifyMulti } from '../src/api/classifyMulti';

global.fetch = jest.fn();
afterEach(() => jest.clearAllMocks());

test('returns array of classifications on success', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      items: [
        { item: 'plastic bottle', category: 'recycling', confidence: 88, tip: 'Rinse it.', bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 } },
        { item: 'banana peel', category: 'compost', confidence: 95, tip: 'Into the green bin.', bbox: { x: 0.5, y: 0.4, width: 0.2, height: 0.2 } },
      ],
    }),
  });

  const result = await classifyMulti('data:image/jpeg;base64,abc');
  expect(result).toHaveLength(2);
  expect(result[0].item).toBe('plastic bottle');
  expect(result[0].bbox.x).toBe(0.1);
  expect(fetch).toHaveBeenCalledWith(
    'https://txdpuiukpicwxbzgpbdu.supabase.co/functions/v1/classify-waste-multi',
    expect.objectContaining({ method: 'POST' })
  );
});

test('throws on non-ok response', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Rate limit reached.' }),
  });
  await expect(classifyMulti('data:image/jpeg;base64,abc')).rejects.toThrow('Rate limit reached.');
});

test('throws when items array is empty', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [] }),
  });
  await expect(classifyMulti('data:image/jpeg;base64,abc')).rejects.toThrow('No items detected');
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest __tests__/classifyMulti.test.ts
```
Expected: FAIL — `Cannot find module '../src/api/classifyMulti'`

- [ ] **Step 4: Create src/api/classifyMulti.ts**

```typescript
import { MultiClassification } from '../types';

const SUPABASE_URL = 'https://txdpuiukpicwxbzgpbdu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4ZHB1aXVrcGljd3hiemdwYmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzU0MzEsImV4cCI6MjA5MjcxMTQzMX0.KuX4mnOaj8ZOH0eMqv4UkYezyX0sbWy7_mrICOTQ1o0';

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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest __tests__/classifyMulti.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/api/classifyMulti.ts __tests__/classifyMulti.test.ts
git commit -m "feat: add MultiClassification types and classifyMulti API module"
```

---

## Task 3: MultiResultView component

**Files:**
- Create: `ecosort-android/src/components/MultiResultView.tsx`

All commands run from `C:\Users\jpcarlson\hackaz26\ecosort-ai\ecosort-android\`.

- [ ] **Step 1: Create src/components/MultiResultView.tsx**

```typescript
import React from 'react';
import { View, Image, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MultiClassification } from '../types';
import { getCategoryMeta } from '../lib/categories';
import { getItemImpact } from '../lib/impact';

interface Props {
  items: MultiClassification[];
  imageUri: string;
  totalSorted: number;
  onReset: () => void;
}

const OVERLAY_OPACITY: Record<string, string> = {
  recycling: 'rgba(139,233,253,0.25)',
  compost:   'rgba(80,250,123,0.25)',
  landfill:  'rgba(255,184,108,0.25)',
};

export const MultiResultView: React.FC<Props> = ({ items, imageUri, totalSorted, onReset }) => (
  <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
    {/* Annotated image */}
    <View style={styles.imageWrapper}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      {items.map((item, i) => {
        const meta = getCategoryMeta(item.category);
        return (
          <View
            key={i}
            style={[
              styles.bbox,
              {
                left:   `${item.bbox.x * 100}%` as any,
                top:    `${item.bbox.y * 100}%` as any,
                width:  `${item.bbox.width * 100}%` as any,
                height: `${item.bbox.height * 100}%` as any,
                borderColor: meta.color,
                backgroundColor: OVERLAY_OPACITY[item.category],
              },
            ]}
          >
            <View style={[styles.bboxLabel, { backgroundColor: meta.color }]}>
              <Text style={styles.bboxLabelText} numberOfLines={1}>
                {meta.emoji} {item.item}
              </Text>
            </View>
          </View>
        );
      })}
    </View>

    {/* Header */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{items.length} items detected</Text>
      <Text style={styles.headerSub}>🌍 {totalSorted} sorted correctly</Text>
    </View>

    {/* Item list */}
    {items.map((item, i) => {
      const meta = getCategoryMeta(item.category);
      const impact = getItemImpact(item.item, item.category);
      return (
        <View key={i} style={styles.row}>
          <View style={[styles.rowDot, { backgroundColor: meta.color }]} />
          <View style={styles.rowInfo}>
            <Text style={styles.rowItem}>{item.item}</Text>
            <Text style={styles.rowMeta}>{meta.label} · {Math.round(item.confidence)}% confidence</Text>
            <Text style={styles.rowTip}>{item.tip}</Text>
            {(impact.kwhSaved > 0 || impact.co2Saved > 0) && (
              <View style={styles.chipRow}>
                {impact.kwhSaved > 0 && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>⚡ {impact.kwhSaved.toFixed(2)} kWh</Text>
                  </View>
                )}
                {impact.co2Saved > 0 && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>🌿 {impact.co2Saved.toFixed(2)} lbs CO₂</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      );
    })}

    <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
      <Text style={styles.resetBtnText}>↺  Scan Another</Text>
    </TouchableOpacity>

    <View style={{ height: 40 }} />
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#282A36' },
  imageWrapper: { width: '100%', aspectRatio: 4 / 3, position: 'relative' },
  image: { width: '100%', height: '100%' },
  bbox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'visible',
  },
  bboxLabel: {
    position: 'absolute',
    top: -22,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 120,
  },
  bboxLabelText: {
    fontSize: 10,
    fontFamily: 'KumbhSans_700Bold',
    color: '#282A36',
  },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'KumbhSans_800ExtraBold', color: '#F8F8F2' },
  headerSub: { fontSize: 12, fontFamily: 'KumbhSans_400Regular', color: '#6272A4', marginTop: 4 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#44475A',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
  },
  rowDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 4 },
  rowInfo: { flex: 1 },
  rowItem: { fontSize: 15, fontFamily: 'KumbhSans_700Bold', color: '#F8F8F2', textTransform: 'capitalize' },
  rowMeta: { fontSize: 12, fontFamily: 'KumbhSans_400Regular', color: '#6272A4', marginTop: 2 },
  rowTip: { fontSize: 13, fontFamily: 'KumbhSans_400Regular', color: '#F8F8F2', marginTop: 6, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: 'rgba(189,147,249,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  chipText: { fontSize: 11, fontFamily: 'KumbhSans_600SemiBold', color: '#BD93F9' },
  resetBtn: {
    backgroundColor: '#BD93F9', borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8,
  },
  resetBtnText: { fontFamily: 'KumbhSans_700Bold', fontSize: 16, color: '#282A36' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MultiResultView.tsx
git commit -m "feat: add MultiResultView with bounding box overlays"
```

---

## Task 4: Update PreviewView and App.tsx

**Files:**
- Modify: `ecosort-android/src/components/PreviewView.tsx`
- Modify: `ecosort-android/App.tsx`

All commands run from `C:\Users\jpcarlson\hackaz26\ecosort-ai\ecosort-android\`.

- [ ] **Step 1: Replace src/components/PreviewView.tsx**

Add `onAnalyzeMulti` prop and a second button:

```typescript
import React from 'react';
import { View, Image, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  imageUri: string;
  loading: boolean;
  onAnalyze: () => void;
  onAnalyzeMulti: () => void;
  onDiscard: () => void;
}

export const PreviewView: React.FC<Props> = ({ imageUri, loading, onAnalyze, onAnalyzeMulti, onDiscard }) => (
  <View style={styles.container}>
    <View style={styles.imageWrapper}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#BD93F9" />
          <Text style={styles.analyzingText}>Analyzing...</Text>
        </View>
      )}
      {!loading && (
        <TouchableOpacity style={styles.discardBtn} onPress={onDiscard}>
          <Text style={styles.discardBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>

    <TouchableOpacity
      style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
      onPress={onAnalyze}
      disabled={loading}
    >
      <Text style={styles.analyzeBtnText}>{loading ? 'Analyzing...' : 'Analyze Item'}</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.multiBtn, loading && styles.analyzeBtnDisabled]}
      onPress={onAnalyzeMulti}
      disabled={loading}
    >
      <Text style={styles.multiBtnText}>{loading ? 'Analyzing...' : 'Multi Item Analysis'}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#282A36' },
  imageWrapper: { borderRadius: 24, overflow: 'hidden', aspectRatio: 4 / 3, marginBottom: 16 },
  image: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(40,42,54,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  analyzingText: { fontSize: 14, fontFamily: 'KumbhSans_600SemiBold', color: '#F8F8F2' },
  discardBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(40,42,54,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  discardBtnText: { fontSize: 16, color: '#F8F8F2' },
  analyzeBtn: { backgroundColor: '#BD93F9', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  multiBtn: { backgroundColor: '#44475A', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center' },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { fontSize: 16, fontFamily: 'KumbhSans_700Bold', color: '#282A36' },
  multiBtnText: { fontSize: 16, fontFamily: 'KumbhSans_600SemiBold', color: '#F8F8F2' },
});
```

- [ ] **Step 2: Replace App.tsx**

```typescript
import React, { useEffect, useState } from 'react';
import { SafeAreaView, Alert, StyleSheet, View } from 'react-native';
import { useFonts, KumbhSans_400Regular, KumbhSans_600SemiBold, KumbhSans_700Bold, KumbhSans_800ExtraBold } from '@expo-google-fonts/kumbh-sans';
import { CaptureView } from './src/components/CaptureView';
import { PreviewView } from './src/components/PreviewView';
import { ResultCard } from './src/components/ResultCard';
import { MultiResultView } from './src/components/MultiResultView';
import { StatsScreen } from './src/components/StatsScreen';
import { classifyImage } from './src/api/classify';
import { classifyMulti } from './src/api/classifyMulti';
import { getItemImpact } from './src/lib/impact';
import { saveScan, getImpactTotals } from './src/lib/history';
import { Classification, ItemImpact, MultiClassification } from './src/types';
import { getSortedCount, incrementSortedCount } from './src/lib/storage';

type Phase = 'capture' | 'preview' | 'result' | 'multi-result' | 'stats';

export default function App() {
  const [fontsLoaded] = useFonts({
    KumbhSans_400Regular,
    KumbhSans_600SemiBold,
    KumbhSans_700Bold,
    KumbhSans_800ExtraBold,
  });

  const [phase, setPhase] = useState<Phase>('capture');
  const [imageUri, setImageUri] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Classification | null>(null);
  const [multiItems, setMultiItems] = useState<MultiClassification[]>([]);
  const [impact, setImpact] = useState<ItemImpact>({ kwhSaved: 0, co2Saved: 0, weightDiverted: 0 });
  const [sortedCount, setSortedCount] = useState(0);

  useEffect(() => {
    getSortedCount().then(setSortedCount);
  }, []);

  if (!fontsLoaded) return <View style={styles.loading} />;

  const handleImageSelected = (uri: string, base64: string) => {
    setImageUri(uri);
    setImageBase64(base64);
    setPhase('preview');
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
      const classification = await classifyImage(dataUrl);
      const itemImpact = getItemImpact(classification.item, classification.category);

      await saveScan({
        id: String(Date.now()),
        timestamp: Date.now(),
        item: classification.item,
        category: classification.category,
        kwhSaved: itemImpact.kwhSaved,
        co2Saved: itemImpact.co2Saved,
        weightDiverted: itemImpact.weightDiverted,
      });

      const newCount = await incrementSortedCount();
      setResult(classification);
      setImpact(itemImpact);
      setSortedCount(newCount);
      setPhase('result');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not analyze image. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeMulti = async () => {
    setLoading(true);
    try {
      const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
      const items = await classifyMulti(dataUrl);

      const now = Date.now();
      for (let i = 0; i < items.length; i++) {
        const imp = getItemImpact(items[i].item, items[i].category);
        await saveScan({
          id: String(now + i),
          timestamp: now,
          item: items[i].item,
          category: items[i].category,
          kwhSaved: imp.kwhSaved,
          co2Saved: imp.co2Saved,
          weightDiverted: imp.weightDiverted,
        });
      }
      await incrementSortedCount();
      const newCount = await getSortedCount();

      setMultiItems(items);
      setSortedCount(newCount);
      setPhase('multi-result');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not analyze image. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setMultiItems([]);
    setImageUri('');
    setImageBase64('');
    setPhase('capture');
  };

  return (
    <SafeAreaView style={styles.root}>
      {phase === 'capture' && (
        <CaptureView onImageSelected={handleImageSelected} />
      )}
      {phase === 'preview' && (
        <PreviewView
          imageUri={imageUri}
          loading={loading}
          onAnalyze={handleAnalyze}
          onAnalyzeMulti={handleAnalyzeMulti}
          onDiscard={handleReset}
        />
      )}
      {phase === 'result' && result && (
        <ResultCard
          result={result}
          imageUri={imageUri}
          totalSorted={sortedCount}
          impact={impact}
          onReset={handleReset}
          onViewStats={() => setPhase('stats')}
        />
      )}
      {phase === 'multi-result' && (
        <MultiResultView
          items={multiItems}
          imageUri={imageUri}
          totalSorted={sortedCount}
          onReset={handleReset}
        />
      )}
      {phase === 'stats' && (
        <StatsScreen onBack={() => setPhase('result')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#282A36' },
  loading: { flex: 1, backgroundColor: '#282A36' },
});
```

- [ ] **Step 3: Run all tests**

```bash
npx jest
```
Expected: 23 tests pass (20 existing + 3 new classifyMulti tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/PreviewView.tsx App.tsx
git commit -m "feat: add multi-item analysis mode to Android app"
```

- [ ] **Step 5: Test on phone**

```bash
npx expo start --clear
```
Scan QR with Expo Go. Test:
1. Take a photo of several items on a desk or tray
2. Tap "Multi Item Analysis"
3. Verify annotated image appears with coloured overlays on each item
4. Verify item list below shows each item with tip and impact chips
5. Tap "Scan Another" and verify it resets to capture

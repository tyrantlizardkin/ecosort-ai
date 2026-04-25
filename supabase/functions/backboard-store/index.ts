import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASSISTANT_ID = "2dd12281-1fc9-46b1-acc1-48cf5fb3b7b7";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { item, category, kwhSaved, co2Saved, weightDiverted, timestamp } = await req.json();
    const BACKBOARD_API_KEY = Deno.env.get("BACKBOARD_API_KEY") ?? "";

    const date = new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const content = `On ${date}, scanned a ${item} — ${category}. Saved ${Number(kwhSaved).toFixed(2)} kWh and ${Number(co2Saved).toFixed(2)} lbs CO₂. Diverted ${Number(weightDiverted).toFixed(2)} lbs from landfill.`;

    await fetch(`https://app.backboard.io/api/assistants/${ASSISTANT_ID}/memories`, {
      method: "POST",
      headers: { "X-API-Key": BACKBOARD_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ content, metadata: { item, category, kwhSaved, co2Saved, weightDiverted, timestamp } }),
    });
  } catch (_) { /* fire-and-forget — swallow all errors */ }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

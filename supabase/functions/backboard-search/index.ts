import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASSISTANT_ID = "2dd12281-1fc9-46b1-acc1-48cf5fb3b7b7";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ memories: [], total_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BACKBOARD_API_KEY = Deno.env.get("BACKBOARD_API_KEY") ?? "";
    const response = await fetch(`https://app.backboard.io/api/assistants/${ASSISTANT_ID}/memories/search`, {
      method: "POST",
      headers: { "X-API-Key": BACKBOARD_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 5 }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_) {
    return new Response(JSON.stringify({ memories: [], total_count: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

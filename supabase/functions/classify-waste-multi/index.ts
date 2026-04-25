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

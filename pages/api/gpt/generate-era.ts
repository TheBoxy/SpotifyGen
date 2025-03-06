// pages/api/gpt/generate-era.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

const timeRangeToText = {
  'short_term': 'last month',
  'medium_term': 'last 6 months',
  'long_term': 'last several years'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { tracks, timeRange = 'short_term' } = req.body;
  if (!tracks || tracks.length === 0) return res.status(400).json({ error: "No tracks provided" });
  
  // Get the human-readable time range description
  const timeRangeText = timeRangeToText[timeRange as TimeRange] || 'last month';
  
  const songList = tracks.map((t: { name: string; artists: { name: string }[] }) => `${t.name} by ${t.artists[0].name}`).join(", ");
  
  const prompt = `Talk in a gen z way/mindset. Based on this list of my top 10 most listened songs in the ${timeRangeText}: ${songList}, come up with a description of what era I'm currently in and make it sound cool.

Please format your response with the following structure:
1. Start with the era name defined in no more than 10 words, formatted with two asterisks like **Era Name**.
2. Then provide 3-4 clearly separated paragraphs:
   - First paragraph: A brief explanation of the era and its overall vibe
   - Second paragraph: Analysis of the music's genre, BPM, emotional themes
   - Third paragraph: Specific insights about my personality or lifestyle based on these songs
   - Final paragraph: Suggest 3 cartoon characters that match this vibe, formatted as a bulleted list

Use emoji where appropriate to add visual interest. Use bold for important phrases by surrounding them with double asterisks like **this is bold**. Don't mention Gen Z in the response and make it sound cool not nerdy, chill. Each paragraph should be clearly separated.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a music analyst with a background in psychology who creates visually appealing, well-formatted text responses." },
        { role: "user", content: prompt }
      ],
    });

    const gptResponse = response.choices[0]?.message?.content;
    if (!gptResponse) return res.status(500).json({ error: "Failed to generate response from OpenAI" });
    
    const headerMatch = gptResponse.match(/\*\*(.*?)\*\*/);
    const header = headerMatch ? headerMatch[1] : "Your Current Era";

    // Remove the first matched header from the response but keep the rest of the formatting
    const explanation = headerMatch ? gptResponse.replace(headerMatch[0], "").trim() : gptResponse.trim();

    res.status(200).json({ era: explanation, header });
  } catch (error) {
    console.error("Error generating era:", error);
    res.status(500).json({ error: "Failed to generate era", details: String(error) });
  }
}

// pages/api/gpt/generate-era.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { tracks } = req.body;
  if (!tracks || tracks.length === 0) return res.status(400).json({ error: "No tracks provided" });
  
  
  const songList = tracks.map((t: { name: string; artists: { name: string }[] }) => `${t.name} by ${t.artists[0].name}`).join(", ");
  
  const prompt = `Talk in a gen z way/mindset. Based on this list of my top 10 most listened songs in the past month: ${songList}, come up with a description of what era Im currently in. This era should be defined in no more than 10 words and should be stated in the first sentence alone. Then decribe the explaination for the era. Then describe the era in way that anaylzes and comes up with an accurate description based on the songs genre, name, bpm, emotions and descriptions that can be found in genius.com. Don't mention Gen z in the response and make it sound cool not nerdy, chill. Then give 3 suggestions on cartoon characters that match this vibe.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Change from "gpt-4" to "gpt-4-turbo"
    messages: [
      { role: "system", content: "You are a music analyst with a background in psychology." },
      { role: "user", content: prompt }
    ],
  });

  const gptResponse = response.choices[0]?.message?.content;
  if (!gptResponse) return res.status(500).json({ error: "Failed to generate response from OpenAI" });
  const headerMatch = gptResponse.match(/\*\*(.*?)\*\*/);
  const header = headerMatch ? headerMatch[1] : "Your Current Era";

  // Remove the first sentence from the response
  const explanation = headerMatch ? gptResponse.replace(headerMatch[0], "").trim() : gptResponse.trim();

  res.status(200).json({ era: explanation, header });
}

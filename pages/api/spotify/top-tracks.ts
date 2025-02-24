import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import fetch from "node-fetch"; 


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getSession({ req });
    if (!session || !session.accessToken) {
        return res.status(401).json({ error: "Unauthorized - No access token" });
    }


    try {
        const response = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term", {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Spotify API Error:", error);
            return res.status(401).json(error);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

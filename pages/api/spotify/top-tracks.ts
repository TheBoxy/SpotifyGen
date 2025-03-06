import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import fetch from "node-fetch"; 

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const session = await getSession({ req });
        
        if (!session) {
            return res.status(401).json({ error: "Unauthorized - No session found" });
        }
        
        if (!session.accessToken) {
            return res.status(401).json({ error: "Unauthorized - No access token found" });
        }

        // Get the time range from query parameters or default to short_term (last month)
        const timeRange = (req.query.timeRange as TimeRange) || 'short_term';
        
        // Validate timeRange to ensure it's one of the allowed values
        if (!['short_term', 'medium_term', 'long_term'].includes(timeRange)) {
            return res.status(400).json({ 
                error: "Invalid time range",
                message: "Time range must be one of: short_term, medium_term, long_term" 
            });
        }

        const spotifyApiUrl = `https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=${timeRange}`;
        
        const response = await fetch(spotifyApiUrl, {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
            },
        });

        // Handle API errors with more detailed responses
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Spotify API Error:", {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            
            // Return specific status code to trigger token refresh if needed
            if (response.status === 401) {
                return res.status(401).json({
                    error: "Spotify token expired",
                    details: errorData
                });
            }
            
            return res.status(response.status).json({
                error: "Spotify API error",
                details: errorData
            });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error("Server Error in top-tracks API:", error);
        return res.status(500).json({ error: "Internal server error", details: String(error) });
    }
}

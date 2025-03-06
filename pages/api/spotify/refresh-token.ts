import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try to get the session first
    const session = await getSession({ req });
    
    // If no session, try to get the JWT token directly 
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!session && !token) {
      return res.status(401).json({ error: "Unauthorized - No session or token found" });
    }
    
    // Get refresh token from session or token
    const refreshToken = (session?.refreshToken as string) || (token?.refreshToken as string);
    
    if (!refreshToken) {
      console.error("No refresh token found in session or token");
      return res.status(400).json({ error: "No refresh token available" });
    }
    
    console.log("Refreshing token with Spotify...");
    
    const tokenEndpoint = "https://accounts.spotify.com/api/token";
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");
    
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Spotify token refresh failed:", data);
      return res.status(response.status).json({
        error: "Failed to refresh token",
        details: data
      });
    }

    // Important: The refresh token might not always be returned by Spotify
    // We need to handle this case by keeping the old refresh token if a new one isn't provided
    const newRefreshToken = data.refresh_token || refreshToken;
    
    console.log("Token refreshed successfully");

    res.status(200).json({ 
      accessToken: data.access_token, 
      refreshToken: newRefreshToken,
      expires_in: data.expires_in
    });
  } catch (error) {
    console.error("Server error during token refresh:", error);
    res.status(500).json({ error: "Internal server error during token refresh" });
  }
}
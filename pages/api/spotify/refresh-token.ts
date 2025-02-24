import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  
  if (!session) {
    return res.status(401).json({ error: "Unathorized" });
  }

  const refreshToken = session.refreshToken;
  
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  console.log(data);

  if (!response.ok) {
    return res.status(response.status).json(data);
    console.log("Failed to refresh access token", data);
  }

  // Update the session with the new access token
  session.accessToken = data.access_token;
  session.refreshToken = data.refresh_token;


  res.status(200).json({ accessToken: data.access_token, refreshToken: data.refresh_token });
}
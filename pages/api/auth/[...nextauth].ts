import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

export default NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: "https://accounts.spotify.com/authorize?scope=user-top-read",
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Add access token to session
      session.accessToken = token.access_token as string;
      session.refreshToken = token.refreshToken as string;
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.access_token = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
  },
});
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
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour - set slightly shorter than Spotify's 1 hour token expiry
  },
  callbacks: {
    async session({ session, token }) {
      // Add tokens to session
      session.accessToken = token.access_token as string;
      session.refreshToken = token.refreshToken as string;
      session.tokenExpiry = token.tokenExpiry as number;
      session.error = token.error as string | undefined;
      return session;
    },
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          access_token: account.access_token,
          refreshToken: account.refresh_token,
          tokenExpiry: Math.floor(Date.now() / 1000) + (account.expires_in as number),
          user,
        };
      }

      // Return the token if it's still valid
      if (token.tokenExpiry && (Math.floor(Date.now() / 1000) < (token.tokenExpiry as number))) {
        return token;
      }

      // Token has expired, don't try to refresh here (we'll handle that separately)
      return {
        ...token,
        error: "TokenExpired",
      };
    },
  },
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/",
    error: "/",
  },
});
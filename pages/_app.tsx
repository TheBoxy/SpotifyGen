// pages/_app.tsx
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import '../pages/index.css'; // Or wherever your CSS is located
import Head from 'next/head';


function MyApp({ Component, pageProps }: AppProps) {
  return (
    
    <SessionProvider session={pageProps.session}>
      <link rel="icon" href="/favicon.ico" />
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;

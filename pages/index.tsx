import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import styles from './Home.module.css'; // Import the CSS module



interface Track {
  album: {
    images: { url: string }[];
  };
  name: string;
  artists: { name: string }[];
}

interface TracksResponse {
  items: Track[];
}

interface GptResponse {
  era: string;
  header: string;
}

export default function Home() {
  const { data: session } = useSession();
  const [era, setEra] = useState<string | null>(null);
  const [header, setHeader] = useState<string>("Your Current Era");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showTracks, setShowTracks] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshAccessToken = async () => {
    
    const res = await fetch("/api/spotify/refresh-token");
    const data = await res.json();
    

    if (res.ok) {
        if (session) {
          session.accessToken = data.accessToken;
          session.refreshToken = data.refreshToken;
        }
      }
   
  };

  const handleGenerateEra = async () => {
    setLoading(true);
    if (!session) {
      console.error("No session found");
      setLoading(false);
      return;
    }

    let tracksRes = await fetch("/api/spotify/top-tracks", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (tracksRes.status === 401) {
      await refreshAccessToken();
      tracksRes = await fetch("/api/spotify/top-tracks", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    }

    const tracksData: TracksResponse = await tracksRes.json();
    
    if (Array.isArray(tracksData.items)) {
      setTracks(tracksData.items);
      setShowTracks(true); // Show the tracks section after fetching the tracks
    } else {
      console.error("tracksData.items is not an array", tracksData.items);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/gpt/generate-era", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tracks: tracksData.items })
    });
    
    const gptRes: GptResponse = await res.json();
    setEra(gptRes.era);
    setHeader(gptRes.header);
    setLoading(false);
  };

  return (
    
    <main className={`${styles.main} flex flex-col items-center justify-center h-screen text-white p-6`}>
      <h1 className="text-5xl font-extrabold drop-shadow-lg text-center mb-6">Spotify Era Generator</h1>
      {session ? (
        <div className="flex flex-col items-center gap-6 mt-6 p-6 bg-gray-200 text-black rounded-xl shadow-lg w-full max-w-4xl">
          <button
            onClick={handleGenerateEra}
            className="mb-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all"
          >
            Generate Your Era
          </button>
          {loading && <div className={styles.spinner}></div>}
          {showTracks && !loading && (
            <div className="flex flex-row gap-6 mt-6 w-full">
              <div className="flex flex-col bg-gray-100 p-4 rounded-lg shadow-md w-1/3">
                <h2 className="text-xl font-bold mb-3">Top Tracks (Month)</h2>
                {tracks.map((track, index) => (
                  <div key={index} className="flex items-center gap-3 mb-2">
                    <img src={track.album.images[0].url} alt={track.name} className="w-12 h-12 rounded-md" />
                    <p className="text-sm font-medium">{track.name} by {track.artists.map(artist => artist.name).join(", ")}</p>
                  </div>
                ))}
              </div>
              <div className={`flex flex-col items-center bg-gray-100 p-6 rounded-lg shadow-md w-2/3 max-h-96 overflow-y-auto`}>
                <h2 className="text-2xl font-bold mb-4">{header}</h2>
                {era && (
                  <div className="p-4 bg-white border border-gray-300 rounded-lg shadow-lg flex flex-col items-center w-full">
                    <p className="text-lg font-semibold text-center break-words w-full">{era}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn("spotify")}
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all"
        >
          Sign in with Spotify
        </button>
      )}
    </main>
  );
}


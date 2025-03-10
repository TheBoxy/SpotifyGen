import { useSession, signIn, signOut, getSession } from "next-auth/react";
import { useState, useCallback, useEffect, useRef } from "react";
import styles from './Home.module.css'; // Import the CSS module
import Head from 'next/head';
import html2canvas from 'html2canvas';

// Function to extract cartoon characters from text
const extractCharacters = (text: string) => {
  if (!text) return [];
  
  // Improved regex to better capture cartoon character sections
  // Look for sections that might contain character information with more flexible patterns
  const characterSectionRegex = /(?:cartoon characters|characters that match|match this vibe)[:\s]*([\s\S]*?)(?:\n\n\n|$)/i;
  const characterSection = text.match(characterSectionRegex);
  
  if (!characterSection || !characterSection[1]) {
    // Fallback approach: look for any bullet points near the end of the text
    const lines = text.split('\n');
    const lastFewLines = lines.slice(Math.max(0, lines.length - 10)); // Get last 10 lines
    const bulletPoints = lastFewLines.filter(line => line.trim().match(/^[-•*\d.]/));
    
    if (bulletPoints.length > 0) {
      return bulletPoints.map(item => {
        const cleanItem = item.replace(/^[-•*\d.\s]+/, '').trim();
        
        // Try to separate character name from description
        let name = cleanItem;
        let description = '';
        
        const separatorMatch = cleanItem.match(/^(.*?)(?:[:\-—]|\s+-\s+|\s+—\s+|–\s+)(.*)/);
        if (separatorMatch) {
          name = separatorMatch[1].trim();
          description = separatorMatch[2].trim();
        }
        
        return { name, description };
      });
    }
    
    // If all else fails, return empty array
    return [];
  }
  
  // Extract individual character mentions using bullet points or numbers
  const characterItems = characterSection[1].split(/\n/).filter(line => line.trim().match(/^[-•*\d.]/));
  
  // If no bullet points found but section exists, try to break by character names
  if (characterItems.length === 0) {
    const possibleCharacters = characterSection[1].split(/\d+\.\s+|\n+/g)
      .filter(item => item.trim().length > 0)
      .map(item => item.trim());
    
    return possibleCharacters.map(item => {
      // Try to separate character name from description
      let name = item;
      let description = '';
      
      const separatorMatch = item.match(/^(.*?)(?:[:\-—]|\s+-\s+|\s+—\s+|–\s+)(.*)/);
      if (separatorMatch) {
        name = separatorMatch[1].trim();
        description = separatorMatch[2].trim();
      }
      
      return { name, description };
    });
  }
  
  // Process each character mention to extract name and description
  return characterItems.map(item => {
    // Remove bullet point or number
    const cleanItem = item.replace(/^[-•*\d.\s]+/, '').trim();
    
    // Try to separate character name from description
    let name = cleanItem;
    let description = '';
    
    // Look for separators like ":" or "-" or "—" to split name and description
    const separatorMatch = cleanItem.match(/^(.*?)(?:[:\-—]|\s+-\s+|\s+—\s+|–\s+)(.*)/);
    if (separatorMatch) {
      name = separatorMatch[1].trim();
      description = separatorMatch[2].trim();
    }
    
    return { name, description };
  });
};

// Function to generate a consistent color based on character name
const getCharacterColor = (name: string) => {
  // Define a set of vibrant colors that work well for avatars
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Light Blue
    '#8675A9', // Purple
    '#FFBE0B', // Yellow
    '#4CAF50', // Green
    '#FB5607', // Orange
    '#3A86FF', // Blue
    '#FF006E', // Pink
    '#8338EC', // Violet
    '#06D6A0', // Mint
    '#FF9F1C', // Amber
  ];
  
  // Use a simple hash function to get a consistent color for the same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color from the array
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

// Component to render character avatars consistently
const CharacterAvatar = ({ name }: { name: string }) => {
  const backgroundColor = getCharacterColor(name);
  
  // Generate initials: up to 2 characters from the name
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  return (
    <div 
      className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-md"
      style={{ backgroundColor }}
    >
      {initials}
    </div>
  );
};

// Function to convert markdown-like text to HTML with enhanced styling
const formatEraText = (text: string) => {
  if (!text) return "";
  
  // Replace bold text (**text**) with styled spans
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-green-700">$1</span>');
  
  // Add styling to emoji to make them stand out more
  formattedText = formattedText.replace(/([\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/ug, 
    '<span class="text-lg md:text-xl inline-block transform hover:scale-125 transition-transform">$1</span>');
  
  // Split by double line breaks to create paragraphs
  const paragraphs = formattedText.split(/\n\n+/);
  
  return paragraphs.map((para, index) => {
    // Check if this is a bullet list (lines starting with - or • or *)
    if (para.trim().match(/^[-•*]/m)) {
      const listItems = para.split(/\n/).filter(item => item.trim().length > 0);
      
      return (
        <div key={index} className="mb-6 bg-gray-50 p-3 rounded-md shadow-sm">
          <ul className="list-disc pl-5 space-y-2">
            {listItems.map((item, i) => (
              <li key={i} className="text-sm md:text-base" 
                  dangerouslySetInnerHTML={{ __html: item.replace(/^[-•*]\s*/, '') }} />
            ))}
          </ul>
        </div>
      );
    }
    
    // Regular paragraph with custom styling for the first paragraph (summary)
    return (
      <p key={index} 
         className={`mb-5 text-sm md:text-base leading-relaxed ${index === 0 ? 'font-medium border-l-4 border-purple-400 pl-3 py-1' : ''}`} 
         dangerouslySetInnerHTML={{ __html: para }} />
    );
  });
};

interface Track {
  album: {
    images: { url: string }[];
  };
  name: string;
  artists: { name: string }[];
}

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  description: string;
}

// ShareModal Component
const ShareModal = ({ isOpen, onClose, header, characters }: { 
  isOpen: boolean, 
  onClose: () => void, 
  header: string, 
  characters: { name: string, description: string }[]
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  
  const handleCopyLink = () => {
    // Create a sharable text
    const shareText = `My Spotify Era is: ${header}\n\nMatching Cartoon Characters:\n${
      characters.map(char => `- ${char.name}: ${char.description}`).join('\n')
    }\n\nGenerate your own era at https://spotify-era-generator.vercel.app/`;
    
    navigator.clipboard.writeText(shareText)
      .then(() => alert("Copied to clipboard!"))
      .catch(err => console.error("Failed to copy: ", err));
  };
  
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    
    try {
      setDownloading(true);
      
      // Use html2canvas with settings optimized for our content
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#FFFFFF',
        logging: false,
        onclone: (_, element) => {
          // Make sure all elements are visible
          element.querySelectorAll('*').forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.display = el.style.display === 'none' ? 'none' : 'block';
            }
          });
        }
      });
      
      // Convert canvas to data URL
      const imageUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUrl;
      downloadLink.download = `spotify-era-${header.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setDownloading(false);
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to download image. Try again or use the Copy to Clipboard option instead.");
      setDownloading(false);
    }
  };
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">Share Your Era</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Shareable Card */}
        <div className="p-5">
          <div ref={cardRef} className="bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 p-5 rounded-lg shadow-md">
            <div className="bg-white p-4 rounded-md shadow-inner">
              <h2 className="text-2xl font-bold text-center text-purple-700 mb-3">
                {header}
              </h2>
              
              <p className="text-gray-600 text-sm italic text-center mb-4">
                My Spotify Era based on my top tracks
              </p>
              
              <div className="space-y-4 mb-4">
                <h3 className="font-medium text-gray-700 border-b pb-1">
                  Cartoon Characters That Match My Vibe:
                </h3>
                
                {/* Ensure we display up to 3 characters even if more are extracted */}
                {characters.slice(0, 3).map((char, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                    <CharacterAvatar name={char.name} />
                    <div>
                      <h4 className="font-bold text-purple-600">{char.name}</h4>
                      <p className="text-sm text-gray-600">{char.description}</p>
                    </div>
                  </div>
                ))}
                
                {/* Fallback message if no characters are found */}
                {characters.length === 0 && (
                  <div className="p-3 text-center text-gray-500 italic">
                    Characters could not be extracted from your era description.
                  </div>
                )}
              </div>
              
              <div className="text-center text-sm text-gray-500">
                Generate your Spotify Era at{' '}
                <a 
                  href="https://spotify-era-generator.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline font-medium"
                >
                  spotify-era-generator.vercel.app
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex p-4 border-t bg-gray-50">
          <button 
            onClick={handleCopyLink}
            className="flex-1 mr-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Copy to Clipboard
          </button>
          <button 
            onClick={handleDownloadImage}
            disabled={downloading}
            className={`flex-1 ml-2 py-2 px-4 ${downloading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md transition-colors flex items-center justify-center`}
          >
            {downloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Download as Image'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const { data: session, update: updateSession } = useSession();
  const [era, setEra] = useState<string | null>(null);
  const [header, setHeader] = useState<string>("Your Current Era");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showTracks, setShowTracks] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("short_term");
  const [timeRangeChanged, setTimeRangeChanged] = useState<boolean>(false);
  
  // New state for share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [characters, setCharacters] = useState<{ name: string, description: string }[]>([]);
  
  const timeRangeOptions: TimeRangeOption[] = [
    { value: "short_term", label: "Last Month", description: "Your top tracks from the past 4 weeks" },
    { value: "medium_term", label: "Last 6 Months", description: "Your top tracks from the past 6 months" },
    { value: "long_term", label: "Last 12+ Months", description: "Your top tracks from the past several years" }
  ];
  
  // Reset the page when time period changes
  useEffect(() => {
    // Reset to default state, similar to initial load
    setEra(null);
    setHeader("Your Current Era");
    setTracks([]);
    setShowTracks(false);
    
    // Only set this to true if it's not the initial render
    if (selectedTimeRange) {
      setTimeRangeChanged(true);
    }
  }, [selectedTimeRange]);
  
  // Function to handle time range selection
  const handleTimeRangeSelect = (newTimeRange: TimeRange) => {
    if (newTimeRange !== selectedTimeRange) {
      setSelectedTimeRange(newTimeRange);
      // Additional reset logic is handled by the useEffect above
    }
  };

  const refreshAccessToken = useCallback(async () => {
    try {
      console.log("Refreshing access token...");
      const res = await fetch("/api/spotify/refresh-token");
      
      if (!res.ok) {
        console.error("Failed to refresh token:", await res.text());
        return false;
      }
      
      const data = await res.json();
      
      // Update the session with the new tokens using the update method from useSession
      await updateSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || (session?.refreshToken as string)
      });
      
      console.log("Token refreshed successfully");
      return true;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    }
  }, [session, updateSession]);

  const handleGenerateEra = async () => {
    setLoading(true);
    setEra(null); // Reset any previous era data
    setTimeRangeChanged(false); // Reset the prompt when generating
    
    try {
      if (!session) {
        console.error("No session found");
        setLoading(false);
        return;
      }

      // Function to fetch tracks with the current token
      const fetchTracks = async (token: string) => {
        const response = await fetch(`/api/spotify/top-tracks?timeRange=${selectedTimeRange}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        return response;
      };

      // First attempt using current token
      let tracksRes = await fetchTracks(session.accessToken as string);

      // If unauthorized, try to refresh token and retry
      if (tracksRes.status === 401 || tracksRes.status === 403) {
        console.log("Token expired, attempting to refresh...");
        const refreshSuccessful = await refreshAccessToken();
        
        if (!refreshSuccessful) {
          console.error("Failed to refresh token, signing out");
          signOut();
          setLoading(false);
          return;
        }

        // Get the updated session
        const updatedSession = await getSession();
        if (!updatedSession?.accessToken) {
          console.error("No token after refresh, signing out");
          signOut();
          setLoading(false);
          return;
        }
        
        // Retry with new token
        tracksRes = await fetchTracks(updatedSession.accessToken as string);
        
        // If still failing, give up
        if (tracksRes.status === 401 || tracksRes.status === 403) {
          console.error("Still unauthorized after token refresh");
          signOut();
          setLoading(false);
          return;
        }
      }

      // Handle other API errors
      if (!tracksRes.ok) {
        console.error("Failed to fetch tracks:", await tracksRes.text());
        setLoading(false);
        return;
      }

      const tracksData = await tracksRes.json();
      
      if (!Array.isArray(tracksData.items)) {
        console.error("tracksData.items is not an array", tracksData);
        setLoading(false);
        return;
      }
      
      setTracks(tracksData.items);
      setShowTracks(true);

      // Generate the era
      const res = await fetch("/api/gpt/generate-era", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          tracks: tracksData.items,
          timeRange: selectedTimeRange
        })
      });
      
      if (!res.ok) {
        console.error("Failed to generate era:", await res.text());
        setLoading(false);
        return;
      }
      
      const gptRes = await res.json();
      setEra(gptRes.era);
      setHeader(gptRes.header);
      
      // Extract cartoon characters for sharing
      const extractedCharacters = extractCharacters(gptRes.era);
      setCharacters(extractedCharacters);
      
    } catch (error) {
      console.error("Error generating era:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to open share modal
  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <title>Spotify Era Generator</title>
      </Head>
      
      <main className={`${styles.main} flex flex-col items-center px-4 py-6 min-h-screen text-white`}>
        <h1 className="text-3xl md:text-5xl font-extrabold drop-shadow-lg text-center mb-4 md:mb-6">Spotify Era Generator</h1>
        {session ? (
          <div className="flex flex-col items-center gap-4 p-4 md:p-6 bg-gray-200 text-black rounded-xl shadow-lg w-full max-w-4xl overflow-hidden">
            <div className="w-full">
              <h2 className="text-lg font-semibold mb-2">Select Time Period:</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 justify-between mb-3">
                {timeRangeOptions.map((option) => (
                  <div 
                    key={option.value}
                    className={`flex-1 p-2 md:p-3 rounded-lg cursor-pointer transition-all border-2 ${
                      selectedTimeRange === option.value 
                        ? 'bg-green-500 text-white border-green-600' 
                        : 'bg-gray-100 hover:bg-gray-300 border-gray-300'
                    }`}
                    onClick={() => handleTimeRangeSelect(option.value)}
                  >
                    <h3 className="font-bold text-sm md:text-base">{option.label}</h3>
                    <p className="text-xs mt-1 hidden sm:block">{option.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {timeRangeChanged && !loading && !showTracks && (
              <div className="text-center p-2 md:p-3 bg-blue-100 text-blue-700 rounded-lg w-full mb-2 animate-pulse">
                <p className="text-sm md:text-base">Time period updated! Click &quot;Generate Your Era&quot; to see your new results.</p>
              </div>
            )}
            
            <button
              onClick={handleGenerateEra}
              className={`w-full md:w-auto mb-3 px-4 py-2 md:px-6 md:py-3 ${timeRangeChanged ? 'bg-green-600 animate-pulse' : 'bg-green-500'} hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all`}
            >
              Generate Your Era
            </button>
            
            {loading && <div className={styles.spinner}></div>}
            
            {/* Results section */}
            {showTracks && !loading && (
              <div className="flex flex-col md:flex-row w-full gap-4 overflow-hidden">
                {/* Tracks section */}
                <div className="flex flex-col bg-gray-100 p-3 rounded-lg shadow-md w-full md:w-1/3">
                  <h2 className="text-lg md:text-xl font-bold mb-2">
                    {selectedTimeRange === "short_term" ? "Top Tracks (Last Month)" : 
                     selectedTimeRange === "medium_term" ? "Top Tracks (Last 6 Months)" : 
                     "Top Tracks (Last 12+ Months)"}
                  </h2>
                  <div className={`${styles.scrollingCard} flex flex-col gap-1 overflow-y-auto px-1 py-1 max-h-48 md:max-h-[calc(100vh-22rem)]`}>
                    {tracks.map((track, index) => (
                      <div key={index} className="flex items-center gap-2 mb-1 p-1 border-b border-gray-100">
                        <img src={track.album.images[0].url} alt={track.name} className="w-10 h-10 rounded-md flex-shrink-0" />
                        <p className="text-sm font-medium line-clamp-2 flex-1">{track.name} by {track.artists.map(artist => artist.name).join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Era section */}
                <div className="flex flex-col bg-gray-100 p-3 md:p-4 rounded-lg shadow-md w-full md:w-2/3">
                  <div className="flex items-center justify-center mb-3 md:mb-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-green-500 to-transparent w-12 md:w-16 mr-3"></div>
                    <h2 className="text-center text-lg md:text-2xl font-bold text-green-800">{header}</h2>
                    <div className="h-px bg-gradient-to-r from-transparent via-green-500 to-transparent w-12 md:w-16 ml-3"></div>
                  </div>
                  
                  {era && (
                    <>
                      <div className="p-3 md:p-4 bg-white border border-gray-300 rounded-lg shadow-lg w-full h-full">
                        <div className={`${styles.scrollingCard} overflow-y-auto pr-2 md:max-h-[calc(100vh-24rem)]`}>
                          <div className="prose prose-sm md:prose-base max-w-none">
                            {formatEraText(era)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Share Button */}
                      <button
                        onClick={handleOpenShareModal}
                        className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-all flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        Share My Era
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Sign out button */}
            <button
              onClick={() => signOut()}
              className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all w-full md:w-auto"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("spotify")}
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all"
          >
            Sign in with Spotify
          </button>
        )}
      </main>
      
      {/* Share Modal */}
      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        header={header}
        characters={characters}
      />
    </>
  );
}


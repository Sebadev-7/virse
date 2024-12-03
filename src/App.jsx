import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import ReactPlayer from "react-player";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Copy,
  Tv
} from "lucide-react";

const socket = io("http://localhost:3000");

function App() {
  const [roomCode, setRoomCode] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [playingVideo, setPlayingVideo] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerRef, setPlayerRef] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showIcons, setShowIcons] = useState(true);

  useEffect(() => {
    socket.on("play_video", (url) => {
      setPlayingVideo(url);
      setIsPlaying(true);
    });

    socket.on("pause_video", () => {
      setIsPlaying(false);
    });

    socket.on("rewind_video", () => {
      if (playerRef) {
        const currentTime = playerRef.getCurrentTime();
        playerRef.seekTo(currentTime - 10);
      }
    });

    socket.on("fast_forward_video", () => {
      if (playerRef) {
        const currentTime = playerRef.getCurrentTime();
        playerRef.seekTo(currentTime + 10);
      }
    });

    socket.on("room_closed", () => {
      alert("El host cerró la sala.");
      setJoinedRoom(false);
      setIsHost(false);
    });

    return () => {
      socket.off("play_video");
      socket.off("pause_video");
      socket.off("rewind_video");
      socket.off("fast_forward_video");
      socket.off("room_closed");
    };
  }, [playerRef]);

  const createRoom = () => {
    socket.emit("create_room", null, (code) => {
      setRoomCode(code);
      setIsHost(true);
      setJoinedRoom(true);
    });
  };

  const joinRoom = () => {
    socket.emit("join_room", roomCode, ({ success, message }) => {
      if (success) setJoinedRoom(true);
      else alert(message);
    });
  };

  const playVideo = () => {
    if (isHost) {
      socket.emit("play_video", { roomCode, videoUrl });
    }
  };

  const pauseVideo = () => {
    if (isHost) {
      socket.emit("pause_video", { roomCode });
    }
  };

  const rewindVideo = () => {
    if (isHost) {
      socket.emit("rewind_video", { roomCode });
    }
  };

  const fastForwardVideo = () => {
    if (isHost) {
      socket.emit("fast_forward_video", { roomCode });
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
    setIsPlaying(!isPlaying);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const toggleIcons = () => {
    setShowIcons(!showIcons);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] flex flex-col">
      {/* Mobile Header */}
      {joinedRoom && showControls && (
        <header className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-[#1E293B]/90 to-[#0F172A]/90 backdrop-blur-sm p-3 flex justify-between items-center`}>
          {showIcons && (
            <div className="text-xs text-[#94A3B8] font-medium flex items-center">
              <Tv className="w-4 h-4 mr-2 text-[#38BDF8]" />
              Dodi
            </div>
          )}
          {showIcons && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#E2E8F0] bg-[#1E293B]/50 px-2 py-1 rounded-full">
                Sala: {roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="text-[#38BDF8] hover:text-[#7DD3FC] transition-colors"
              >
                {copied ? (
                  <span className="text-xs text-[#10B981]">Copiado!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className="flex-grow pt-12">
        {!joinedRoom ? (
          <div className="px-4 space-y-4">
            <button
              onClick={createRoom}
              className="w-full bg-gradient-to-r from-[#4338CA] to-[#3730A3] text-white py-3 rounded-lg hover:from-[#5B21B6] hover:to-[#4338CA] transition"
            >
              Crear Sala
            </button>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Código de sala"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="flex-grow px-4 py-2 bg-[#1E293B] border-[#334155] text-[#E2E8F0] border rounded-lg focus:ring-2 focus:ring-[#38BDF8] transition"
              />
              <button
                onClick={joinRoom}
                className="bg-gradient-to-r from-[#047857] to-[#065F46] text-white px-4 py-2 rounded-lg hover:from-[#059669] hover:to-[#047857] transition"
              >
                Unirse
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {playingVideo && (
              <div className="w-full aspect-video bg-black">
                <ReactPlayer
                  ref={(player) => setPlayerRef(player)}
                  url={playingVideo}
                  playing={isPlaying}
                  width="100%"
                  height="100%"
                  controls={true} // Habilitar los controles de YouTube
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Controls */}
      {joinedRoom && showControls && (
        <footer className={`absolute bottom-0 left-0 right-0 bg-gradient-to-r from-[#1E293B]/90 to-[#0F172A]/90 backdrop-blur-sm p-4`}>
          {isHost && (
            <div className="px-4 mb-4">
              <input
                type="text"
                placeholder="URL del video de YouTube"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-4 py-2 bg-[#1E293B] border-[#334155] text-[#E2E8F0] border rounded-lg focus:ring-2 focus:ring-[#38BDF8] transition"
              />
              <button
                onClick={playVideo}
                className="mt-2 w-full bg-gradient-to-r from-[#4338CA] to-[#3730A3] text-white py-3 rounded-lg hover:from-[#5B21B6] hover:to-[#4338CA] transition"
              >
                Reproducir
              </button>
            </div>
          )}
          {playingVideo && (
            <div className="flex justify-center items-center space-x-6">
              <button
                onClick={rewindVideo}
                className="text-[#94A3B8] hover:text-[#38BDF8] transition"
              >
                <Rewind size={32} />
              </button>
              <button
                onClick={togglePlay}
                className="bg-gradient-to-r from-[#4338CA] to-[#3730A3] text-white p-3 rounded-full hover:from-[#5B21B6] hover:to-[#4338CA] transition shadow-lg shadow-[#4338CA]/30"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={fastForwardVideo}
                className="text-[#94A3B8] hover:text-[#38BDF8] transition"
              >
                <FastForward size={32} />
              </button>
            </div>
          )}
        </footer>
      )}

      {/* Mobile Control Points */}
      {joinedRoom && (
        <div className="fixed right-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center space-y-4">
          <button
            onClick={toggleControls}
            className="bg-[#1E293B]/50 p-2 rounded-full hover:bg-[#1E293B]/70 transition"
          >
            <Tv className="w-6 h-6 text-[#38BDF8]" />
          </button>
          <button
            onClick={toggleIcons}
            className="bg-[#1E293B]/50 p-2 rounded-full hover:bg-[#1E293B]/70 transition"
          >
            <Copy className="w-6 h-6 text-[#38BDF8]" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

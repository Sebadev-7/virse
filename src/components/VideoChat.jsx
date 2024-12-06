import React, { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import { Mic, MicOff, Video, VideoOff, Copy } from "lucide-react";

const VideoChat = ({ isHost, isPlaying, videoUrl, setPeerId, remotePeerId, initiateCall }) => {
  const [peer, setPeer] = useState(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Iniciando...");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [error, setError] = useState("");
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const initializePeer = () => {
      const peerInstance = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ]
        }
      });

      setPeer(peerInstance);

      peerInstance.on("open", (id) => {
        setMyPeerId(id);
        setConnectionStatus("Listo para conectar");
        setPeerId(id); // Set the peer ID in the parent component
      });

      peerInstance.on("error", (err) => {
        console.error("Error de PeerJS:", err);
        setError(`Error de conexión: ${err.type}`);
      });

      peerInstance.on("call", handleIncomingCall);

      return peerInstance;
    };

    const peerInstance = initializePeer();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peerInstance.destroy();
    };
  }, [setPeerId]);

  const getMediaStream = async (withVideo = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (!withVideo) {
        stream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
      }

      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      throw err;
    }
  };

  const handleIncomingCall = async (call) => {
    try {
      setIsIncomingCall(true);
      setCurrentCall(call);
      setConnectionStatus("Llamada entrante...");

      const stream = await getMediaStream(isVideoEnabled);
      setLocalStream(stream);
      localVideoRef.current.srcObject = stream;

      call.answer(stream);
      call.on("stream", handleRemoteStream);
      call.on("close", handleCallEnd);

      setIsIncomingCall(false);
    } catch (err) {
      setError(`Error al acceder a dispositivos: ${err.message}`);
    }
  };

  const handleRemoteStream = (remoteStream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      setConnectionStatus("Conectado");
    }
  };

  const handleCallEnd = () => {
    setConnectionStatus("Llamada finalizada");
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  const startCall = async () => {
    try {
      setConnectionStatus("Iniciando llamada...");
      const stream = await getMediaStream(isVideoEnabled);

      setLocalStream(stream);
      localVideoRef.current.srcObject = stream;

      const call = peer.call(remotePeerId, stream);
      setCurrentCall(call);

      call.on("stream", handleRemoteStream);
      call.on("close", handleCallEnd);

    } catch (err) {
      setError(`Error al iniciar llamada: ${err.message}`);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = async () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      } else {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newVideoTrack = newStream.getVideoTracks()[0];

          localStream.addTrack(newVideoTrack);
          setIsVideoEnabled(true);

          if (currentCall && currentCall.peerConnection) {
            const sender = currentCall.peerConnection.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          }
        } catch (err) {
          setError("No se pudo activar la cámara: " + err.message);
        }
      }
    }
  };

  const copyMyId = () => {
    navigator.clipboard.writeText(myPeerId);
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Título */}
        <h1 className="text-xl font-bold text-center text-violet-950 mb-4">
          ConectaYa
        </h1>

        {/* Estado y ID */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/10">
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-white/90">{connectionStatus}</p>
            <div className="flex items-center space-x-2 bg-white/5 rounded-xl px-3 py-1">
              <p className="text-xs text-white/80 peer-id">Tu ID: {myPeerId}</p>
              <button
                onClick={copyMyId}
                className="p-1 hover:bg-white/10 rounded-lg transition-all duration-300"
                title="Copiar ID"
              >
                <Copy size={20} className="text-white/80 hover:text-white" />
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-200 text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex flex-col items-center space-y-2 w-full mt-4">
          <div className="flex flex-col w-full max-w-xs space-y-2">
            <input
              type="text"
              placeholder="ID del otro usuario"
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/10 text-white placeholder-white/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none backdrop-blur-sm text-xs"
            />
            <button
              onClick={initiateCall}
              className="w-full bg-purple-950 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-purple-500/25 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-purple-900 text-xs"
            >
              Llamar
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-full transition-all duration-300 shadow-lg ${
                isAudioEnabled
                  ? "bg-purple-950 hover:bg-purple-500 hover:shadow-purple-500/25"
                  : "bg-red-600 hover:bg-red-500 hover:shadow-red-500/25"
              } text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900`}
            >
              {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-full transition-all duration-300 shadow-lg ${
                isVideoEnabled
                  ? "bg-purple-600 hover:bg-purple-500 hover:shadow-purple-500/25"
                  : "bg-red-700 hover:bg-red-500 hover:shadow-red-500/25"
              } text-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900`}
            >
              {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          </div>
        </div>

        {/* Llamada entrante */}
        {isIncomingCall && (
          <div className="fixed bottom-4 left-4 bg-purple-900/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-white/10">
            <p className="text-sm font-medium">Llamada entrante</p>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => currentCall && handleIncomingCall(currentCall)}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-xl font-medium transition-all duration-300 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-purple-900 text-xs"
              >
                Atender
              </button>
              <button
                onClick={() => {
                  currentCall?.close();
                  setIsIncomingCall(false);
                }}
                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-xl font-medium transition-all duration-300 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-purple-900 text-xs"
              >
                Rechazar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Videos flotantes */}
      <div className="fixed top-14 right-3 flex flex-col space-y-1">
        <div className="relative group rounded-full overflow-hidden shadow-2xl ring-1 ring-white/10 w-16 h-16 border border-white">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full bg-slate-950 object-cover rounded-full"
          />
        </div>
        <div className="flex justify-center">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-xl flex items-center space-x-1">
            <span className="font-medium text-xs">Tú</span>
            {!isAudioEnabled && <MicOff size={16} className="text-red-400" />}
            {!isVideoEnabled && <VideoOff size={16} className="text-red-400" />}
          </div>
        </div>

        <div className="relative group rounded-full overflow-hidden shadow-2xl ring-1 ring-white/10 w-16 h-16 border border-white">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full bg-slate-950 object-cover rounded-full"
          />
        </div>
        <div className="flex justify-center">
          <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-xl">
            <p className="font-medium text-xs">friend</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;


'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, useState, useEffect } from 'react';
import OpenAI from "openai";
import { RecordingDialog } from "@/components/recording-dialog";
import { SearchIcon, MicIcon } from "lucide-react";

export interface HomeProps {
  runQuery: (data: { query: string; apiKey: string }) => void;
}

export default function Home({ runQuery }: HomeProps) {
  const [query, setQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const predefinedQueries = [
    "A house owner from 1st cross, sector 7, hsr layout, Bengaluru has requested for an insurance cover of 2Crore Rs for his 3 storied building, give me the risk analysis report for it",
    "I am planning to buy a 3bhk in malleshwaram 6th main, bangalore, give me the risk analysis report for it and locate it on the map"
  ];
  const selectPredefinedQuery = async (predefinedQuery: string) => {
    try {
      setQuery(predefinedQuery);
      runQuery({ query: predefinedQuery, apiKey: getApiKey() });
    } catch (error) {
      console.error('Error during search payment:', error);
      alert('Failed to process payment for search. Please try again.');
    }
  };

  const submitForm = async () => {
    try {
      const apiKey = getApiKey();
      runQuery({ query, apiKey });
    } catch (error) {
      console.error('Error during search payment:', error);
      alert('Failed to process payment for search. Please try again.');
    }
  };

  const toggleRowSelection = (index: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
  };


  const isDisabled = !query;

  const detectSilence = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let hasSpokenAtAll = false;
    let silenceStartTime = 0;

    const checkAudioLevel = () => {
      if (!isRecordingRef.current) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      console.log("Audio level average:", average);

      if (average > 45) { // Threshold to consider as speaking
        hasSpokenAtAll = true;
        setIsSpeaking(true);
        silenceStartTime = 0;
      } else {
        if (!silenceStartTime) {
          silenceStartTime = Date.now();
        }

        const silenceDuration = Date.now() - silenceStartTime;

        if (silenceDuration > 3500) { // Wait for 3.5 seconds of silence
          if (hasSpokenAtAll) {
            stopRecording(true);
          } else {
            stopRecording(false);
          }
          return;
        }
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;

      detectSilence(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          if (chunksRef.current.length > 0 && isSpeaking) {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-1');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${getApiKey()}` },
              body: formData
            });

            if (!response.ok) {
              throw new Error(`Transcription failed: ${response.statusText}`);
            }

            const result = await response.json();
            setQuery(result.text);
            runQuery({ query: result.text, apiKey: getApiKey() });
          }
        } catch (error) {
          console.error('Transcription error:', error);
          alert('Failed to transcribe audio. Please try again.');
        } finally {
          stream.getTracks().forEach(track => track.stop());
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          setIsSpeaking(false);
        }
      };
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please ensure you have granted microphone permissions.');
    }
  };

  const stopRecording = async (shouldProcess: boolean = true) => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (!shouldProcess) {
        setIsSpeaking(false);
      }
      isRecordingRef.current = false;
      setIsRecording(false);

      if (shouldProcess) {
        setTimeout(async () => {
          try {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-1');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${getApiKey()}` },
              body: formData
            });

            if (!response.ok) {
              throw new Error(`Transcription failed: ${response.statusText}`);
            }

            const result = await response.json();
            setQuery(result.text);
            runQuery({ query: result.text, apiKey: getApiKey() });
          } catch (error) {
            console.error('Transcription error:', error);
            alert('Failed to transcribe audio. Please try again.');
          }
        }, 3500); // 3.5 second delay
      }

      mediaRecorderRef.current.stop();
    }
  };

  return (
    <section className="home flex flex-col items-center justify-center min-h-screen overflow-auto relative">
      {/* Animated gradient background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 animate-gradient-shift" />
      
      {/* Background image overlay */}
      <div
        className="fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'overlay'
        }}
      />
      
      {/* Floating elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-float-slow" />
      </div>
      
      <div className="relative z-10 w-full items-center">
        {/* Hero section */}
        <div className="w-full max-w-4xl mx-auto text-center mb-8 px-6 animate-fade-in-up">
          <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient-text">
              BANG MAPS
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            AI-Powered Property Risk Analysis
          </p>
          <p className="text-sm text-gray-400 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            Get instant insights on crime rates, flood risks, and property value
          </p>
        </div>

        <div className="w-full max-w-2xl p-6 mx-auto relative z-20 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="backdrop-blur-2xl bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 hover:scale-[1.02]">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center space-x-3 w-full">
                <div className="relative flex-1 group">
                  <Input
                    className="w-full bg-white/90 border-white/30 text-gray-900 placeholder-gray-500 focus:ring-4 focus:ring-purple-500/50 focus:border-purple-400 rounded-2xl py-6 px-6 text-base shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:bg-white"
                    placeholder="Describe your property requirements..."
                    type="text"
                    onKeyPress={(event) => { if (event.key === 'Enter') submitForm(); }}
                    onChange={(e) => setQuery(e.target.value)}
                    value={query}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                </div>
                <Button
                  className={`p-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl ${
                    isRecording 
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 animate-pulse' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  }`}
                  onClick={() => isRecording ? stopRecording(true) : startRecording()}
                >
                  <MicIcon className="w-6 h-6 text-white" />
                </Button>
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl py-4 px-6 text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  type="submit"
                  onClick={submitForm}
                  disabled={isDisabled}
                >
                  <SearchIcon className="w-6 h-6" />
                </Button>
              </div>
              
              {/* Feature badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white backdrop-blur-sm border border-white/20">
                  🎤 Voice Input
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white backdrop-blur-sm border border-white/20">
                  🗺️ Interactive Maps
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white backdrop-blur-sm border border-white/20">
                  📊 Risk Analysis
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white backdrop-blur-sm border border-white/20">
                  ⚡ Real-time Data
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl p-6 mb-4 mx-auto animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="backdrop-blur-2xl bg-white/5 p-6 rounded-3xl border border-white/10">
            <h3 className="text-white font-semibold mb-4 text-center">Try these examples:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedQueries.map((predefinedQuery, index) => (
                <div key={index} className="col-span-1">
                  <button
                    className="w-full text-left text-gray-200 hover:bg-white/10 transition-all duration-300 p-5 rounded-2xl border border-white/10 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 group hover:scale-[1.02] transform"
                    onClick={() => selectPredefinedQuery(predefinedQuery)}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-purple-400 mt-1 group-hover:scale-110 transition-transform duration-300">✨</span>
                      <span className="text-sm leading-relaxed">{predefinedQuery}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <RecordingDialog
          isOpen={isRecording}
          onClose={() => { if (isRecording) stopRecording(); }}
        />
      </div>

      <style jsx global>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(30px, -30px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-30px, 30px);
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(20px, -20px) scale(1.1);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient-text {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-gradient-text {
          background-size: 200% 200%;
          animation: gradient-text 3s ease infinite;
        }
      `}</style>
    </section>
  );
}



function getApiKey(): string {
  const apiKey = window.localStorage.getItem('OPENAI_API_KEY');
  if (apiKey) return apiKey;
  const newApiKey = prompt(`Enter your OpenAI API key from https://platform.openai.com/account/api-keys`, 'sk-...');
  if (newApiKey) {
    window.localStorage.setItem('OPENAI_API_KEY', newApiKey);
    return newApiKey;
  }
  const errorMessage = `You didn't provide the required OpenAI API key.`;
  alert(errorMessage);
  throw new Error(errorMessage);
}

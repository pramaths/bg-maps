'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, useState, useEffect } from 'react';
import { RecordingDialog } from "@/components/recording-dialog";
import { SearchIcon, MicIcon } from "lucide-react";

export interface HomeProps {
  runQuery: (data: { query: string; apiKey?: string }) => void;
}

export default function Home({ runQuery }: HomeProps) {
  const [query, setQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);

  const predefinedQueries = [
    "A house owner from 1st cross, sector 7, hsr layout, Bengaluru has requested for an insurance cover of 2Crore Rs for his 3 storied building, give me the risk analysis report for it",
    "I am planning to buy a 3bhk in malleshwaram 6th main, bangalore, give me the risk analysis report for it and locate it on the map"
  ];

  const selectPredefinedQuery = async (predefinedQuery: string) => {
    try {
      setQuery(predefinedQuery);
      runQuery({ query: predefinedQuery });
    } catch (error) {
      console.error('Error during search payment:', error);
      alert('Failed to process payment for search. Please try again.');
    }
  };

  const submitForm = async () => {
    try {
      runQuery({ query });
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

  // Simple 4-second recording function
  const recordOnce = async (): Promise<Blob> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    return new Promise((resolve, reject) => {
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        resolve(blob);
      };

      recorder.onerror = (e) => {
        stream.getTracks().forEach(track => track.stop());
        reject(e);
      };

      recorder.start();
      setTimeout(() => recorder.stop(), 8000); // 4 sec capture
    });
  };

  const handleVoiceInput = async () => {
    try {
      setIsRecording(true);

      // Record for 4 seconds
      const audioBlob = await recordOnce();

      // Send to speech-to-text API
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/speechtotext', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Set the transcribed text and trigger submit
      setQuery(result.transcript);
      runQuery({ query: result.transcript });

    } catch (error) {
      console.error('Voice input error:', error);
      alert('Failed to process voice input. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <section className="home flex flex-col items-center justify-center min-h-screen overflow-auto">
      <div
        className="fixed inset-0 z-0"

        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div className="relative z-10 w-full items-center">

        <div className="w-full max-w-2xl p-6 mx-auto relative z-20">
          <div className="backdrop-blur-lg bg-black/50 p-6 rounded-2xl border border-black/10 shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-2 rounded-full flex justify-center items-center w-full">
                <h1 className="text-4xl font-bold text-blue-600 text-center mb-0">BANG MAPS</h1>
              </div>
              <div className="flex items-center space-x-2 w-full">
                <Input
                  className="w-full bg-black/10 border-black/20 text-black placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="How can we help you?"
                  type="text"
                  onKeyPress={(event) => { if (event.key === 'Enter') submitForm(); }}
                  onChange={(e) => setQuery(e.target.value)}
                  value={query}
                />
                <Button
                  className={`p-2 rounded-full ${isRecording ? 'bg-purple-600 hover:bg-purple-700 animate-pulse' : 'bg-black/10 hover:bg-white/20'} transition-colors duration-200`}
                  onClick={handleVoiceInput}
                  disabled={isRecording}
                >
                  <MicIcon className="w-5 h-5 text-white" />
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-md py-2 px-4 text-sm font-medium transition-colors duration-200"
                  type="submit"
                  onClick={submitForm}
                  disabled={isDisabled}
                >
                  <SearchIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl p-6 mb-4 mx-auto">
          <div className="backdrop-blur-2xl bg-black/30 p-6 rounded-2xl border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedQueries.map((predefinedQuery, index) => (
                <div key={index} className="col-span-1">
                  <button
                    className="w-full text-left text-gray-200 hover:bg-white/10 transition-colors duration-200 p-4 rounded-xl border border-white/10 hover:border-white/20"
                    onClick={() => selectPredefinedQuery(predefinedQuery)}
                  >
                    {predefinedQuery}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <RecordingDialog
          isOpen={isRecording}
          onClose={() => { }}
        />
      </div>

    </section>
  );
}




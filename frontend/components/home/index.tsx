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
    <section className="home relative min-h-screen overflow-auto bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src="https://static-assets.mapbox.com/www/videos/maps/section_hero/video@1080p.mp4"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
        <div className="flex flex-col items-center gap-2 mb-4">
          <h1 className="text-4xl font-bold tracking-tight text-yellow-300/90">
            BANG MAPS
          </h1>
        </div>
        
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-5">

            <div className="flex items-center gap-2">
              <Input
                className="h-11 w-full border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-300 focus-visible:ring-white/15"
                placeholder="Type an address or ask for a risk report. You can also use voice."
                type="text"
                onKeyPress={(event) => { if (event.key === 'Enter') submitForm(); }}
                onChange={(e) => setQuery(e.target.value)}
                value={query}
              />
              <Button
                className={`h-11 w-11 rounded-lg border border-white/10 bg-white/5 p-0 text-zinc-100 shadow-sm backdrop-blur ${isRecording ? 'ring-1 ring-white/30 animate-pulse' : 'hover:bg-white/10'} transition-colors duration-200`}
                onClick={handleVoiceInput}
                disabled={isRecording}
                aria-label="Voice input"
                title="Voice input"
              >
                <MicIcon className="h-5 w-5" />
              </Button>
              <Button
                className="h-11 rounded-lg bg-white/15 px-4 text-sm font-medium text-zinc-100 hover:bg-white/20"
                type="submit"
                onClick={submitForm}
                disabled={isDisabled}
              >
                <SearchIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.40)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-zinc-200">Try an example</div>
            <div className="text-xs text-zinc-400">Click to paste + run</div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {predefinedQueries.map((predefinedQuery, index) => (
              <button
                key={index}
                className="group rounded-lg border border-white/10 bg-white/0 p-4 text-left text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-zinc-100"
                onClick={() => selectPredefinedQuery(predefinedQuery)}
              >
                <div className="line-clamp-4 leading-relaxed">{predefinedQuery}</div>
                <div className="mt-3 text-xs text-zinc-400 group-hover:text-zinc-300">Run this query</div>
              </button>
            ))}
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




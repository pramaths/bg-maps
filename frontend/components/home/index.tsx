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
                  className={`p-2 rounded-full ${isRecording ? 'bg-purple-600 hover:bg-purple-700' : 'bg-black/10 hover:bg-white/20'} transition-colors duration-200`}
                  onClick={() => isRecording ? stopRecording(true) : startRecording()}
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
          onClose={() => { if (isRecording) stopRecording(); }}
        />
      </div>

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

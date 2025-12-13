'use client';

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useEffect, useState } from "react";

interface RecordingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecordingDialog({ isOpen, onClose }: RecordingDialogProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 10 ? '' : prev + '.');
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center animate-pulse mb-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-purple-600"></div>
            </div>
          </div>
          <p className="text-lg font-medium text-center dark:text-white">
            Listening{dots}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            Speak now or click outside to cancel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
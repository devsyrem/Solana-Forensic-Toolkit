import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

interface TutorialPromptProps {
  onStartTutorial: () => void;
}

export default function TutorialPrompt({ onStartTutorial }: TutorialPromptProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Check if user has seen the tutorial before
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (hasSeenTutorial) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    
    // Don't show the prompt again, but don't mark tutorial as seen
    // This way the tutorial can still be triggered on wallet search
    localStorage.setItem("hasSeenPrompt", "true");
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-solana-dark-light rounded-lg px-4 py-3 flex items-center">
      <div className="w-5 h-5 rounded-full bg-solana-warning bg-opacity-20 flex items-center justify-center mr-3">
        <AlertCircle className="h-3 w-3 text-solana-warning" />
      </div>
      <p className="text-sm text-gray-300">
        New to blockchain analysis?{" "}
        <button 
          className="text-solana-secondary font-medium ml-1 hover:underline"
          onClick={onStartTutorial}
        >
          Start interactive tutorial
        </button>
      </p>
      <button 
        className="ml-3 text-gray-400 hover:text-white"
        onClick={handleDismiss}
        aria-label="Dismiss tutorial prompt"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

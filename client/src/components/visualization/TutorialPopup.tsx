import { Button } from "@/components/ui/button";
import { X, CheckCircle, Circle } from "lucide-react";

interface TutorialPopupProps {
  onStartTutorial: () => void;
  onDismiss: () => void;
}

export default function TutorialPopup({ onStartTutorial, onDismiss }: TutorialPopupProps) {
  return (
    <div className="fixed bottom-4 right-4 w-64 bg-solana-dark-light rounded-lg shadow-lg border border-solana-dark-lighter overflow-hidden z-50">
      <div className="bg-solana-primary px-4 py-2 flex justify-between items-center">
        <h4 className="text-white font-medium">Getting Started</h4>
        <button 
          className="text-white hover:text-gray-200"
          onClick={onDismiss}
          aria-label="Close tutorial"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-300 mb-3">
          Welcome to SolFlow! Start by entering a wallet address to visualize its transaction flow.
        </p>
        <div className="flex items-center text-xs text-gray-300 mb-2">
          <CheckCircle className="text-solana-secondary mr-2 h-4 w-4" />
          <span>1. Enter a wallet address</span>
        </div>
        <div className="flex items-center text-xs text-gray-300 mb-2">
          <Circle className="text-gray-600 mr-2 h-4 w-4" />
          <span>2. Apply filters as needed</span>
        </div>
        <div className="flex items-center text-xs text-gray-300 mb-2">
          <Circle className="text-gray-600 mr-2 h-4 w-4" />
          <span>3. Explore the visualization</span>
        </div>
        <Button 
          className="w-full mt-2 px-4 py-2 bg-solana-secondary text-solana-dark font-medium rounded-md text-sm hover:bg-opacity-90 transition"
          onClick={onStartTutorial}
        >
          Start Tutorial
        </Button>
      </div>
    </div>
  );
}

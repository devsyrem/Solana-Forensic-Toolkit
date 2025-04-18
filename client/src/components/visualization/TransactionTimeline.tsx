import { useState } from "react";
import { TimelineDataPoint } from "@/types/solana";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionTimelineProps {
  timelineData: TimelineDataPoint[];
  isLoading: boolean;
}

export default function TransactionTimeline({ timelineData, isLoading }: TransactionTimelineProps) {
  const [timeScale, setTimeScale] = useState("daily");
  const [selectedPoint, setSelectedPoint] = useState<TimelineDataPoint | null>(null);

  // Find the point with the most transactions for highlighting
  const maxPoint = timelineData.length > 0 
    ? timelineData.reduce((max, point) => 
        point.totalTransactions > max.totalTransactions ? point : max, 
        timelineData[0])
    : null;

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Calculate positions and dimensions for timeline elements
  const getTimelinePositions = () => {
    if (!timelineData.length) return [];

    const maxTransactions = Math.max(...timelineData.map(d => d.totalTransactions));
    const width = 800;
    const height = 150;
    const padding = { top: 30, bottom: 0, left: 0, right: 0 };
    const availableWidth = width - padding.left - padding.right;
    const availableHeight = height - padding.top - padding.bottom;

    return timelineData.map((point, index) => {
      const x = padding.left + (index / (timelineData.length - 1 || 1)) * availableWidth;
      const y = padding.top + availableHeight - (point.totalTransactions / maxTransactions * availableHeight);
      
      return {
        point,
        x,
        y,
        height: (point.totalTransactions / maxTransactions * availableHeight)
      };
    });
  };

  const timelinePositions = getTimelinePositions();

  // Generate path for the area chart
  const generateAreaPath = () => {
    if (!timelinePositions.length) return '';

    const width = 800;
    const height = 150;
    const padding = { top: 30, bottom: 0, left: 0, right: 0 };
    const availableHeight = height - padding.top - padding.bottom;

    // Start at the bottom left
    let path = `M${padding.left},${padding.top + availableHeight} `;
    
    // Add points for the top of the area
    timelinePositions.forEach(pos => {
      path += `L${pos.x},${pos.y} `;
    });
    
    // Complete the area by going to the bottom right and then back to start
    path += `L${padding.left + (width - padding.left - padding.right)},${padding.top + availableHeight} Z`;
    
    return path;
  };

  // Generate path for the line chart
  const generateLinePath = () => {
    if (!timelinePositions.length) return '';

    let path = '';
    
    timelinePositions.forEach((pos, i) => {
      if (i === 0) {
        path += `M${pos.x},${pos.y} `;
      } else {
        path += `L${pos.x},${pos.y} `;
      }
    });
    
    return path;
  };

  const handlePointClick = (point: TimelineDataPoint) => {
    setSelectedPoint(point === selectedPoint ? null : point);
  };

  if (isLoading) {
    return (
      <div className="bg-solana-dark-light rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-white">Transaction Timeline</h3>
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-[180px] w-full" />
      </div>
    );
  }

  return (
    <div className="bg-solana-dark-light rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-white">Transaction Timeline</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-white" />
              </TooltipTrigger>
              <TooltipContent className="bg-solana-dark-lighter text-gray-300 text-xs max-w-xs">
                This chart shows transaction activity over time, helping you identify patterns and unusual activity periods.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div>
          <Select
            value={timeScale}
            onValueChange={setTimeScale}
          >
            <SelectTrigger className="bg-solana-dark border border-solana-dark-lighter rounded-md py-1 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary w-[100px]">
              <SelectValue placeholder="Timescale" />
            </SelectTrigger>
            <SelectContent className="bg-solana-dark-lighter border-solana-dark text-white">
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Timeline Chart */}
      {timelineData.length === 0 ? (
        <div className="h-[180px] w-full flex items-center justify-center text-gray-400 text-sm">
          No transaction data available to display timeline
        </div>
      ) : (
        <div className="h-[180px] w-full">
          <svg width="100%" height="100%" viewBox="0 0 800 180" preserveAspectRatio="none">
            {/* Background grid */}
            <g>
              {/* Horizontal grid lines */}
              <line x1="0" y1="150" x2="800" y2="150" stroke="#383A59" strokeWidth="1" />
              <line x1="0" y1="120" x2="800" y2="120" stroke="#383A59" strokeWidth="1" />
              <line x1="0" y1="90" x2="800" y2="90" stroke="#383A59" strokeWidth="1" />
              <line x1="0" y1="60" x2="800" y2="60" stroke="#383A59" strokeWidth="1" />
              <line x1="0" y1="30" x2="800" y2="30" stroke="#383A59" strokeWidth="1" />
              
              {/* Vertical grid lines - dynamically generated */}
              {timelinePositions.map((pos, i) => (
                <line 
                  key={`vgrid-${i}`} 
                  x1={pos.x} 
                  y1="0" 
                  x2={pos.x} 
                  y2="150" 
                  stroke="#383A59" 
                  strokeWidth="1" 
                />
              ))}
            </g>
            
            {/* X-axis labels */}
            {timelinePositions.map((pos, i) => (
              <text 
                key={`xlabel-${i}`} 
                x={pos.x} 
                y="170" 
                fill="#808080" 
                fontSize="10" 
                textAnchor="middle"
              >
                {formatDate(pos.point.date)}
              </text>
            ))}
            
            {/* Y-axis labels */}
            <text x="-5" y="150" fill="#808080" fontSize="10" textAnchor="end">0</text>
            <text x="-5" y="120" fill="#808080" fontSize="10" textAnchor="end">5</text>
            <text x="-5" y="90" fill="#808080" fontSize="10" textAnchor="end">10</text>
            <text x="-5" y="60" fill="#808080" fontSize="10" textAnchor="end">15</text>
            <text x="-5" y="30" fill="#808080" fontSize="10" textAnchor="end">20</text>
            
            {/* Transaction Volume Area Chart */}
            <path 
              d={generateAreaPath()} 
              fill="url(#volumeGradient)" 
              fillOpacity="0.5" 
            />
            
            {/* Transaction Volume Line */}
            <path 
              d={generateLinePath()} 
              fill="none" 
              stroke="#9945FF" 
              strokeWidth="2" 
            />
            
            {/* Data points */}
            {timelinePositions.map((pos, i) => (
              <circle 
                key={`datapoint-${i}`}
                cx={pos.x} 
                cy={pos.y} 
                r="4" 
                fill="#9945FF"
                onClick={() => handlePointClick(pos.point)}
                style={{ cursor: 'pointer' }}
              />
            ))}
            
            {/* Selected data point or max point if nothing selected */}
            {(selectedPoint || maxPoint) && 
              timelinePositions.find(pos => pos.point === (selectedPoint || maxPoint)) && (
                <circle 
                  cx={timelinePositions.find(pos => pos.point === (selectedPoint || maxPoint))?.x} 
                  cy={timelinePositions.find(pos => pos.point === (selectedPoint || maxPoint))?.y} 
                  r="6" 
                  fill="#14F195" 
                  stroke="#FFFFFF" 
                  strokeWidth="1" 
                />
              )
            }
            
            {/* Gradients */}
            <defs>
              <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9945FF" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#9945FF" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
      
      {/* Selected point tooltip */}
      {selectedPoint && (
        <div className="bg-solana-dark rounded-md p-2 mx-auto w-max text-xs shadow-lg">
          <div className="font-medium text-white mb-1">
            {formatDate(selectedPoint.date)} - {selectedPoint.totalTransactions} Transactions
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-solana-secondary mr-1"></div>
              <span className="text-gray-300">
                Transfers: {selectedPoint.transactionsByType.transfer || 0}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-solana-error mr-1"></div>
              <span className="text-gray-300">
                NFT: {selectedPoint.transactionsByType.nft || 0}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-solana-warning mr-1"></div>
              <span className="text-gray-300">
                Swaps: {selectedPoint.transactionsByType.swap || 0}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-solana-info mr-1"></div>
              <span className="text-gray-300">
                Other: {(selectedPoint.transactionsByType.defi || 0) + (selectedPoint.transactionsByType.other || 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

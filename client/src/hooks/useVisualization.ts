import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { VisualizationGraph, WalletNode, TransactionEdge } from "@/types/solana";
import { shortenAddress } from "@/lib/utils";

interface UseVisualizationProps {
  graph: VisualizationGraph;
  container: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
  onNodeClick?: (node: WalletNode) => void;
  onEdgeClick?: (edge: TransactionEdge) => void;
}

interface UseVisualizationResult {
  selectedNode: WalletNode | null;
  selectedEdge: TransactionEdge | null;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  changeLayout: (layout: "force" | "radial" | "hierarchy") => void;
}

export function useVisualization({
  graph,
  container,
  width = 800,
  height = 600,
  onNodeClick,
  onEdgeClick
}: UseVisualizationProps): UseVisualizationResult {
  const [selectedNode, setSelectedNode] = useState<WalletNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TransactionEdge | null>(null);
  const [layout, setLayout] = useState<"force" | "radial" | "hierarchy">("force");
  
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  
  const colors = {
    primary: "#9945FF",
    secondary: "#14F195",
    error: "#FF5353",
    warning: "#FFB800",
    info: "#00C2FF",
    darkLight: "#292A3B",
    darkLighter: "#383A59"
  };
  
  // Get edge color based on type
  const getEdgeColor = (type: string): string => {
    switch (type) {
      case "transfer": return colors.secondary;
      case "swap": return colors.warning;
      case "nft": return colors.error;
      case "defi": return colors.info;
      default: return colors.darkLighter;
    }
  };
  
  // Get node color based on type
  const getNodeColor = (node: WalletNode, isMain: boolean): string => {
    if (isMain) return colors.primary;
    if (node.type === "program") return colors.secondary;
    return colors.darkLighter;
  };
  
  // Get node size based on transaction count
  const getNodeSize = (node: WalletNode, isMain: boolean): number => {
    if (isMain) return 30;
    if (node.type === "program") return 20;
    return 15 + (node.transactionCount || 0) / 2;
  };
  
  useEffect(() => {
    if (!container.current || !graph.nodes.length) return;
    
    // Clear previous visualization
    d3.select(container.current).selectAll("svg").remove();
    
    // Create SVG element
    const svg = d3.select(container.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    
    svgRef.current = svg.node() as SVGSVGElement;
    
    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom as any);
    
    // Create container for nodes and links
    const g = svg.append("g");
    
    // Create arrow marker for directed edges
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#aaa");
    
    // Find main node (first node)
    const mainNode = graph.nodes[0];
    
    // Create links
    const links = g.selectAll(".link")
      .data(graph.edges)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", d => getEdgeColor(d.type))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
      .attr("marker-end", "url(#arrowhead)")
      .on("click", (_event, d) => {
        setSelectedEdge(d);
        if (onEdgeClick) onEdgeClick(d);
      });
    
    // Create nodes
    const nodes = g.selectAll(".node")
      .data(graph.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", (_event, d) => {
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
      });
    
    // Add circles to nodes
    nodes.append("circle")
      .attr("r", d => getNodeSize(d, d.address === mainNode?.address))
      .attr("fill", d => getNodeColor(d, d.address === mainNode?.address));
    
    // Add labels to nodes
    nodes.append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .attr("fill", d => d.type === "program" ? "#1E1E2E" : "white")
      .attr("font-size", d => d.address === mainNode?.address ? "10px" : "8px")
      .text(d => shortenAddress(d.address, 4));
    
    // Create simulation
    const simulation = d3.forceSimulation(graph.nodes)
      .force("link", d3.forceLink(graph.edges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    simulationRef.current = simulation;
    
    // Apply layout
    applyLayout(layout, simulation, graph, width, height);
    
    // Update node and link positions on simulation tick
    simulation.on("tick", () => {
      links
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);
      
      nodes.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Clean up on unmount
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [graph, container, width, height, layout, onNodeClick, onEdgeClick]);
  
  // Apply different layouts
  const applyLayout = (
    layoutType: string,
    simulation: d3.Simulation<any, any>,
    graph: VisualizationGraph,
    width: number,
    height: number
  ) => {
    // Stop current simulation
    simulation.stop();
    
    switch (layoutType) {
      case "radial":
        // Radial layout
        simulation.force("link", d3.forceLink(graph.edges).id((d: any) => d.id).distance(80))
          .force("charge", d3.forceManyBody().strength(-200))
          .force("r", d3.forceRadial(height / 3, width / 2, height / 2));
        break;
      
      case "hierarchy":
        // Hierarchical layout (simplified)
        const stratify = d3.stratify()
          .id((d: any) => d.id)
          .parentId((d: any) => {
            // Find an edge where this node is the target
            const edge = graph.edges.find(e => e.target === d.id);
            return edge ? edge.source : null;
          });
        
        try {
          const root = stratify(graph.nodes);
          const treeLayout = d3.tree().size([width - 100, height - 100]);
          const treeData = treeLayout(root);
          
          // Update node positions based on tree layout
          treeData.descendants().forEach(d => {
            const node = graph.nodes.find(n => n.id === d.id);
            if (node) {
              (node as any).x = d.x + 50;
              (node as any).y = d.y + 50;
            }
          });
          
          // Use very weak forces to maintain the tree structure
          simulation.force("link", d3.forceLink(graph.edges).id((d: any) => d.id).strength(0.1))
            .force("charge", d3.forceManyBody().strength(-10))
            .force("center", null);
        } catch (error) {
          console.error("Error applying hierarchy layout:", error);
          // Fall back to force layout
          simulation.force("link", d3.forceLink(graph.edges).id((d: any) => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2));
        }
        break;
      
      default:
        // Force-directed layout (default)
        simulation.force("link", d3.forceLink(graph.edges).id((d: any) => d.id).distance(100))
          .force("charge", d3.forceManyBody().strength(-200))
          .force("center", d3.forceCenter(width / 2, height / 2));
        break;
    }
    
    // Restart simulation
    simulation.alpha(1).restart();
  };
  
  // Zoom functions
  const zoomIn = () => {
    if (!svgRef.current) return;
    
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call((d3.zoom() as any).scaleBy, 1.3);
  };
  
  const zoomOut = () => {
    if (!svgRef.current) return;
    
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call((d3.zoom() as any).scaleBy, 0.7);
  };
  
  const resetZoom = () => {
    if (!svgRef.current) return;
    
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call((d3.zoom() as any).transform, d3.zoomIdentity);
  };
  
  // Change layout function
  const changeLayout = (newLayout: "force" | "radial" | "hierarchy") => {
    setLayout(newLayout);
    
    if (simulationRef.current) {
      applyLayout(newLayout, simulationRef.current, graph, width, height);
    }
  };
  
  return {
    selectedNode,
    selectedEdge,
    zoomIn,
    zoomOut,
    resetZoom,
    changeLayout
  };
}

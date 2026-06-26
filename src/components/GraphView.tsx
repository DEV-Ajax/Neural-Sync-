import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, ConceptNode, ConceptLink } from '../types';

interface GraphViewProps {
  data: GraphData;
}

export const GraphView: React.FC<GraphViewProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.nodes.length) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Deep copy data for D3 mutation
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(50));

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4');

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    node.append('circle')
      .attr('r', 12)
      .attr('fill', (d: any) => d.unlocked ? '#06b6d4' : '#8b5cf6')
      .attr('stroke', '#050508')
      .attr('stroke-width', 2)
      .attr('class', 'transition-colors duration-500');

    node.append('text')
      .text((d: any) => d.label)
      .attr('x', 18)
      .attr('y', 4)
      .attr('fill', (d: any) => d.unlocked ? '#ffffff' : '#94a3b8')
      .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
      .attr('font-size', '10px')
      .attr('class', 'uppercase tracking-widest');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
       <div className="absolute top-3 left-4 z-10 font-mono text-[10px] uppercase tracking-widest text-slate-400 bg-black/40 px-3 py-1.5 rounded border border-white/5 backdrop-blur-md">
         Knowledge Map [Scroll to Zoom, Drag to Pan]
       </div>
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};

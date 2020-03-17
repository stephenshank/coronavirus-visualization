import React, { useEffect } from "react";
import fastaParser from "alignment.js/helpers/fasta";
import ScrollBroadcaster from "alignment.js/helpers/ScrollBroadcaster";
import { phylotree } from "phylotree";
import { nucleotide_color } from "alignment.js/helpers/colors";
import BaseAlignment from "alignment.js/components/BaseAlignment";
import { BaseSequenceAxis } from "alignment.js/components/SequenceAxis";
import Placeholder from "alignment.js/components/Placeholder";
import $ from "jquery";
import { AxisLeft, AxisBottom } from "d3-react-axis";
import sortFASTAAndNewick from "alignment.js/helpers/jointSort.js";
import Phylotree from "react-phylotree";
import * as d3 from "d3";
import pv from "bio-pv";

function molecule(mol) {
  return mol;
};

const threeToOne = {
  'CYS': 'C', 'ASP': 'D', 'SER': 'S', 'GLN': 'Q', 'LYS': 'K',
  'ILE': 'I', 'PRO': 'P', 'THR': 'T', 'PHE': 'F', 'ASN': 'N', 
  'GLY': 'G', 'HIS': 'H', 'LEU': 'L', 'ARG': 'R', 'TRP': 'W', 
  'ALA': 'A', 'VAL': 'V', 'GLU': 'E', 'TYR': 'Y', 'MET': 'M',
  'NAG': '*', 'FUL': '*'
};

function hex2rgb(hex) {
  const split = hex.split(','),
    r = +split[0].split('(')[1] / 256,
    g = +split[1] / 256,
    b = +split[2].split(')')[0] / 256;
    return [r, g, b];
}

function Visualization(props) {
  if(!props.data) return <div />;
  const { fubar, fasta, pdb, indexMap } = props.data,
    sequence_data = fastaParser(fasta),
    number_of_sequences = sequence_data.length,
    { number_of_sites } = sequence_data,
    pdb_sequence = [sequence_data[number_of_sequences - 1]],
    remaining_data = sequence_data.slice(0, number_of_sequences - 1),
    tree = new phylotree(fubar.input.trees['0']),
    width = 2400,
    tree_width = 1200,
    height = 1000,
    structure_height = 500,
    site_size = 20,
    axis_height = 20,
    padding = site_size / 2,
    full_pixel_width = sequence_data
      ? sequence_data[0].seq.length * site_size
      : null,
    full_pixel_height = sequence_data ? remaining_data.length * site_size : null,
    alignment_width = full_pixel_width
      ? Math.min(full_pixel_width, width - tree_width)
      : width,
    alignment_height = full_pixel_height
      ? Math.min(full_pixel_height, height - structure_height)
      : height,
    axis_scale = d3.scaleLinear()
      .domain([1, number_of_sites])
      .range([site_size / 2, full_pixel_width - site_size / 2]),
    tickValues = d3.range(1, number_of_sites, 2),
    line_data = Array(number_of_sites).fill(0),
    line_extent = d3.extent(fubar.MLE.content['0'].map(d=>d[2])),
    colorbar_scale = d3.scaleLinear()
      .domain([line_extent[0], 0, line_extent[1]])
      .range(['blue', '#EEEEEE', 'red']),
    colorbar_data_scale = d3.scaleLinear()
      .domain([line_extent[0], 0, line_extent[1]])
      .range([structure_height - axis_height, structure_height/2, 0]),
    line_scale = d3.scaleLinear()
      .domain(line_extent)
      .range([structure_height - axis_height, 0]),
    line = d3.line()
      .x((d, i) => (i+.5) * site_size+.5)
      .y(d => line_scale(d)),
    [min_domain, max_domain] = d3.extent(colorbar_data_scale.domain()),
    range_domain = max_domain - min_domain,
    scroll_broadcaster = new ScrollBroadcaster({
      width: full_pixel_width,
      height: full_pixel_height,
      x_pad: width - tree_width,
      y_pad: height - structure_height,
      bidirectional: [
        "tree",
        "alignmentjs-alignment",
        "pdb-alignment",
        "hyphy-chart-div"
      ]
    }),
    structure_options = {
      width: tree_width - 60,
      height: structure_height,
      antialias: true,
      quality : 'medium',
      background: '#FFF'
    },
    pv2hyphy = indexMap.filter(index => index.pvseq_index != '-')
      .map(index => +index.original_index);
  sortFASTAAndNewick(remaining_data, tree);
  indexMap.forEach(im => {
    const { full_index, original_index } = im,
      y = fubar.MLE.content['0'][+original_index][2];
    line_data[+full_index] = y;
  });
  useEffect(() => {
    const structure_div = document.getElementById('structure'),
      viewer = pv.Viewer(structure_div, structure_options),
      structure = pv.io.pdb(pdb, structure_options),
      chain = structure.select({chain: 'A'}),
      geom = viewer.cartoon('protein', chain);
    viewer.autoZoom();
    const pdb_map = {};
    chain._chains[0]._residues.forEach((res, i) => {
      if(!(threeToOne[res._residue._name] == '*')) {
        pdb_map[res.num()] = i;
      }
    });

    geom.colorBy(new pv.color.ColorOp(function(atom, out, index) {
      try {
        const resnum = atom.residue().num(),
          hyphy_index = pv2hyphy[pdb_map[resnum]],
          hyphy_value = fubar.MLE.content['0'][hyphy_index][2],
          color = colorbar_scale(hyphy_value),
          [r_color, g_color, b_color] = hex2rgb(color);
        out[index] = r_color;
        out[index + 1] = g_color;
        out[index + 2] = b_color;
        out[index + 3] = 1;
      } catch {
        console.log(
          threeToOne[atom.residue()._residue._name]
        )
      }
    }));
    function setColorForAtom(go, atom, color){
      var view = go.structure().createEmptyView();
      view.addAtom(atom);
      go.colorBy(pv.color.uniform(color), view);
    }
    var prevPicked = null;
    structure_div.addEventListener('mousemove', function(event){
      var rect = viewer.boundingClientRect();
      var picked = viewer.pick({ 
          x : event.clientX - rect.left,
          y : event.clientY - rect.top
      });
      if (prevPicked !== null && picked !== null &&
        picked.target() === prevPicked.atom){
        return;
      }
      if (prevPicked !== null){
        setColorForAtom(prevPicked.node, prevPicked.atom, prevPicked.color);
      }
      if (picked !== null){
        var atom = picked.target();
        var residue = atom.residue();
        var resnum = residue.num();
        console.log(resnum, pdb_map[resnum], threeToOne[residue._name]);
        var color = [0,0,0,0];
        picked.node().getColorForAtom(atom, color);
        prevPicked = { atom : atom, color : color, node : picked.node() };
        setColorForAtom(picked.node(), atom, 'red');
      }
      else{
        prevPicked = null;
      }
      viewer.requestRedraw();
    });


    document
      .getElementById('hyphy-chart-div')
      .addEventListener("alignmentjs_wheel_event", function(e) {
        $('#hyphy-chart-div').scrollLeft(e.detail.x_pixel);
      });
    document
      .getElementById('tree')
      .addEventListener("alignmentjs_wheel_event", function(e) {
        $('#tree').scrollTop(e.detail.y_pixel);
      });

  }, []);
  return (<div
      style={{width: tree_width + alignment_width}}
    >
    <div style={{position: 'relative'}}>
      <div
        style={{
          position: 'absolute',
          right: 10,
          top: 10
        }}
      >
        <svg
          width={100}
          height={50}
        >
          <line
            x1="0"
            x2="20"
            y1="25"
            y2="25"
            stroke="red"
            strokeWidth={2}
          />
          <text
            x="25"
            y="25"
            alignmentBaseline="middle"
            textAnchor="start"
          >
            {'\u03B2 - \u03B1'}
          </text>
        </svg>
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateRows: `${structure_height}px ${site_size}px ${alignment_height}px`,
        gridTemplateColumns: `${tree_width}px ${alignment_width}px`
      }}
    >
      <div style={{
        display: "grid",
        gridTemplateRows: `${structure_height}px`,
        gridTemplateColumns: `${tree_width-60}px 60px`
      }}>
        <div id='structure'>
        </div>
        <div>
          <svg width={80} height={structure_height}>
            <defs>
              <linearGradient id='gradient' x1="0%" x2="0%" y1="0%" y2="100%">
                {colorbar_data_scale.domain().map((value, index) => {
                  return (<stop
                    key={index}
                    offset={100*(value-min_domain)/range_domain + "%"}
                    stopColor={colorbar_scale(value)}
                  />)
                })}
              </linearGradient>
            </defs>
            <AxisLeft
              transform='translate(30, 0)'
              scale={colorbar_data_scale}
            />
            <rect
              fill={`url(#gradient)`}
              x={30}
              y={0}
              width={30}
              height={structure_height - axis_height}
            />
          </svg>
        </div>
      </div>
      <div
        id='hyphy-chart-div'
        style={{overflowX: "scroll"}}
        onWheel={e => {
          e.preventDefault();
          scroll_broadcaster.handleWheel(e, 'main');
        }}
      >
        <svg width={full_pixel_width} height={structure_height}>
          {colorbar_data_scale.ticks().map(tick => {
            return (<line
              key={tick}
              x1={0}
              x2={full_pixel_width}
              y1={colorbar_data_scale(tick)}
              y2={colorbar_data_scale(tick)}
              stroke={tick == 0 ? 'black' : 'lightgrey'}
              strokeWidth={1}
            />);
          })}
          <path
            stroke='red'
            strokeWidth={3}
            d={line(line_data)}
            fill='none'
          />
          <AxisBottom 
            scale={axis_scale}
            tickValues={tickValues}
            transform={`translate(0, ${structure_height - axis_height})`}
          />
        </svg>
      </div>
      <div>
        <svg width={tree_width} height={site_size}>
          <BaseSequenceAxis
            translateY={-4}
            sequence_data={pdb_sequence}
            label_padding={5}
            site_size={site_size}
            width={tree_width}
          />
        </svg>
      </div>
      <div>
        <BaseAlignment
          sequence_data={pdb_sequence}
          width={alignment_width}
          height={site_size}
          site_size={site_size}
          site_color={nucleotide_color}
          scroll_broadcaster={scroll_broadcaster}
          molecule={molecule}
          id={'pdb'}
          disableVerticalScrolling
          amino_acid
        />
      </div>
      <div
        id="tree"
        style={{
        width: tree_width,
        height: alignment_height,
        overflowY: "scroll"
      }}>
        <svg width={tree_width} height={full_pixel_height}>
          <g transform={`translate(${padding}, ${padding})`}>
            <Phylotree
              tree={tree}
              width={tree_width - 2*padding}
              height={full_pixel_height - 2*padding}
              maxLabelWidth={100}
              accessor={node => {
                return null;
              }}
              alignTips="right"
            />
          </g>
        </svg>
      </div>
      <BaseAlignment
        sequence_data={remaining_data}
        width={alignment_width}
        height={alignment_height}
        site_size={site_size}
        site_color={nucleotide_color}
        scroll_broadcaster={scroll_broadcaster}
        molecule={molecule}
        amino_acid
      />
    </div>
  </div>);
}

export default Visualization;

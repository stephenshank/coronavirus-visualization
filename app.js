import React, { useState, useEffect } from "react";
import Phylotree from "react-phylotree";
import ReactDOM from "react-dom";
import ScrollBroadcaster from "alignment.js/helpers/ScrollBroadcaster";
import { phylotree } from "phylotree";
import { nucleotide_color } from "alignment.js/helpers/colors";
import BaseAlignment from "alignment.js/components/BaseAlignment";
import { BaseSequenceAxis } from "alignment.js/components/SequenceAxis";
import Placeholder from "alignment.js/components/Placeholder";
import $ from "jquery";
import { AxisBottom } from "d3-react-axis";
import fastaParser from "alignment.js/helpers/fasta";
import sortFASTAAndNewick from "alignment.js/helpers/jointSort.js";
import StopWobbling from "alignment.js/prevent_default_patch";
import * as d3 from "d3";
import pv from "bio-pv";

import "./styles.scss";

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
    line_scale = d3.scaleLinear()
      .domain(d3.extent(fubar.MLE.content['0'].map(d=>d[2])))
      .range([structure_height - axis_height, 0]),
    line = d3.line()
      .x((d, i) => (i+.5) * site_size+.5)
      .y(d => line_scale(d)),
    scroll_broadcaster = new ScrollBroadcaster({
      width: full_pixel_width,
      height: full_pixel_height,
      x_pad: width - tree_width,
      y_pad: height - structure_height,
      bidirectional: [
        "alignmentjs-alignment",
        "pdb-alignment",
        "hyphy-chart-div"
      ]
    }),
    structure_options = {
      width: tree_width,
      height: structure_height,
      antialias: true,
      quality : 'medium',
      background: '#FFF'
    };
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
      pdb_map[res.num()] = i;
    });

/*
    const background_color = .95,
      sites_to_highlight = props.hyphy.siteAnnotations
        .filter(site=>site.pdb)
        .map(site=>site.pdb);
    geom.colorBy(new pv.color.ColorOp(function(atom, out, index) {
      var r_color = background_color,
        g_color = background_color,
        b_color = background_color;
        var resnum = atom.residue().num(),
          pdb_index = resnum - 33;
        pdb_index +=  - (resnum > 124 ? 198 - 124 - 1: 0);
        pdb_index +=  - (resnum > 299 ? 329 - 299 - 1: 0);
      if(sites_to_highlight.indexOf(pdb_index) > -1) {
        r_color = rgb_legend.R;
        g_color = rgb_legend.G;
        b_color = rgb_legend.B;
      }
      out[index] = r_color;
      out[index + 1] = g_color;
      out[index + 2] = b_color;
      out[index + 3] = 1;
    }));
*/

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
      <div id='structure'>
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
          <path
            stroke='red'
            strokeWidth={2}
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
          amino_acid
        />
      </div>
      <div>
        <svg width={tree_width} height={alignment_height}>
          <g transform={`translate(${padding}, ${padding})`}>
            <Phylotree
              tree={tree}
              width={tree_width - 2*padding}
              height={alignment_height - 2*padding}
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

function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([
      d3.json('output/S.fna.FUBAR.json'),
      d3.text('output/S-full.fasta'),
      d3.text('input/pdb6vxx.ent'),
      d3.csv('output/S-map.csv')
    ]).then(data => {
      setData({
        fubar: data[0],
        fasta: data[1],
        pdb: data[2],
        indexMap: data[3]
      });
    });
  }, []);
  return (<div>
    <h1>HyPhy Coronavirus Evolution</h1>
    {data ? <Visualization data={data} /> : null}
  </div>);
}

StopWobbling(document)
ReactDOM.render(
  <App />,
  document.body.appendChild(document.createElement('div'))
);

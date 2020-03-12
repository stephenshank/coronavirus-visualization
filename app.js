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

function Visualization(props) {
  if(!props.data) return <div />;
  const { fubar, fasta, pdb } = props.data,
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
  useEffect(() => {
    const structure_div = document.getElementById('structure'),
      viewer = pv.Viewer(structure_div, structure_options),
      structure = pv.io.pdb(pdb, structure_options),
      chain = structure.select(),
      geom = viewer.cartoon('protein', chain);
    viewer.autoZoom();
    document
      .getElementById('hyphy-chart-div')
      .addEventListener("alignmentjs_wheel_event", function(e) {
        $('#hyphy-chart-div').scrollLeft(e.detail.x_pixel);
      });
  }, []);
  return (
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
        onWheel={e => this.handleHyPhyWheel(e)}
      >
        <svg width={full_pixel_width} height={structure_height}>
          <AxisBottom 
            scale={axis_scale}
            tickValues={tickValues}
            transform={`translate(0, ${structure_height - 20})`}
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
  );
}

function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([
      d3.json('output/S.fna.FUBAR.json'),
      d3.text('output/S-full.fasta'),
      d3.text('input/pdb6vxx.ent')
    ]).then(data => {
      setData({
        fubar: data[0],
        fasta: data[1],
        pdb: data[2]
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

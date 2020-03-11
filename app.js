import React, { useState, useEffect } from "react";
import Phylotree from "react-phylotree";
import ReactDOM from "react-dom";
import ScrollBroadcaster from "alignment.js/helpers/ScrollBroadcaster";
import { phylotree } from "phylotree";
import { nucleotide_color } from "alignment.js/helpers/colors";
import BaseAlignment from "alignment.js/components/BaseAlignment";
import Placeholder from "alignment.js/components/Placeholder";
import SiteAxis from "alignment.js/components/SiteAxis";
import fastaParser from "alignment.js/helpers/fasta";
import sortFASTAAndNewick from "alignment.js/helpers/jointSort.js";
import StopWobbling from "alignment.js/prevent_default_patch";
import * as d3 from "d3";

import "./styles.scss";

function molecule(mol) {
  return mol;
};

function Visualization(props) {
  if(!props.data) return <div />;
  const { absrel, gard, fasta } = props.data,
    sequence_data = fastaParser(fasta),
    tree = new phylotree(absrel.input.trees['0']),
    width = 2400,
    tree_width = 1200,
    height = 500,
    axis_height = 25,
    site_size = 20,
    padding = 10,
    full_pixel_width = sequence_data
      ? sequence_data[0].seq.length * site_size
      : null,
    full_pixel_height = sequence_data ? sequence_data.length * site_size : null,
    alignment_width = full_pixel_width
      ? Math.min(full_pixel_width, width - tree_width)
      : width,
    alignment_height = full_pixel_height
      ? Math.min(full_pixel_height, height - axis_height)
      : height,
    scroll_broadcaster = new ScrollBroadcaster({
      width: full_pixel_width,
      height: full_pixel_height,
      x_pad: width - tree_width,
      y_pad: height - axis_height,
      bidirectional: [
        "alignmentjs-alignment",
        "alignmentjs-axis-div"
      ]
    });
  sortFASTAAndNewick(sequence_data, tree);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: `${axis_height}px ${alignment_height}px`,
        gridTemplateColumns: `${tree_width}px ${alignment_width}px`
      }}
    >
      <Placeholder width={tree_width} height={axis_height} />
      <SiteAxis
        width={alignment_width}
        height={axis_height}
        sequence_data={sequence_data}
        scroll_broadcaster={scroll_broadcaster}
      />
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
        sequence_data={sequence_data}
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
      d3.json('S.fna.ABSREL.json'),
      d3.json('S.fna.GARD.json'),
      d3.text('S-AA.fasta')
    ]).then(data => {
      setData({
        absrel: data[0],
        gard: data[1],
        fasta: data[2]
      });
    });
  }, []);
  return (<div>
    <h1>HyPhy Coronavirus Evolution</h1>
    <Visualization data={data} />
  </div>);
}

StopWobbling(document)
ReactDOM.render(
  <App />,
  document.body.appendChild(document.createElement('div'))
);

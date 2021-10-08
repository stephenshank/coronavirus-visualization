import React, { useState, useEffect, useRef } from "react";
import { useRouteMatch } from "react-router-dom";
import fastaParser from "alignment.js/helpers/fasta";
import sortFASTAAndNewick from "alignment.js/helpers/jointSort.js";
import { phylotree } from "phylotree";
import * as d3 from "d3";
import Placeholder from "alignment.js/components/Placeholder";
import SiteAxis from "alignment.js/components/SiteAxis";
import BaseAlignment from "alignment.js/components/BaseAlignment";
import Tree from "alignment.js/components/Tree";
import ScrollBroadcaster from "alignment.js/helpers/ScrollBroadcaster";
import {
  amino_acid_color,
  amino_acid_text_color
} from "alignment.js/helpers/colors.js";


function Visualization(props) {
  const { sequence_data, reference, summary } = props.data;
  if (!sequence_data) return <div />;
  const newick = summary.S.tree,
    tree = new phylotree(newick);
  sortFASTAAndNewick(sequence_data, tree);
  const {
    width, tree_width, height, axis_height, site_size,
    site_color, text_color
  } = props,
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
        "alignmentjs-axis-div",
        "alignmentjs-tree-div"
      ]
    });
  return (
    <div
      id="alignmentjs-main-div"
      style={{width: width, height: height}}
    >
      <Placeholder width={tree_width} height={axis_height} />
      <SiteAxis
        width={alignment_width}
        height={axis_height}
        sequence_data={sequence_data}
        scroll_broadcaster={scroll_broadcaster}
      />
      <Tree
        tree={tree}
        width={tree_width}
        height={alignment_height}
        site_size={props.site_size}
        phylotreeProps={{maxLabelWidth: 20}}
        scroll_broadcaster={scroll_broadcaster}
      />
      <BaseAlignment
        sequence_data={sequence_data}
        width={alignment_width}
        height={alignment_height}
        site_size={site_size}
        site_color={site_color}
        text_color={text_color}
        scroll_broadcaster={scroll_broadcaster}
        molecule={props.molecule}
      />
    </div>
  );
}

Visualization.defaultProps = {
  site_color: amino_acid_color,
  text_color: amino_acid_text_color,
  label_padding: 10,
  site_size: 20,
  axis_height: 25,
  width: 960,
  tree_width: 500,
  height: 500,
  sender: "main",
  molecule: mol => mol
};

function RASCLFetcher(props) {
  const [data, setData] = useState(null),
    { dataset } = props;
  useEffect(() => {
    Promise.all([
      d3.json(`/output/${dataset}_summary.json`),
      d3.text(`/output/${dataset}-AA.fasta`),
      d3.text('/input/S_AA.fasta'),
    ]).then(data => {
      setData({
        summary: data[0],
        sequence_data: fastaParser(data[1]),
        reference: fastaParser(data[2])
      });
    });
  }, []);
  return (<div>
    <h1>HyPhy Coronavirus Evolution - Function and Evolution</h1>
    {data ? <Visualization data={data} /> : null}
  </div>);
}

function RASCLWrapper(props) {
  const match = useRouteMatch(),
    { dataset } = match.params;
  return <RASCLFetcher dataset={dataset} />;
}

export { RASCLFetcher, RASCLWrapper }

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Visualization from "./viz.js";
import * as d3 from "d3";
import StopWobbling from "alignment.js/prevent_default_patch";

StopWobbling(document)

function render_fubar(fubar_url, fasta_url, pdb_url, map_url, element_id) {
  Promise.all([
    d3.json(fubar_url),
    d3.text(fasta_url),
    d3.text(pdb_url),
    d3.csv(map_url)
  ]).then(data => {
    const viz_data = {
      fubar: data[0],
      fasta: data[1],
      pdb: data[2],
      indexMap: data[3]
    };
    ReactDOM.render(
      <Visualization data={viz_data} />,
      document.getElementById(element_id)
    );
  });
}

export { render_fubar };

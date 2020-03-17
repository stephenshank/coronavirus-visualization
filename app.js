import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Visualization from "./viz.js";
import * as d3 from "d3";
import StopWobbling from "alignment.js/prevent_default_patch";

import "./styles.scss";


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

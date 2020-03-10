import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Phylotree from "react-phylotree";
import TreeAlignment from "alignment.js/TreeAlignment";
import StopWobbling from "alignment.js/prevent_default_patch";
import { fnaParser } from "alignment.js/helpers/fasta";
import Navbar from "react-bootstrap/Navbar";
import * as d3 from "d3";

import "./styles.scss";

function Visualization(props) {
  if(!props.data) return <div />;
  const { absrel, gard, fna } = props.data,
    parsedFna = fnaParser(fna, true);
  return (<div>
    <TreeAlignment
      {...parsedFna}
      width={1200}
      height={500}
    />
  </div>);
}

function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([
      d3.json('S.fna.ABSREL.json'),
      d3.json('S.fna.GARD.json'),
      d3.text('S.fna')
    ]).then(data => {
      setData({
        absrel: data[0],
        gard: data[1],
        fna: data[2]
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

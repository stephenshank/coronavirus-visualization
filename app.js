import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Switch, useRouteMatch } from "react-router-dom";
import Visualization from "./viz.js";
import * as d3 from "d3";
import StopWobbling from "alignment.js/prevent_default_patch";

import "./styles.scss";


function Fetcher(props) {
  const [data, setData] = useState(null),
    { dataset } = props;
  useEffect(() => {
    Promise.all([
      d3.json(`output/${dataset}.fna.FUBAR.json`),
      d3.text(`output/${dataset}-full.fasta`),
      d3.text('input/pdb6vxx.ent'),
      d3.csv(`output/${dataset}-map.csv`)
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

function Wrapper(props) {
  const match = useRouteMatch(),
    { dataset } = match.params;
  return <Fetcher dataset={dataset} />;
}

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/:dataset">
          <Wrapper />
        </Route>
        <Route path="/">
          <Fetcher dataset="S" />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

StopWobbling(document)
ReactDOM.render(
  <App />,
  document.body.appendChild(document.createElement('div'))
);

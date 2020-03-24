import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Switch, useRouteMatch } from "react-router-dom";
import { FubarFetcher, FubarWrapper } from "./fubar.js";
import { MEMEWrapper } from "./meme.js";
import * as d3 from "d3";
import StopWobbling from "alignment.js/prevent_default_patch";

import "./styles.scss";


function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/meme/:dataset">
          <MEMEWrapper />
        </Route>
        <Route path="/fubar/:dataset">
          <FubarWrapper />
        </Route>
        <Route path="/">
          <FubarFetcher dataset="S" />
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

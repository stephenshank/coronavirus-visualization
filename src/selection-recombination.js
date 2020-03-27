import React, { useState, useEffect, useRef } from "react";
import fastaParser from "alignment.js/helpers/fasta";
import ScrollBroadcaster from "alignment.js/helpers/ScrollBroadcaster";
import { phylotree } from "phylotree";
import { nucleotide_color } from "alignment.js/helpers/colors";
import BaseAlignment from "alignment.js/components/BaseAlignment";
import _ from "underscore";
import Dropdown from "react-bootstrap/Dropdown";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Placeholder from "alignment.js/components/Placeholder";
import { useRouteMatch } from "react-router-dom";
import $ from "jquery";
import { AxisLeft, AxisBottom } from "d3-react-axis";
import sortFASTAAndNewick from "alignment.js/helpers/jointSort.js";
import Phylotree from "react-phylotree";
import * as d3 from "d3";


const site_size = 20,
  padding = site_size / 2;

function get_broadcaster(width, height, sequence_data) {
    const full_pixel_width = sequence_data[0].seq.length * site_size,
      full_pixel_height = sequence_data.length * site_size;
  return new ScrollBroadcaster({
    width: full_pixel_width,
    height: full_pixel_height,
    x_pad: width,
    y_pad: height,
    bidirectional: [
      "tree",
      "alignmentjs-alignment",
      "hyphy-chart-div"
    ]
  });
}

function Visualization(props) {
  const { absrel, gard, fasta } = props.data,
    sequence_data = fasta,
    [ width1, setWidth1 ] = useState(700),
    [ transientWidth1, setTransientWidth1 ] = useState(700),
    [ width2, setWidth2 ] = useState(700),
    [ transientWidth2, setTransientWidth2 ] = useState(700),
    [ height1, setHeight1 ] = useState(200),
    [ transientHeight1, setTransientHeight1 ] = useState(200),
    [ height2, setHeight2 ] = useState(600),
    [ transientHeight2, setTransientHeight2 ] = useState(600),
    [ showModal, setShowModal] = useState(false),
    [ scrollBroadcaster, setScrollBroadcaster] = useState(() => {
      return get_broadcaster(width2, height2, fasta);
    }),
    full_pixel_width = sequence_data
      ? sequence_data[0].seq.length * site_size
      : null,
    full_pixel_height = sequence_data ? sequence_data.length * site_size : null,
    tree = new phylotree(absrel.input.trees['0']),
    axis_height = 20,
    line_data = Array(fasta.number_of_sites).fill(0);
  for(var k in gard.siteBreakPointSupport) {
    line_data[k] = gard.siteBreakPointSupport[k];
  }
  const bound = d3.max(line_data),
    line_scale = d3.scaleLinear()
      .domain([0, bound])
      .range([height1 - axis_height, 10]),
    line = d3.line()
      .x((d, i) => (i+.5) * site_size+.5)
      .y(d => line_scale(d));
  sortFASTAAndNewick(sequence_data, tree, true);
  useEffect(() => {
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

  return (<div>
    <div className="toolbar">
      <span>
        <Button variant="secondary" onClick={() => {
          setShowModal(true);
          setTransientWidth1(width1);
          setTransientWidth2(width2);
          setTransientHeight1(height1);
          setTransientHeight2(height2);
        }}>
          Options
        </Button>
      </span>
    </div>

    <Modal show={showModal} size="lg">
      <Modal.Header>
        <Modal.Title>Figure dimensions</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group as={Row}>
            <Form.Label column sm={4}>
              Tree width
            </Form.Label>
            <Col sm={8}>
              <Form.Control
                type="number"
                placeholder="Structure/tree width"
                value={transientWidth1}
                onChange={e => setTransientWidth1(+e.target.value)}
              />
            </Col>
            <Form.Label column sm={4}>
              Alignment/plot width
            </Form.Label>
            <Col sm={8}>
              <Form.Control
                type="number"
                placeholder="Alignment/plot width"
                value={transientWidth2}
                onChange={e => setTransientWidth2(+e.target.value)}
              />
            </Col>
            <Form.Label column sm={4}>
              Plot height
            </Form.Label>
            <Col sm={8}>
              <Form.Control
                type="number"
                placeholder="Structure/plot height"
                value={transientHeight1}
                onChange={e => setTransientHeight1(+e.target.value)}
              />
            </Col>
            <Form.Label column sm={4}>
              Tree/alignment height
            </Form.Label>
            <Col sm={8}>
              <Form.Control
                type="number"
                placeholder="Tree/alignment height"
                value={transientHeight2}
                onChange={e => setTransientHeight2(+e.target.value)}
              />
            </Col>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={()=>setShowModal(false)}>
          Close
        </Button>
        <Button variant="primary" onClick={() => {
          setShowModal(false);
          setWidth1(transientWidth1);
          setWidth2(transientWidth2);
          setHeight1(transientHeight1);
          setHeight2(transientHeight2);
          setScrollBroadcaster(
            get_broadcaster(transientWidth2, transientHeight2, sequence_data)
          )
        }}>
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
    <div
      style={{
        display: "grid",
        gridTemplateRows: `${height1}px ${height2}px`,
        gridTemplateColumns: `${width1}px ${width2}px`
      }}
    >

      <div>
      </div>

      <div
        id='hyphy-chart-div'
        style={{overflowX: "scroll"}}
        onWheel={e => {
          e.preventDefault();
          scrollBroadcaster.handleWheel(e, 'main');
        }}
      >
        <svg width={full_pixel_width} height={height1}>
          <path
            stroke={'blue'}
            strokeWidth={3}
            d={line(line_data)}
            fill='none'
          />
        </svg>
      </div>

      <div
        id="tree"
        onWheel={e => {
          e.preventDefault();
          scrollBroadcaster.handleWheel(e, 'main');
        }}
        style={{
          width: width1,
          height: height2,
          overflowY: "scroll"
        }}
      >
        <svg width={width1} height={full_pixel_height}>
          <g transform={`translate(${padding}, ${padding})`}>
            <Phylotree
              tree={tree}
              width={width1- 2*padding}
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
        sequence_data={sequence_data}
        width={width1}
        height={height2}
        site_size={site_size}
        scroll_broadcaster={scrollBroadcaster}
      />
    </div>
  </div>);

}

function SelectionRecombinationFetcher(props) {
  const [data, setData] = useState(null),
    { dataset } = props;
  useEffect(() => {
    Promise.all([
      d3.json(`/output/${dataset}.fna.GARD.json`),
      d3.json(`/output/${dataset}.fna.ABSREL.json`),
      d3.text(`/output/${dataset}.fasta`)
    ]).then(data => {
      setData({
        gard: data[0],
        absrel: data[1],
        fasta: fastaParser(data[2])
      });
    });
  }, []);
  return (<div>
    <h1>HyPhy Coronavirus Evolution - Selection and Recombination</h1>
    {data ? <Visualization data={data} /> : null}
  </div>);
}

function SelectionRecombinationWrapper(props) {
  const match = useRouteMatch(),
    { dataset } = match.params;
  return <SelectionRecombinationFetcher dataset={dataset} />;
}

export { SelectionRecombinationFetcher, SelectionRecombinationWrapper };

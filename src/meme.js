import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import fastaParser from "alignment.js/helpers/fasta";
import ScrollBroadcaster from "alignment.js/helpers/ScrollBroadcaster";
import { phylotree } from "phylotree";
import { nucleotide_color } from "alignment.js/helpers/colors";
import BaseAlignment from "alignment.js/components/BaseAlignment";
import { BaseSequenceAxis } from "alignment.js/components/SequenceAxis";
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
import pv from "bio-pv";

import { mapper, threeToOne, hex2rgb } from "./util";
import LinePlot from "./lineplot";
import Tree from "./tree";
import Structure from "./structure";

function molecule(mol) {
  return mol;
};

const colors = [
    'red',
    'blue',
    'orange'
  ],
  labels = [
    '\u03B1',
    '\u03B2-',
    '\u03B2+',
  ];

var mouseDown = 0;
var structureListener;
document.body.onmousedown = function() { 
    mouseDown = 1;
}
document.body.onmouseup = function() {
    mouseDown = 0;
}

const site_size = 20,
  axis_width = 50,
  axis_height = 20,
  colorbar_width = 60,
  statIndices = [0, 1, 3];

function quantile(arr, q) {
    const sorted = arr.sort((a,b) => a - b),
      pos = (sorted.length - 1) * q,
      base = Math.floor(pos),
      rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
};

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
      "pdb-alignment",
      "hyphy-chart-div"
    ]
  });
}

function FigureSettings(props) {
  const [width1, setWidth1] = useState(props.width1);
  const [width2, setWidth2] = useState(props.width2);
  const [height1, setHeight1] = useState(props.height1);
  const [height2, setHeight2] = useState(props.height2);
  const [bound, setBound] = useState(props.bound);
  return (<Modal show={true} size="lg">
    <Modal.Header>
      <Modal.Title>Figure dimensions</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form>
        <Form.Group as={Row}>
          <Form.Label column sm={4}>
            Structure/tree width
          </Form.Label>
          <Col sm={8}>
            <Form.Control
              type="number"
              placeholder="Structure/tree width"
              value={width1}
              onChange={e => setWidth1(+e.target.value)}
            />
          </Col>
          <Form.Label column sm={4}>
            Alignment/plot width
          </Form.Label>
          <Col sm={8}>
            <Form.Control
              type="number"
              placeholder="Alignment/plot width"
              value={width2}
              onChange={e => setWidth2(+e.target.value)}
            />
          </Col>
          <Form.Label column sm={4}>
            Structure/plot height
          </Form.Label>
          <Col sm={8}>
            <Form.Control
              type="number"
              placeholder="Structure/plot height"
              value={height1}
              onChange={e => setHeight1(+e.target.value)}
            />
          </Col>
          <Form.Label column sm={4}>
            Tree/alignment height
          </Form.Label>
          <Col sm={8}>
            <Form.Control
              type="number"
              placeholder="Tree/alignment height"
              value={height2}
              onChange={e => setHeight2(+e.target.value)}
            />
          </Col>
          <Form.Label column sm={4}>
            Plot upper bound
          </Form.Label>
          <Col sm={8}>
            <Form.Control
              type="number"
              placeholder="Plot upper bound"
              value={bound}
              onChange={e => setBound(+e.target.value)}
            />
          </Col>
        </Form.Group>
      </Form>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={()=>props.closeModal()}>
        Close
      </Button>
      <Button variant="primary" onClick={() => {
        props.applyModal(width1, width2, height1, height2, bound);
      }}>
        Apply
      </Button>
    </Modal.Footer>
  </Modal>);
}


class Legend extends React.Component {
  shouldComponentUpdate(nextProps) {
    return false;
  }
  render() {
    return (<div style={{position: 'relative'}}>
      <div
        style={{
          position: 'absolute',
          right: 10,
          top: 10
        }}
      >
        <svg
          width={100}
          height={200}
        >
          {this.props.statIndices.map((si, i) => {
            return (<g key={i} transform={`translate(0, ${i*30})`}>
              <line
                x1="0"
                x2="20"
                y1="25"
                y2="25"
                stroke={colors[i]}
                strokeWidth={3}
              />
              <text
                x="25"
                y="25"
                alignmentBaseline="middle"
                textAnchor="start"
              >
                {labels[i]}
              </text>
            </g>);
          })}
        </svg>
      </div>
    </div>);
  }
}


function Colorbar(props) {
  const { scale, height } = props,
    extent = d3.extent(scale.domain()),
    data_scale = d3.scaleLinear()
      .domain(extent)
      .range([height - 10, 10]);
  return (<svg width={80} height={height}>
    <defs>
      <linearGradient id='gradient' x1="0%" x2="0%" y1="100%" y2="0%">
        {scale.domain().map((value, index) => {
          return (<stop
            key={index}
            offset={100*value/extent[1]+ "%"}
            stopColor={scale(value)}
          />)
        })}
      </linearGradient>
    </defs>
    <AxisLeft
      transform='translate(30, 0)'
      scale={data_scale}
    />
    <rect
      fill={`url(#gradient)`}
      x={30}
      y={10}
      width={30}
      height={height - 20}
    />
  </svg>);
}


class Visualization extends React.Component {
  constructor(props) {
    super(props);

    const { meme, fasta, pdb, indexMap } = props.data;
    this.meme = meme;
    this.fasta = fasta;
    this.pdb = pdb;
    this.indexMap = indexMap;
    this.getLinePlotData();
    this.getPhyloData();

    this.state = {
      width1: 700,
      width2: 700,
      height1: 400,
      height2: 400,
      statIndex: 0,
      showModal: false,
      bound: this.getInitialBound()
    };
  }
  getLinePlotData() {
    const { meme } = this,
      { number_of_sites } = this.fasta,
      meme_data = meme.MLE.content['0'],
      number_of_metrics = meme_data[0].length;
    this.hyphy_data = Array(number_of_metrics)
      .fill().map(d=>Array(number_of_sites).fill(0));
    this.indexMap.forEach(im => {
      const { full_index, original_index } = im;
      d3.range(number_of_metrics).forEach(i => {
        const y = meme_data[+original_index][i];
        this.hyphy_data[i][+full_index] = y;
      })
    });
    this.line_data = this.hyphy_data.filter(
      (x, i) => statIndices.indexOf(i) > -1
    );
  }
  getPhyloData() {
    const { number_of_sequences, number_of_sites } = this.fasta;
    this.pdb_sequence = [this.fasta[number_of_sequences - 1]];
    const remaining_data = this.fasta.slice(0, number_of_sequences - 1),
      newick = this.meme.input.trees['0'],
      tree = new phylotree(newick);
    sortFASTAAndNewick(remaining_data, tree);
    this.remaining_data = remaining_data;
    this.tree = tree;
    this.full_pixel_width = number_of_sites * site_size;
    this.full_pixel_height = number_of_sequences * site_size;
  }
  getInitialBound() {
    const flat_nonzero_data = _.flatten(this.line_data)
      .filter(x => x > 0);
    return quantile(flat_nonzero_data, .8);
  }
  applyModal(width1, width2, height1, height2, bound) {
    this.setState({
      showModal: false,
      width1: width1,
      width2: width2,
      height1: height1,
      height2: height2,
      bound: bound
    });
  }
  render() {
    const {
        meme, fasta, pdb, indexMap, line_data, pdb_sequence, remaining_data,
        tree, full_pixel_width, full_pixel_height, hyphy_data
      } = this,
      {
        width1, width2, height1, height2, statIndex, showModal,
        bound
      } = this.state,
      width = width1 + width2,
      height = height1 + height2,
      structure_width = width1 - colorbar_width - axis_width,
      line_scale = d3.scaleLinear()
        .domain([0, bound])
        .range([height1 - axis_height, 10]),
      scrollBroadcaster = get_broadcaster(width2, height2, remaining_data),
      colorbar_min = d3.min(hyphy_data[statIndex]),
      colorbar_bound = quantile(
        hyphy_data[statIndex].filter(x => x > 0),
        .8
      ),
      colorbar_middle = (colorbar_bound + colorbar_min) / 2,
      colorbar_domain = [ 0, colorbar_min, colorbar_middle, colorbar_bound ],
      colorbar_scale = d3.scaleLinear()
        .domain(colorbar_domain)
        .range(['#EEEEEE', '#EEEEEE', 'purple', 'red'])
        .clamp(true);
    this.scrollBroadcaster = scrollBroadcaster;
    return (<div>
      <div className="toolbar">
        <span>
          <Dropdown onSelect={key => {
            this.setState({
              statIndex: key
            });
          }}>
            <Dropdown.Toggle
              variant="secondary"
              id="dropdown-basic"
              dangerouslySetInnerHTML={{
                __html: meme.MLE.headers[statIndex][1]
              }}
            />
            <Dropdown.Menu>
              <Dropdown.Header>
                Evolutionary statistic
              </Dropdown.Header>
              {meme.MLE.headers.map((header, index) => {
                return (<Dropdown.Item
                  key={index}
                  eventKey={index}
                  dangerouslySetInnerHTML={{ __html: header[1] }}
                />);
              })}
            </Dropdown.Menu>
          </Dropdown>
        </span>
        <span>
          <Button variant="secondary" onClick={() => {
            this.setState({
              showModal: true
            });
          }}>
            Options
          </Button>
        </span>
      </div>
      {this.state.showModal ? <FigureSettings
        width1={width1}
        width2={width2}
        height1={height1}
        height2={height2}
        bound={bound}
        applyModal={this.applyModal.bind(this)}
        closeModal={()=>this.setState({showModal: false})}
      /> : null}
      <div style={{width: width}}>
        <Legend statIndices={statIndices} />
        <div
          style={{
            display: "grid",
            gridTemplateRows: `${height1}px ${site_size}px ${height2}px`,
            gridTemplateColumns: `${width1}px ${width2}px`
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateRows: `${height1}px`,
              gridTemplateColumns: `${colorbar_width}px ${structure_width}px ${axis_width}px`
            }}
          >
            <Colorbar
              height={height1}
              scale={colorbar_scale}
            />

            <Structure
              pdb={pdb}
              width={structure_width}
              height={height1}
              indexMap={indexMap}
              plotWidth={width2}
              full_pixel_width={full_pixel_width}
              scrollBroadcaster={scrollBroadcaster}
              scale={colorbar_scale}
              data={hyphy_data[statIndex]}
            />

            <div>
              <svg width={axis_width} height={height1}>
                <text
                  x={15}
                  y={height1/2}
                  alignmentBaseline="middle"
                  textAnchor="middle"
                  transform={`rotate(-90 15 ${height1/2})`}
                >
                  Evolutionary rate
                </text>
                <AxisLeft
                  transform={`translate(${axis_width-2}, 0)`}
                  scale={line_scale}
                />
              </svg>
            </div>

          </div>
          <LinePlot
            statIndices={statIndices}
            width={width2}
            height={height1}
            full_pixel_width={full_pixel_width}
            scale={line_scale}
            data={line_data}
            scrollBroadcaster={scrollBroadcaster}
          />
          <div>
            <svg width={width1} height={site_size}>
              <BaseSequenceAxis
                translateY={-4}
                sequence_data={pdb_sequence}
                label_padding={5}
                site_size={site_size}
                width={width1}
                scrollBroadcaster={scrollBroadcaster}
              />
            </svg>
          </div>
          <BaseAlignment
            sequence_data={pdb_sequence}
            width={width2}
            height={site_size}
            site_size={site_size}
            site_color={nucleotide_color}
            scroll_broadcaster={scrollBroadcaster}
            id={'pdb'}
            disableVerticalScrolling
            amino_acid
          />
          <Tree
            full_pixel_height={full_pixel_height}
            tree={tree}
            width={width1}
            height={height2}
            scrollBroadcaster={scrollBroadcaster}
          />
          <BaseAlignment
            sequence_data={remaining_data}
            width={width2}
            height={height2}
            site_size={site_size}
            site_color={nucleotide_color}
            scroll_broadcaster={scrollBroadcaster}
            amino_acid
          />
        </div>
      </div>
    </div>);
  }
}

function MEMEFetcher(props) {
  const [data, setData] = useState(null),
    { dataset } = props;
  useEffect(() => {
    Promise.all([
      d3.json(`/output/${dataset}.fna.MEME.json`),
      d3.text(`/output/${dataset}-full.fasta`),
      d3.text(`/input/${dataset}.pdb`),
      d3.text(`/output/${dataset}-AA.fasta`)
    ]).then(data => {
      const full_fasta = fastaParser(data[1]),
        base_fasta = fastaParser(data[3]),
        map = mapper(base_fasta, full_fasta);
      setData({
        meme: data[0],
        fasta: full_fasta,
        pdb: data[2],
        indexMap: map
      });
    });
  }, []);
  return (<div>
    <h1>HyPhy Coronavirus Evolution - Sites (MEME) and Structure</h1>
    {data ? <Visualization data={data} /> : null}
  </div>);
}


function MEMEWrapper(props) {
  const match = useRouteMatch(),
    { dataset } = match.params;
  return <MEMEFetcher dataset={dataset} />;
}

function render_meme(meme_url, full_url, base_url, pdb_url, element_id) {
  Promise.all([
    d3.json(meme_url),
    d3.text(full_url),
    d3.text(base_url),
    d3.text(pdb_url)
  ]).then(data => {
    const full_fasta = fastaParser(data[1]),
      base_fasta = fastaParser(data[2]),
      map = mapper(base_fasta, full_fasta),
      viz_data = {
        meme: data[0],
        fasta: full_fasta,
        indexMap: map,
        pdb: data[3]
      };
    ReactDOM.render(
      <Visualization data={viz_data} />,
      document.getElementById(element_id)
    );
  });
}

export { MEMEWrapper, render_meme };

import React, { useState, useEffect, useRef } from "react";
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

import { threeToOne, hex2rgb } from "./util";

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

function Visualization(props) {
  if(!props.data) return <div />;
  const { meme, fasta, pdb, indexMap } = props.data,
    [ statIndex, setStatIndex ] = useState(0),
    [ showModal, setShowModal] = useState(false),
    [ width1, setWidth1 ] = useState(700),
    [ transientWidth1, setTransientWidth1 ] = useState(700),
    [ width2, setWidth2 ] = useState(700),
    [ transientWidth2, setTransientWidth2 ] = useState(700),
    [ height1, setHeight1 ] = useState(400),
    [ transientHeight1, setTransientHeight1 ] = useState(400),
    [ height2, setHeight2 ] = useState(400),
    [ transientHeight2, setTransientHeight2 ] = useState(400),
    [ emphasizedSite, setEmphasizedSite ] = useState(null),
    sequence_data = fastaParser(fasta),
    number_of_sequences = sequence_data.length,
    { number_of_sites } = sequence_data,
    pdb_sequence = [sequence_data[number_of_sequences - 1]],
    remaining_data = sequence_data.slice(0, number_of_sequences - 1),
    tree = new phylotree(meme.input.trees['0']),
    width = width1 + width2,
    tree_width = width1,
    height = height1 + height2,
    structure_height = height1,
    colorbar_width = 60,
    axis_width = 25,
    structure_width = width1 - colorbar_width - axis_width,
    site_size = 20,
    axis_height = 20,
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
    statIndices = [0, 1, 3],
    line_data = Array(statIndices.length)
      .fill().map(d=>Array(number_of_sites).fill(0)),
    line_extent = d3.extent(
      _.flatten(meme.MLE.content['0'].map(d=>d3.extent(d)))
    ),
    bound = 10,
    hyphy_extent = d3.extent(meme.MLE.content['0'].map(d => d[statIndex])),
    colorbar_max = Math.min(hyphy_extent[1], bound),
    colorbar_domain = [0, colorbar_max/2, colorbar_max],
    colorbar_scale = d3.scaleLinear()
      .domain(colorbar_domain)
      .range(['blue', '#EEEEEE', 'red']),
    colorbar_data_scale = d3.scaleLinear()
      .domain(colorbar_domain)
      .range([structure_height - axis_height, structure_height/2, 10]),
    line_scale = d3.scaleLinear()
      .domain([0, bound])
      .range([structure_height - axis_height, 10]),
    line = d3.line()
      .x((d, i) => (i+.5) * site_size+.5)
      .y(d => line_scale(d)),
    [min_domain, max_domain] = d3.extent(colorbar_data_scale.domain()),
    range_domain = max_domain - min_domain,
    scroll_broadcaster = useRef(new ScrollBroadcaster({
      width: full_pixel_width,
      height: full_pixel_height,
      x_pad: width - tree_width,
      y_pad: height - structure_height,
      bidirectional: [
        "tree",
        "alignmentjs-alignment",
        "pdb-alignment",
        "hyphy-chart-div"
      ]
    })),
    structure_options = {
      width: structure_width,
      height: structure_height,
      antialias: true,
      quality : 'medium',
      background: '#FFF'
    },
    pv2hyphy = indexMap.filter(index => index.PDBStructure_index != '-')
      .map(index => +index.original_index),
    pv2full = indexMap.filter(index => index.PDBStructure_index != '-')
      .map(index => +index.full_index);
  sortFASTAAndNewick(remaining_data, tree);
  indexMap.forEach(im => {
    statIndices.forEach((si, i) => {
      const { full_index, original_index } = im,
        y = meme.MLE.content['0'][+original_index][si];
      line_data[i][+full_index] = y;
    })
  });

  useEffect(() => {
    scroll_broadcaster.current = new ScrollBroadcaster({
      width: full_pixel_width,
      height: full_pixel_height,
      x_pad: width - tree_width,
      y_pad: height - structure_height,
      bidirectional: [
        "tree",
        "alignmentjs-alignment",
        "pdb-alignment",
        "hyphy-chart-div"
      ]
    })
  }, [width1, width2, height1, height2]);

  useEffect(() => {
    const structure_div = document.getElementById('structure');
    structure_div.innerHTML = '';
    structure_div.removeEventListener('mousemove', structureListener);
    const viewer = pv.Viewer(structure_div, structure_options),
      structure = pv.io.pdb(pdb, structure_options),
      chain = structure.select({chain: 'A'}),
      geom = viewer.cartoon('protein', chain);
    viewer.autoZoom();
    const pdb_map = {};
    chain._chains[0]._residues.forEach((res, i) => {
      if(!(threeToOne[res._residue._name] == '*')) {
        pdb_map[res.num()] = i;
      }
    });

    geom.colorBy(new pv.color.ColorOp(function(atom, out, index) {
      try {
        const resnum = atom.residue().num(),
          hyphy_index = pv2hyphy[pdb_map[resnum]],
          hyphy_value = meme.MLE.content['0'][hyphy_index][statIndex],
          color = colorbar_scale(hyphy_value),
          [r_color, g_color, b_color] = hex2rgb(color);
        out[index] = r_color;
        out[index + 1] = g_color;
        out[index + 2] = b_color;
        out[index + 3] = 1;
      } catch {
        console.log(
          threeToOne[atom.residue()._residue._name]
        )
      }
    }));
    function setColorForAtom(go, atom, color){
      var view = go.structure().createEmptyView();
      view.addAtom(atom);
      go.colorBy(pv.color.uniform(color), view);
    }
    var prevPicked = null;
    structureListener =  function(event){
      if(mouseDown == 0) {
        var rect = viewer.boundingClientRect();
        var picked = viewer.pick({ 
            x : event.clientX - rect.left,
            y : event.clientY - rect.top
        });
        if (prevPicked !== null && picked !== null &&
          picked.target() === prevPicked.atom){
          return;
        }
        if (prevPicked !== null){
          setColorForAtom(prevPicked.node, prevPicked.atom, prevPicked.color);
        }
        if (picked !== null){
          var atom = picked.target();
          var residue = atom.residue();
          var resnum = residue.num();
          console.log(
            'PDB index:', pdb_map[resnum],
            'Full index:', pv2full[pdb_map[resnum]],
            'Residue:', threeToOne[residue._name]
          );
          var color = [0,0,0,0];
          picked.node().getColorForAtom(atom, color);
          prevPicked = { atom : atom, color : color, node : picked.node() };
          setColorForAtom(picked.node(), atom, 'yellow');
          const full_index = pv2full[pdb_map[resnum]],
            x_frac = (full_index * site_size - width2/2) / full_pixel_width,
            y_frac = scroll_broadcaster.current['main'].y_fraction;
          setEmphasizedSite(full_index);
          scroll_broadcaster.current.broadcast(x_frac, y_frac, 'main');
        }
        else{
          prevPicked = null;
          setEmphasizedSite(null);
        }
        viewer.requestRedraw();
      }
    }
    structure_div.addEventListener('mousemove', structureListener);
  }, [statIndex, width1, height1]);


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
        <Dropdown onSelect={key => {
          setStatIndex(key);
          setEmphasizedSite(null);
        }}>
          <Dropdown.Toggle variant="secondary" id="dropdown-basic">
            {meme.MLE.headers[statIndex][1]}
          </Dropdown.Toggle>
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
              Structure/tree width
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
              Structure/plot height
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
        }}>
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
    <div
      style={{width: width}}
    >
      <div style={{position: 'relative'}}>
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
            {statIndices.map((si, i) => {
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
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateRows: `${structure_height}px ${site_size}px ${alignment_height}px`,
          gridTemplateColumns: `${tree_width}px ${alignment_width}px`
        }}
      >
        <div style={{
          display: "grid",
          gridTemplateRows: `${structure_height}px`,
          gridTemplateColumns: `${colorbar_width}px ${structure_width}px ${axis_width}px`
        }}>
          <div>
            <svg width={80} height={structure_height}>
              <defs>
                <linearGradient id='gradient' x1="0%" x2="0%" y1="100%" y2="0%">
                  {colorbar_data_scale.domain().map((value, index) => {
                    return (<stop
                      key={index}
                      offset={100*(value-min_domain)/range_domain + "%"}
                      stopColor={colorbar_scale(value)}
                    />)
                  })}
                </linearGradient>
              </defs>
              <AxisLeft
                transform='translate(30, 0)'
                scale={colorbar_data_scale}
              />
              <rect
                fill={`url(#gradient)`}
                x={30}
                y={0}
                width={30}
                height={structure_height - axis_height}
              />
            </svg>
          </div>

          <div id='structure'>
          </div>

          <div>
            <svg width={axis_width} height={structure_height}>
              <AxisLeft
                transform={`translate(${axis_width-2}, 0)`}
                scale={line_scale}
              />
            </svg>
          </div>
        </div>
        <div
          id='hyphy-chart-div'
          style={{overflowX: "scroll"}}
          onWheel={e => {
            e.preventDefault();
            scroll_broadcaster.current.handleWheel(e, 'main');
          }}
        >
          <svg width={full_pixel_width} height={structure_height}>
            {colorbar_data_scale.ticks().map(tick => {
              return (<line
                key={tick}
                x1={0}
                x2={full_pixel_width}
                y1={colorbar_data_scale(tick)}
                y2={colorbar_data_scale(tick)}
                stroke={tick == 0 ? 'black' : 'lightgrey'}
                strokeWidth={1}
              />);
            })}
            {statIndices.map((si, i) => {
              return (<path
                key={i}
                stroke={colors[i]}
                strokeWidth={3}
                d={line(line_data[i])}
                fill='none'
              />);
            })}
            <AxisBottom 
              scale={axis_scale}
              tickValues={tickValues}
              transform={`translate(0, ${structure_height - axis_height})`}
            />
            {emphasizedSite ? (<rect
              x={site_size*emphasizedSite}
              y={0}
              width={site_size}
              height={height1}
              fill='yellow'
              opacity='.5'
            />) : null }
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
            scroll_broadcaster={scroll_broadcaster.current}
            molecule={molecule}
            id={'pdb'}
            disableVerticalScrolling
            amino_acid
          />
        </div>
        <div
          id="tree"
          style={{
          width: tree_width,
          height: alignment_height,
          overflowY: "scroll"
        }}>
          <svg width={tree_width} height={full_pixel_height}>
            <g transform={`translate(${padding}, ${padding})`}>
              <Phylotree
                tree={tree}
                width={tree_width - 2*padding}
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
          sequence_data={remaining_data}
          width={alignment_width}
          height={alignment_height}
          site_size={site_size}
          site_color={nucleotide_color}
          scroll_broadcaster={scroll_broadcaster.current}
          molecule={molecule}
          amino_acid
        />
      </div>
    </div>
  </div>);
}

function MEMEFetcher(props) {
  const [data, setData] = useState(null),
    { dataset } = props;
  useEffect(() => {
    Promise.all([
      d3.json(`/output/${dataset}.fna.MEME.json`),
      d3.text(`/output/${dataset}-full.fasta`),
      d3.text(`/input/${dataset}.pdb`),
      d3.csv(`/output/${dataset}-map.csv`)
    ]).then(data => {
      setData({
        meme: data[0],
        fasta: data[1],
        pdb: data[2],
        indexMap: data[3]
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

export { MEMEWrapper };

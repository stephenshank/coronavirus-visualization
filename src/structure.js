import React, { Component } from "react";
import pv from "bio-pv";

import { threeToOne, hex2rgb } from "./util";

var mouseDown = 0;
var structureListener;

class Structure extends Component {
  componentDidMount() {
    this.layout();
    this.highlightStructure();
  }
  componentDidUpdate(prevProps) {
    const new_width = this.props.width != prevProps.width,
      new_height = this.props.height != prevProps.height,
      new_layout = new_width || new_height;
    if(new_layout) {
      this.layout();
    }
    this.highlightStructure();
  }
  layout() {
    const structure_div = document.getElementById('structure'),
      {
        pdb, data, statIndex, indexMap, width, height
      } = this.props, 
      structure_options = {
        width: width,
        height: height,
        antialias: true,
        quality : 'medium',
        background: '#FFF'
      };
    structure_div.innerHTML = '';
    this.viewer = pv.Viewer(structure_div, structure_options);
    const structure = pv.io.pdb(pdb, structure_options),
      chain = structure.select({chain: 'A'});
    this.geom = this.viewer.cartoon('protein', chain);
    this.viewer.autoZoom();
    const pdb_map = {};
    chain._chains[0]._residues.forEach((res, i) => {
      if(!(threeToOne[res._residue._name] == '*')) {
        pdb_map[res.num()] = i;
      }
    });
    this.pv2hyphy = indexMap.filter(index => index.PDBStructure_index != '-')
      .map(index => +index.original_index),
    this.pv2full = indexMap.filter(index => index.PDBStructure_index != '-')
      .map(index => +index.full_index);
    this.pdb_map = pdb_map;
    this.structure_div = structure_div;
  }
  highlightStructure() {
    const { pv2hyphy, pv2full, pdb_map, geom, viewer, structure_div } = this,
      { scrollBroadcaster, site_size, plotWidth, full_pixel_width, scale, data } = this.props;
    structure_div.removeEventListener('mousemove', structureListener);
    geom.colorBy(new pv.color.ColorOp(function(atom, out, index) {
      try {
        const resnum = atom.residue().num(),
          hyphy_index = pv2hyphy[pdb_map[resnum]],
          hyphy_value = data[hyphy_index],
          color = scale(hyphy_value),
          [r_color, g_color, b_color] = hex2rgb(color);
        out[index] = r_color;
        out[index + 1] = g_color;
        out[index + 2] = b_color;
        out[index + 3] = 1;
      } catch {
        console.log(
          //threeToOne[atom.residue()._residue._name]
        )
      }
    }));
    viewer.requestRedraw();
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
            x_frac = (full_index * site_size - plotWidth/2) / full_pixel_width,
            y_frac = scrollBroadcaster['main'].y_fraction;
          scrollBroadcaster.broadcast(x_frac, y_frac, 'main');
          document.getElementById('hyphy-chart-div')
            .dispatchEvent(new CustomEvent("select_site", {
              detail: full_index
            }));
        }
        else{
          prevPicked = null;
          document.getElementById('hyphy-chart-div')
            .dispatchEvent(new CustomEvent("select_site", {
              detail: null
            }));
        }
        viewer.requestRedraw();
      }
    }
    structure_div.addEventListener('mousemove', structureListener);
  }
  render() {
    return (<div
      id='structure'
      onMouseDown={() => mouseDown = 1}
      onMouseUp={() => mouseDown = 0}
    />);
  }
}

Structure.defaultProps = {
  site_size: 20
}

export default Structure;

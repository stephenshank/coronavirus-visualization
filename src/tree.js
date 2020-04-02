import React, { Component } from "react";
import Phylotree from "react-phylotree";
import $ from "jquery";

class Tree extends Component {
  shouldComponentUpdate(nextProps) {
    const new_width = this.props.width != nextProps,
      new_height = this.props.height != nextProps.height;
    return  new_width || new_height;
  }
  componentDidMount() {
    document
      .getElementById('tree')
      .addEventListener("alignmentjs_wheel_event", function(e) {
        $('#tree').scrollTop(e.detail.y_pixel);
      });
  }
  render() {
    const {
        width, height, site_size, tree, full_pixel_height, scrollBroadcaster
      } = this.props,
      padding = site_size / 2;
    return (<div
      id="tree"
      onWheel={e => {
        e.preventDefault();
        scrollBroadcaster.handleWheel(e, 'main');
      }}
      style={{
        width: width,
        height: height,
        overflow: "scroll hidden"
      }}
    >
      <svg width={width} height={full_pixel_height}>
        <g transform={`translate(${padding}, ${padding})`}>
          <Phylotree
            tree={tree}
            width={width - 2*padding}
            height={full_pixel_height - 2*padding}
            maxLabelWidth={100}
            accessor={node => {
              return null;
            }}
            alignTips="right"
          />
        </g>
      </svg>
    </div>);
  }
}

Tree.defaultProps = {
  site_size: 20
}

export default Tree;

/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil; tab-width: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright (c) 2015, Art Compiler LLC */
/*
   TODO
   -- Update code based on user intput.
*/
import {assert, message, messages, reserveCodeRange} from "./assert";
import * as React from "react";
//import * as ReactDOM from "react-dom";

window.exports.viewer = (function () {

  function capture(el) {
    var mySVG = $(el).html();
    return mySVG;
  }

  var mapLoaded = false;
  function loadAPI() {
	  var script = document.createElement("script");
    // FIXME hide key
	  script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyD-Ew4Y6QOdfXSKrBdzhPsP2AIJZzE-Hv4&callback=loadMaps";
	  script.type = "text/javascript";
	  document.getElementsByTagName("head")[0].appendChild(script);
  }
  let map;
  function showMap(options) {
	  if(!mapLoaded) {
		  alert('maps api not loaded yet');
		  return;
	  }
    if (!map) {
      map = new google.maps.Map(document.getElementById('map-panel'), options);
    } else {
      map.setOptions(options);
    }
    if (!map) {
      alert("no map created");
    }
  }
  var Map = React.createClass({
    componentWillMount: function () {
      loadAPI();
      var self = this;
      // This is called when the Maps API is loaded.
      window.loadMaps = function loadMaps() {
	      mapLoaded = true;
        self.forceUpdate();
      }
    },
    componentDidUpdate: function() {
      if (mapLoaded) {
        let options = this.props.data ? this.props.data[0].options : {
          center: {lat: 0, lng: 0},
          zoom: 1
        };
        showMap(options);
      }
    },
    componentWillUnmount: function() {
      clearInterval(this.interval);
    },
    render: function() {
      return (
          <div style={{width: "640px", height: "480px"}} id="map-panel" />
      );
    }
  });

  // Graffiticode looks for this React class named Viewer. The compiled code is
  // passed via props in the renderer.
  var Viewer = React.createClass({
    componentDidMount: function() {
    },
    render: function () {
      // If you have nested components, make sure you send the props down to the
      // owned components.
      var props = this.props;
      var data = props.data ? props.data : [];
      var elts = [];
      data.forEach(function (d, i) {
        var style = {};
        if (d.style) {
          d.style.forEach(function (p) {
            style[p.key[0]] = p.val.value;
          });
        }
        if (d.type === "map") {
          elts.push(<div key={i}><Map {...props}/></div>);
        } else {
          // Render a string
          elts.push(<span key={i} style={style}>{""+d.value}</span>);
        }
      });
      return (
        elts.length > 0 ? <div>{elts}</div> : <div/>
      );
    },
  });
  return {
    capture: capture,
    Viewer: Viewer
  };
})();


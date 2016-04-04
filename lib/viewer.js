"use strict";

var _assert = require("./assert");

var _react = require("react");

var React = _interopRequireWildcard(_react);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

//import * as ReactDOM from "react-dom";

/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil; tab-width: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright (c) 2015, Art Compiler LLC */
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
  var map = undefined;
  function showMap(options) {
    if (!mapLoaded) {
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
    displayName: "Map",

    componentWillMount: function componentWillMount() {
      loadAPI();
      var self = this;
      // This is called when the Maps API is loaded.
      window.loadMaps = function loadMaps() {
        mapLoaded = true;
        self.forceUpdate();
      };
    },
    componentDidUpdate: function componentDidUpdate() {
      if (mapLoaded) {
        var options = this.props.data ? this.props.data[0].options : {
          center: { lat: 0, lng: 0 },
          zoom: 1
        };
        showMap(options);
      }
    },
    componentWillUnmount: function componentWillUnmount() {
      clearInterval(this.interval);
    },
    render: function render() {
      var data = this.props.data ? this.props.data[0] : null;
      console.log(data);
      if (!data.height) {
        data.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        data.height -= 100;
      }
      if (!data.width) {
        data.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        data.width -= 20;
      }
      return React.createElement("div", { style: { width: data.width, height: data.height }, id: "map-panel" });
    }
  });

  // Graffiticode looks for this React class named Viewer. The compiled code is
  // passed via props in the renderer.
  var Viewer = React.createClass({
    displayName: "Viewer",

    componentDidMount: function componentDidMount() {},
    render: function render() {
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
          elts.push(React.createElement(
            "div",
            { key: i },
            React.createElement(Map, props)
          ));
        } else {
          // Render a string
          elts.push(React.createElement(
            "span",
            { key: i, style: style },
            "" + d.value
          ));
        }
      });
      return elts.length > 0 ? React.createElement(
        "div",
        null,
        elts
      ) : React.createElement("div", null);
    }
  });
  return {
    capture: capture,
    Viewer: Viewer
  };
})();

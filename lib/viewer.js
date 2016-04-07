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
  var geocoder = undefined;
  function showMap(options, address) {
    if (!mapLoaded) {
      alert('maps api not loaded yet');
      return;
    }
    if (!map) {
      map = new google.maps.Map(document.getElementById('map-panel'), options);
    } else {
      map.setOptions(options);
    }
    if (!geocoder) {
      geocoder = new google.maps.Geocoder();
    }
    if (address) {
      geocodeAddress(geocoder, map, address);
    }
    if (!map) {
      alert("no map created");
    }
  }
  //don't need to get the text box because of how this works
  function midpoint(locations) {
    var x = 0;
    var y = 0;
    var z = 0;
    locations.forEach(function (d, i) {
      //convert to radians (Math.PI/180) and to Cartesian coordinates
      var lat1 = d.lat() * Math.PI / 180;
      var lon1 = d.lng() * Math.PI / 180;
      //add the Cartesian coordinates to x y and z
      x += Math.cos(lat1) * Math.cos(lon1);
      y += Math.cos(lat1) * Math.sin(lon1);
      z += Math.sin(lat1);
    });
    //divide by the number
    x = x / locations.length;
    y = y / locations.length;
    z = z / locations.length;
    var longitude = Math.atan2(y, x) * (180 / Math.PI);
    var latitude = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
    return [latitude, longitude];
  }
  function parse(results, status, geocoder, locations, add, center) {
    if (status === google.maps.GeocoderStatus.OK) {
      //store the location in some way to determine center
      locations.push(results[0].geometry.location);
      var marker = new google.maps.Marker({
        map: map,
        position: results[0].geometry.location
      });
      //check if there's another address in some way, and if so check that one
      var nex = add.shift();
      if (nex !== undefined) {
        geocoder.geocode({ 'address': nex }, function (results, status) {
          parse(results, status, geocoder, locations, add);
        });
      } else {
        //the bottom-most layer.
        //should be able to handle positioning stuff in here with the map
        var c = map.getCenter();
        if (c.lat() == 0 && c.lng() == 0) {
          var cent = [0, 0];
          if (locations.length > 1) {
            cent = midpoint(locations);
          } else {
            cent = [locations[0].lat(), locations[0].lng()];
          }
          map.setCenter({ lat: cent[0], lng: cent[1] });
        }
      }
    } else {
      console.log("Geocode unsuccessful: " + status);
    }
    return results[0].geometry.location;
  }
  function geocodeAddress(geocoder, resultsMap, address) {
    var locations = [];
    var add = [].concat(JSON.parse(JSON.stringify(address)));
    geocoder.geocode({ 'address': add.shift() }, function (results, status) {
      var loc = parse(results, status, geocoder, locations, add);
    });
    return locations; //let the calculations be handled elsewhere
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
        //best place to handle markers would likely be here.
        var options = this.props.data ? this.props.data[0].options : {
          center: { lat: 0, lng: 0 },
          zoom: 1
        };
        var address = this.props.data ? this.props.data[0].address : null;
        showMap(options, address);
      }
    },
    componentWillUnmount: function componentWillUnmount() {
      clearInterval(this.interval);
    },
    render: function render() {
      var data = this.props.data ? this.props.data[0] : null;
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

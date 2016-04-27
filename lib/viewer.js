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
  var markerflag = true;
  var map = undefined;
  var geocoder = undefined;
  var markers = [];
  function save() {
    //dispatch
    //Minimum info: getCenter, getZoom, some way to get markers.
    if (markerflag && !window.dispatcher.isDispatching()) {
      window.dispatcher.dispatch({
        data: {
          options: {
            center: map.getCenter(),
            zoom: map.getZoom()
          },
          markers: markers
        }
      });
    }
  }
  function showMap(options, address) {
    if (!mapLoaded) {
      alert('maps api not loaded yet');
      return;
    }
    if (!geocoder) {
      geocoder = new google.maps.Geocoder();
    }
    if (options.center && !options.center.lat) {
      var cen = options.center;
      options.center = null;
      geocoder.geocode({ 'address': cen }, function (results, status) {
        options.center = parse(results, status, geocoder, [], []);
        if (map) {
          map.setOptions(options);
        }
      });
    }
    if (!map) {
      map = new google.maps.Map(document.getElementById('map-panel'), options);
      map.addListener("dragend", save);
      map.addListener("zoom_changed", save);
    } else {
      map.setOptions(options);
    }
    if (address) {
      geocodeAddress(geocoder, address, options);
    }
    if (!map) {
      alert("no map created");
    }
  }
  function geocodeAddress(geocoder, address, options) {
    var locations = [];
    //do an initial iteration through to deal with the lat/lng locations?
    //console.log(new google.maps.LatLng(-34, 151));
    var add = [];
    [].concat(JSON.parse(JSON.stringify(address))).forEach(function (d, i) {
      if (d.lat && d.lng) {
        locations.push(new google.maps.LatLng(+d.lat, +d.lng));
      } else {
        add.push(d);
      }
    });
    if (add.length) {
      geocoder.geocode({ 'address': add.shift() }, function (results, status) {
        var loc = parse(results, status, geocoder, locations, add, mark, options);
      });
    } else {
      mark(locations);
    }
    return locations; //let the calculations be handled elsewhere
  }
  function parse(results, status, geocoder, locations, add, callback, options) {
    if (status === google.maps.GeocoderStatus.OK) {
      //store the location in some way to determine center
      locations.push(results[0].geometry.location);
      //check if there's another address in some way, and if so check that one
      var nex = add.shift();
      if (nex !== undefined) {
        geocoder.geocode({ 'address': nex }, function (results, status) {
          parse(results, status, geocoder, locations, add, callback, options);
        });
      } else {
        //the bottom-most layer.
        //should be able to handle positioning stuff in here with the map
        //put any needed callback in here
        if (callback) {
          return callback(locations, options);
        }
        //I believe that 'return the location' is a reasonable default behavior for a geocode parser.
        else {
            return results[0].geometry.location;
          }
      }
    } else {
      console.log("Geocode unsuccessful: " + status);
    }
  }
  function mark(locations, options) {
    var markerBounds = new google.maps.LatLngBounds();
    locations.forEach(function (d, i) {
      markers.push(new google.maps.Marker({
        map: map,
        position: d
      }));
      markerBounds.extend(d);
    });
    var center = map.getCenter(); //save this because fitBounds overwrites it.
    if (!options.zoom) {
      //if zoom needs to be defined
      map.fitBounds(markerBounds);
    }
    if (!options.center) {
      //if center needs to be defined, redundant if we fitbounds, but that's fine.
      map.setCenter(markerBounds.getCenter());
    } else {
      //if not center
      map.setCenter(center);
    }
    markerflag = true;
    return markers;
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
    componentWillUpdate: function componentWillUpdate() {
      markerflag = false;
    },
    componentDidUpdate: function componentDidUpdate() {
      if (mapLoaded) {
        //best place to handle markers would likely be here.
        markers.forEach(function (d, i) {
          d.setMap(null);
        });
        markers = [];
        var options = this.props.options ? this.props.options : this.props.data[0].options;
        console.log(options);
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
      console.log(this.props);
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

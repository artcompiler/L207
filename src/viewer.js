/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil; tab-width: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* Copyright (c) 2015, Art Compiler LLC */
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
  let markerflag = true;
  let map;
  let geocoder;
  let directionsService;
  let directionsRenderer;
  let markers = [];
  let routes = {};
  let geocodes = {};
  function save() {//dispatch
    //Minimum info: getCenter, getZoom, some way to get markers.
    if(markerflag && !window.dispatcher.isDispatching()){
      var ml = [];
      markers.forEach(function (d, i){
        ml.push({
          position: d.getPosition(),
          visible: d.getVisible(),
          title: d.getTitle(),
          icon: d.getIcon()
        });
      });
      window.dispatcher.dispatch({
        data: {
          options: {
            center: map.getCenter(),
            zoom: map.getZoom()
          },
          markers: ml
        }
      });
    }
  }
  function showMap(options, address, directions, markarray) {
	  if(!mapLoaded) {
		  alert('maps api not loaded yet');
		  return;
	  }
    if (!geocoder){
      geocoder = new google.maps.Geocoder();
    }
    if(!directionsService){
      directionsService = new google.maps.DirectionsService();
      directionsRenderer = new google.maps.DirectionsRenderer();
      directionsRenderer.setOptions({preserveViewport: true});
    } else {
      directionsRenderer.setMap(null);
    }
    if(options.center && !options.center.lat){
      var cen = options.center;
      options.center = null;
      if(geocodes[cen] !== undefined){
        options.center = geocodes[cen];
      } else {
        geocoder.geocode({'address': cen}, function(results, status){
          var loc = parse(results, status, geocoder, [], []);
          options.center = loc;
          geocodes[cen] = loc;
          if(map){map.setOptions(options);}
        });
      }
    }
    if (!map) {
      map = new google.maps.Map(document.getElementById('map-panel'), options);
      map.addListener("dragend", save);
      map.addListener("zoom_changed", save);
    } else {
      map.setOptions(options);
    }
    var length = address.length;
    if(directions && directions.locations){
      directionsRenderer.setMap(map);
      address = address.concat(directions.locations);
      var name = directions.locations.toString() + directions.travelmode.toString();
      if(routes[name] !== undefined){
        directionsRenderer.setDirections(routes[directions.locations.toString() + directions.travelmode.toString()]);
      } else {
        var request = {
          origin:directions.locations.shift(),
          destination:directions.locations.pop(),
          travelMode:google.maps.TravelMode[directions.travelmode],
        };
        if(directions.travelmode === "DRIVING" || directions.travelmode === "TRANSIT"){
          request[(directions.travelmode.toLowerCase() + 'Options')] = {
            departureTime:new Date()
          };
        }
        var waypoints = [];
        directions.locations.forEach(function(d, i){
          waypoints.push({
            location: d,
            stopover: true
          });
        });
        request.waypoints = waypoints;
        directionsService.route(request, function(result, status) {
          if(status == google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            routes[name] = result;
          } else {
            console.log("Route creation unsuccessful: " + status);
          }
        });
      }
    }
    if(markarray){//no reason to geocode if we have these.
      marker(markarray);
    } else if(address){
      options.length = length;
      geocodeAddress(address, options);
    }
    if (!map) {
      alert("no map created");
    }
    /*if(thisotherthing){
      map.addListener('dblclick', function(e){
        new google.maps.Marker({
          map: map,
          position: e.latLng
        });
      });
    }*/
  }
  function marker(markarray){
    markarray.forEach(function (d, i){
      if(d != null){
        var m = new google.maps.Marker(d);
        m.setMap(map);
        markers.push(m);
        var ind = markers.length - 1;
        /*if(thatonething){//add deletion listener
          m.addListener('dblclick', function() {
            m.setMap(null);
            markers.splice(ind, 1);
            save();
          });
        }*/
      }
    });
    markerflag = true;
  }
  function geocodeAddress(address, options) {
    let locations = [];
    var add = [];
    ([].concat(JSON.parse(JSON.stringify(address)))).forEach(function (d, i){
      if(d.lat && d.lng){
        locations.push(new google.maps.LatLng(+d.lat, +d.lng));
      } else if(geocodes[d] !== undefined) {
        locations.push(geocodes[d]);
      } else {
        add.push(d);
      }
    });
    if(add.length){
      var nex = add.shift();
      geocoder.geocode({'address': nex}, function(results, status){
        var loc = parse(results, status, locations, add, mark, options);
        geocodes[nex] = loc;
      });
    } else {
      mark(locations, options);
    }
  }
  function parse(results, status, locations, add, callback, options){
    if(status === google.maps.GeocoderStatus.OK) {
      //store the location in some way to determine center
      locations.push(results[0].geometry.location);
      //check if there's another address in some way, and if so check that one
      var nex = add.shift();
      if(nex !== undefined){
        geocoder.geocode({'address': nex}, function(results, status){
          var loc = parse(results, status, locations, add, callback, options);
          geocodes[nex] = loc;
        });
      } else {//the bottom-most layer.
        //should be able to handle positioning stuff in here with the map
        //put any needed callback in here
        if(callback){callback(locations, options);}
      }
      return results[0].geometry.location;
    } else {
      console.log("Geocode unsuccessful: " + status);
    }
  }
  function mark(locations, options){
    var markerBounds = new google.maps.LatLngBounds();
    locations.forEach(function (d, i){
      if(i < options.length){
        var m = new google.maps.Marker({
          map: map,
          position: d
        });
        markers.push(m);
        /*if(thatonething){//add deletion listener
          m.addListener('dblclick', function() {
            m.setMap(null);
            markers.splice(ind, 1);
            save();
          });
        }*/
      }
      markerBounds.extend(d);
    });
    var center = map.getCenter();//save this because fitBounds overwrites it.
    if(!options.zoom){//if zoom needs to be defined
      map.fitBounds(markerBounds);
    }
    if(!options.center){//if center needs to be defined, redundant if we fitbounds, but that's fine.
      map.setCenter(markerBounds.getCenter());
    } else if(!options.zoom) {//if not center but zoom required fitbounds
      map.setCenter(center);
    }
    markerflag = true;
    return markers;
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
    componentWillUpdate: function() {
      markerflag = false;
    },
    componentDidUpdate: function() {
      if (mapLoaded) {
        //best place to handle markers would likely be here.
        markers.forEach(function (d, i){
          d.setMap(null);
        });
        markers = [];
        let options = this.props.options ? this.props.options : this.props.data[0].options;
        let address = this.props.data ? this.props.data[0].address || [] : [];
        let directions = this.props.data ? this.props.data[0].directions : null;
        showMap(options, address, directions, this.props.markers);
      }
    },
    componentWillUnmount: function() {
      clearInterval(this.interval);
    },
    render: function() {
      var data = this.props.data ? this.props.data[0] : null;
      if(!data.height){
        data.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        data.height -= 100;
      }
      if(!data.width){
        data.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        data.width -= 20;
      }
      return (
        <div style={{width: data.width, height: data.height}} id="map-panel" />
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


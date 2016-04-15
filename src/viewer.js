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
  let map;
  let geocoder;
  function showMap(options, address) {
	  if(!mapLoaded) {
		  alert('maps api not loaded yet');
		  return;
	  }
    if (!geocoder){
      geocoder = new google.maps.Geocoder();
    }
    if(options.center && !options.center.lat){
      var cen = options.center;
      options.center = null;
      geocoder.geocode({'address': cen}, function(results, status){
        options.center = parse(results, status, geocoder, [], []);
        if(map){map.setOptions(options);}
      });
    }
    if (!map) {
      map = new google.maps.Map(document.getElementById('map-panel'), options);
    } else {
      map.setOptions(options);
    }
    if(address){geocodeAddress(geocoder, address, options);}
    if (!map) {
      alert("no map created");
    }
  }
  function geocodeAddress(geocoder, address, options) {
    let locations = [];
    //do an initial iteration through to deal with the lat/lng locations?
    //console.log(new google.maps.LatLng(-34, 151));
    var add = [];
    ([].concat(JSON.parse(JSON.stringify(address)))).forEach(function (d, i){
      if(d.lat && d.lng){
        locations.push(new google.maps.LatLng(+d.lat, +d.lng));
      } else {
        add.push(d);
      }
    });
    if(add.length){
      geocoder.geocode({'address': add.shift()}, function(results, status){
        var loc = parse(results, status, geocoder, locations, add, mark, options);
      });
    } else {
      mark(locations);
    }
    return locations;//let the calculations be handled elsewhere
  }
  function parse(results, status, geocoder, locations, add, callback, options){
    if(status === google.maps.GeocoderStatus.OK) {
      //store the location in some way to determine center
      locations.push(results[0].geometry.location);
      //check if there's another address in some way, and if so check that one
      var nex = add.shift();
      if(nex !== undefined){
        geocoder.geocode({'address': nex}, function(results, status){
          parse(results, status, geocoder, locations, add, callback, options);
        });
      } else {//the bottom-most layer.
        //should be able to handle positioning stuff in here with the map
        //put any needed callback in here
        if(callback){return callback(locations, options);}
        //I believe that 'return the location' is a reasonable default behavior for a geocode parser.
        else {return results[0].geometry.location;}
      }
    } else {
      console.log("Geocode unsuccessful: " + status);
    }
  }
  /*function midpoint(locations){
    var x = 0;
    var y = 0;
    var z = 0;
    locations.forEach(function(d, i){
      //convert to radians (Math.PI/180) and to Cartesian coordinates
      var lat1 = d.lat()*Math.PI/180;
      var lon1 = d.lng()*Math.PI/180;
      //add the Cartesian coordinates to x y and z
      x += Math.cos(lat1)*Math.cos(lon1);
      y += Math.cos(lat1)*Math.sin(lon1);
      z += Math.sin(lat1);
    });
    //divide by the number
    x = x/locations.length;
    y = y/locations.length;
    z = z/locations.length;
    var longitude = (Math.atan2(y, x))*(180/Math.PI);
    var latitude = (Math.atan2(z, Math.sqrt(x*x + y*y)))*(180/Math.PI);
    return [latitude, longitude];
  }*/
  /*function center(locations){
    if(map){var c = map.getCenter();}
    if(c && (c.lat() == 0 && c.lng() == 0)){
      var cent = [0, 0];
      if(locations.length > 1){
        cent = midpoint(locations);
      } else {
        cent = [locations[0].lat(), locations[0].lng()];
      }
      if(map){
        map.setCenter({lat: cent[0], lng: cent[1]});
      }
    }
  }*/
  /*function zoom(locations){
    if(true){//change this to an actual zoom check when you figure out how to check for that
      var dist = 0;
      var d, dlon, dlat, a, c, l1, l2;
      //compare the distances between each two locations to find the largest.
      //same city: around 0.5, 0.5 ---> 10
      //same continent: 8-10, 5-10 ---> 5
      //clamping anything excessive to 1 is fine.
      locations.forEach(function (d1, i1){
        locations.forEach(function (d2, i2){
          if (i1 < i2){//don't check if it's the same, obviously, and if it's lower it's been done
            //alter this to convert to radians.
            l1 = [d1.lat()*Math.PI/180, d1.lng()*Math.PI/180];
            l2 = [d2.lat()*Math.PI/180, d2.lng()*Math.PI/180]
            dlon = l2[1] - l1[1];
            dlat = l2[0] - l1[0];
            a = Math.pow(Math.sin(dlat/2), 2) + Math.cos(l1[0])*Math.cos(l2[0])*Math.pow(Math.sin(dlon/2), 2);
            c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            dist = Math.max(dist, c);
          }
        });
      });
      //zoom is on some weird scale look into it
      //591657550.500000 / 2^(level-1) so it's inverse log thereabouts?
      console.log(dist);
    }
  }*/
  function mark(locations, options){
    var markers = [];
    var markerBounds = new google.maps.LatLngBounds();
    locations.forEach(function (d, i){
      markers.push(new google.maps.Marker({
        map: map,
        position: d
      }));
      markerBounds.extend(d);
    });
    var center = map.getCenter();//save this because fitBounds overwrites it.
    if(!options.zoom){//if zoom needs to be defined
      map.fitBounds(markerBounds);
    }
    if(!options.center){//if center needs to be defined, redundant if we fitbounds, but that's fine.
      map.setCenter(markerBounds.getCenter());
    } else {//if not center
      map.setCenter(center);
    }
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
    componentDidUpdate: function() {
      if (mapLoaded) {
        //best place to handle markers would likely be here.
        let options = this.props.data[0].options;
        let address = this.props.data ? this.props.data[0].address : null;
        showMap(options, address);
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


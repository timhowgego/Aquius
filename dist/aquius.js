/*eslint-env browser*/
/*global L*/
/*global Promise*/

var aquius = aquius || {
/**
 * @namespace Aquius (Here+Us)
 * @version 0
 * @copyright MIT License
 */

"LOC": {
  /**
   * Default locale translations: Each xx-XX BCP 47-style locale matches en-US keys
   * "language" is of this language in that language, with other strings translated directed
   * Runtime localisation is via this.localise()
   */
  "en-US": {
    "language": "English",
    "embed": "Embed",
    "export": "Export",
    "here": "Here",
    "link": "Services",
    "node": "Stops",
    "place": "People",
    "scale": "Scale"
  },
  "es-ES": {
    "language": "Español",
    "embed": "Insertar",
    "export": "Exportar",
    "here": "Aquí",
    "link": "Servicios",
    "node": "Paradas",
    "place": "Personas",
    "scale": "Escala"
  }
},

"OPT": {
  /**
   * Default options. Initialisation managed by this.parseOption()
   */
  "base": [{
    "options": {
      "attribution": "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      "maxZoom": 18
    },
    "type": "",
    "url": "http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
  }],
    // Base mapping (WMS tiles supported with type: wms)
  "c": -1.43,
    // Here click Longitude
  "dataset": "",
    // JSON file containing network data: Recommended full URL, not just filename
  "id": "",
    // Internal: ID DOM div in which to build (specified as 1st argument of init, then stored here)
  "hereColor": "green",
    // CSS Color for here layer circle strokes
  "k": 54.54,
    // Here click Latitude
  "linkColor": "red",
    // CSS Color for link (service) layer strokes
  "linkScale": 1.0,
    // Scale factor for link (service) layer strokes: ceil(log(1+(service*(1/(scale*4))))*scale*2)
  "locale": "en-US",
    // Default locale, BCP 47-style: User selection is t
  "m": 9,
    // Here click zoom
  "n": 0,
    // User selected network filter
  "network": [],
    // Extension of network: Array of products, Object of locale keyed names
  "nodeColor": "black",
    // CSS Color for node (stop) layer circle strokes
  "nodeScale": 1.0,
    // Scale factor for node (stop) layer circles: ceil(log(1+(service*(1/(scale*2))))*scale)
  "panelScale": 1.0,
    // Scale factor for text on the bottom-left summary panel
  "placeColor": "blue",
    // CSS Color of place (population) layer circle fill
  "placeOpacity": 0.5,
    // CSS Opacity of place (population) layer circle fill: 0-1
  "placeScale": 1.0,
    // Scale factor for place (population) layer circles: ceil(sqrt(people*scale/666)
  "v": "lph",
    // Displayed map layers by first letter: here, link, node, place
  "s": 5,
    // User selected global scale factor: 1,3,5,7,9
  "uiHash": false,
    // Enables recording of the user state in the URL's hash
  "uiLocale": true,
    // Enables locale selector
  "uiNetwork": true,
    // Enables network selector
  "uiPanel": true,
    // Enables summary statistic panel
  "uiScale": true,
    // Enables scale selector
  "uiShare": true,
    // Enables embed and export
  "t": "en-US",
    // User selected locale: BCP 47-style)
  "translation": {},
    // Custom translations: Format matching aquius.LOC
  "x": 10.35,
    // Map view Longitude
  "y": 50.03,
    // Map view Latitude
  "z": 4
    // Map view zoom
},

"init": function init(id, option) {
  /**
   * Initialises app
   * @param {string} id - ID of DOM element in which to build app
   * @param {Object} option - Dictionary of options, optional
   * @param {return} boolean - Runtime success
   */
  "use strict";
  var dataset, css, js, self, arg, callback, loaded, recall, urls, i;
  
  if (!document.getElementById(id)) {
    return false;
  }
  this.OPT.id = id;
    // id de facto valid if exists on page. Other options handled later
  if (!Object.keys || ![].indexOf || typeof JSON !== "object") {
    // Arcane pre-IE9 browser
    document.getElementById(id).appendChild(
      document.createTextNode("Browser not supported: Try a modern browser")
    );
    document.getElementById(id).style.height = "auto";
      // Prevents unusable embed areas being filled with whitespace
    return false;
  }

  this.statusIcon("\uD83C\uDF0D");

  dataset = (typeof option === "object" && "dataset" in option && typeof option.dataset === "string") ?
    option.dataset : "https://timhowgego.github.io/Aquius/dist/default.json";
    // Default is a valid but empty dataset. @todo Should be internal to script
  css = "https://unpkg.com/leaflet@1.3.4/dist/leaflet.css";
  js = "https://unpkg.com/leaflet@1.3.4/dist/leaflet.js";
  self = this;

  if (typeof Promise !== "undefined") {
    // Modern Promise is truly asynchronous, hence faster

    Promise.all([
      fetch(dataset),
      self.promiseMe(css),
      self.promiseMe(js)
    ])
    .then(function (response) {
      return response[0].json();
    })
    .catch(function (error) {
      return self.statusIcon("\uD83D\uDEAB", error);
    })
    .then(function (response) {
      return self.postInit(response, option);
    });

  } else {
    // Fallback is ordered, not so asynchronous

    callback = function () {
      self.fetchJson(dataset, function(response) { self.postInit(response, option); });
    };

    loaded = 0;
    recall = function recall() {
      loaded += 1;
      arg = arguments;
      if (loaded >= urls.length) {
        callback.call(self, arg);
      }
    };

    urls = [css, js];
    for (i = 0; i < urls.length; i += 1) {
      if (i >= urls.length) {
        break;
      }
      self.loadMe(urls[i], recall);
    }
  }
},

"statusIcon": function statusIcon(character, error) {
  /**
   * Fullview status icon
   * @param {string} character - icon illustration
   * @param {object} error - optional
   * @param {return} boolean - Failure if error
   */
  "use strict";
  var home = document.getElementById(this.OPT.id);
  
  function div(home, text, size) {
    var elem = document.createElement("div");
    elem.textContent = text;
    elem.style["text-align"] = "center";
    if (typeof size !== "undefined") {
      elem.style["font-size"] = size;
    }
    home.appendChild(elem);
  }

  while (home.firstChild) {
    home.removeChild(home.firstChild);
  }
  div(home, character, "1000%");
  if (typeof error === "object" && "message" in error) {
    div(home, "( " + error.message + " )");
    //console.error(error); // Development only
    return false;
  }

  return true;
},

"fetchJson": function fetchJson (url, callback) {
  /**
   * Classic JSON load
   * @param {string} url - URL to load
   * @param {Object} callback - Post-load function, non-Promise only
   */
  "use strict";
  var self = this;
  var http = new XMLHttpRequest();

  http.onreadystatechange = (function() {
    if (http.readyState === 4) {
      if (http.status === 200) {
        var response = JSON.parse(http.responseText);
        if (callback) {
          callback(response);
        }
      } else {
        self.statusIcon("\uD83D\uDEAB", {message: http.status + ": Could not load "+ url});
      }
    }
  });
  http.open("GET", url);
  http.send();
},

"loadMe": function loadMe (url, callback) {
  /**
   * Classic JS/CSS load, based on file extension
   * @param {string} url - URL to load
   * @param {Object} callback - Post-load function, non-Promise only
   */
  "use strict";
  var self = this;
  var element;

  if (url.split(".").pop() === "css") {
    element = document.createElement("link");
    element.rel = "stylesheet";
    element.href = url;
  } else {
    element = document.createElement("script");
    element.type = "text/javascript";
    element.src = url;
  }
  element.onreadystatechange = callback;
  element.onload = callback;
  element.onerror = (function() {
    self.statusIcon("\uD83D\uDEAB", {message: "Could not load " + url});
  });
  document.head.appendChild(element);
},

"promiseMe": function promiseMe(url) {
  /**
   * Modern JS/CSS load, based on file extension
   * @param {string} url - URL to load
   * @param {return} promise
   */
  "use strict";
  return new Promise(function (resolve, reject) {
    var element;
    if (url.split(".").pop() === "css") {
      element = document.createElement("link");
      element.rel = "stylesheet";
      element.href = url;
    } else {
      element = document.createElement("script");
      element.src = url;
    }
    element.onload = resolve;
    element.onerror = reject;
    document.head.appendChild(element);
  });
},

"postInit": function postInit(response, option) {
  /**
   * After script and data load, before UI
   * @param {object} response - Json response
   * @param {Object} option - Dictionary of options, may be undefined
   * @param {return} boolean - Runtime success
   */
  "use strict";
  var scripts, i;

  try {
    if (typeof L === "undefined") {
      throw new Error("Could not find Leaflet");
    } else {
      if (typeof response !== "object") {
        throw new Error("Could not find dataset network");
      } else {

        this.MEM = {};
          // Internal memory object
        this.MEM.text = {};
          // text holds localisation references
        this.MEM.net = this.parseNetwork(response);
        this.parseOption(option);

        scripts = document.getElementsByTagName("script");
          // scriptUrl used for embed, so risky method acceptable
        for (i = 0; i < scripts.length; i += 1) {
          if (scripts[i].src.indexOf("aquius") !== -1) {
            // Script name must includes aquius
            this.MEM.scriptUrl = scripts[i].src;
            break;
          }
        }

        if (this.ui()) {
          return this.draw();
        } else {
          return false;
        }
      }
    }

  } catch (error) {
    return this.statusIcon("\uD83D\uDEAB", error);
  }
},

"getHash": function getHash() {
  /**
   * Get content of hash, with minimal integrity checks
   * @return {Object} dictionary of raw hash data as key:string
   */
  "use strict";
  var hashData = {};
  var hash = decodeURIComponent(document.location.hash.trim());
  var splitHash, i;

  if (hash.length === 0 || hash[0] !== "#") {
    return hashData;
  }
  splitHash = hash.slice(1).split("/");
  for (i = 0; i < splitHash.length; i += 1) {
    if (splitHash[i].length >= 2 && (/^[a-z\-()]$/.test(splitHash[i][0]))) {
      hashData[splitHash[i][0]] = splitHash[i].slice(1);
    }
  }
  return hashData;
},

"setHash": function setHash(setData) {
  /**
   * Sets one or more values in the url hash, retaining other valid hash data
   * @param {Object} setData - dictionary of key:data pairs to set. keys must be single alpha characters
   * @param {return} boolean - Runtime success
   */
  "use strict";
  var hashStrings = [];
  var hash = this.getHash();
  var keys = Object.keys(setData);
  var i;

  for (i = 0; i < keys.length; i += 1) {
    if (/^[a-z\-()]$/.test(keys[i])) {
      hash[keys[i]] = setData[keys[i]];
    }
  }
  keys = Object.keys(hash);
  for (i = 0; i < keys.length; i += 1) {
     hashStrings.push(keys[i] + encodeURIComponent(hash[keys[i]]));
  }
  location.hash = "#" + hashStrings.join("/");
  return true;
},

"parseOption": function parseOption(option) {
  /**
   * Type checks of options and addition of missing with defaults
   * @param {Object} option - Dictionary of options, optional
   * @param {return} boolean - Runtime success
   */
  "use strict";
  var hash, localeCheck, isLocale, keys, i, c;

  if (typeof option !== "object") {
    option = {};
  }

  hash = ("uiHash" in option && option.uiHash === true) ? this.getHash() : {};
    // Hash has to be opted in, since confuses embedded

  localeCheck = {};
    // Holds hashed locales huntil they can be checked against supported locales.
  isLocale = ["locale", "t"];
    // Options that require a supported locale
  keys = Object.keys(this.OPT);
  parent: for (i = 0; i < keys.length; i += 1) {
    if (keys[i] === "id") {
      continue;
        // Correct id was added at start of init()
    }
    if (keys[i] in hash) {
      // Hash takes precedence if valid. Only single character keys can be returned from the hash
      if (typeof this.OPT[keys[i]] === "string") {
        if (isLocale.indexOf(keys[i]) !== -1) {
          localeCheck[keys[i]] = hash[keys[i]].toString();
          continue;
        }
        this.OPT[keys[i]] = hash[keys[i]].toString();
        continue;
      } else {
        if (typeof this.OPT[keys[i]] === "number" && !Number.isNaN(parseFloat(hash[keys[i]]))) {
          this.OPT[keys[i]] = parseFloat(hash[keys[i]]);
          continue;
        }
      }
    }
    // Then configuration option if valid. Bad optional configuration fails silently
    if (keys[i] in option && typeof option[keys[i]] === typeof this.OPT[keys[i]]) {
      if (keys[i] === "base" && Array.isArray(option[keys[i]]) === false) {
        // Baselayers no iterable, so pass. Condition also applies to JSON configuration below
        continue;
      }
      if (keys[i] === "network" && Array.isArray(option[keys[i]])) {
         for (c = 0; c < option[keys[i]].length; c += 1) {
           if (option[keys[i]][c].length < 2 || typeof option[keys[i]][c][0] !== "object"  ||
             typeof option[keys[i]][c][1] !== "object") {
             continue parent;
           }
         }
         if ("MEM" in this && "net" in this.MEM) {
           if ("network" in this.MEM.net) {
             this.MEM.net.network = this.MEM.net.network.concat(option[keys[i]]);
           } else {
             this.MEM.net.network = option[keys[i]];
           }
           continue;
         }
      }
      this.OPT[keys[i]] = option[keys[i]];
      continue;
    }
    // Then JSON configuration option if available
    if ("MEM" in this && "net" in this.MEM && "option" in this.MEM.net && keys[i] in this.MEM.net.option &&
      typeof this.MEM.net.option[keys[i]] === typeof this.OPT[keys[i]]) {
      if (keys[i] === ("network" || "translation") || (keys[i] === "base" && Array.isArray(option[keys[i]]) === false)) {
        // network and translation already have dataset provisions, baselayers must be iterable
        continue;
      }
      this.OPT[keys[i]] = this.MEM.net.option[keys[i]];
      continue;
    }
    // Else original OPT remains
  }

  this.OPT.n = parseInt(this.OPT.n, 10);
    // Is index, thus must be integer
  if (this.OPT.n >= this.MEM.net.network.length || this.OPT.n < 0) {
    // And must be in range of its index
    this.OPT.n = 0;
  }

  keys = Object.keys(localeCheck);
  for (i = 0; i < keys.length; i += 1) {
    if (keys[keys[i]] in this.LOC || keys[keys[i]] in this.OPT.translation || ("MEM" in this &&
      "net" in this.MEM && "translation" in this.MEM.net && keys[keys[i]] in this.MEM.net.translation)) {
      // Key has at least some support. Lowercase locales arriving in the hash will fail here silently
      this.OPT[keys[i]] = keys[keys[i]];
    }
  }

  return true;
},

"parseNetwork": function parseNetwork(response) {
  /**
   * Basic structural checks for JSON network object
   * @param {Object} response - JSON containing hopefully network data
   * @param {return} response
   */
  "use strict";
  var errorText = "Malformed JSON dataset: ";
  var objs, i, type, schema, keys, l;

    // JSON dataset is aggressively parsed because checking/fixing on use slows draw() dramatically
  if (typeof response !== "object") {
    throw new Error(errorText + "json");
  }

  objs = ["meta", "translation", "option"];
    // Object in schema
  for (i = 0; i < objs.length; i += 1) {
    if (objs[i] in response && typeof response[objs[i]] !== "object") {
      throw new Error(errorText + objs[i]);
    }
  }
    // All but meta optional and may continue not to exist
  if ("meta" in response === false || "schema" in response.meta === false) {
    throw new Error(errorText + "meta.schema");
      // Future datastructure will reference meta.schema (does not yet matter what it is)
  }

  type = ["object", "number"];
  schema = {
    // Node and Place reference positions on their respective arrays
    "network": [0, 0],
      // Product array, Name dictionary. Caution: If extending also extend network in parseOption()
    "link": [1, 1, 0, 0],
      // Product, Service, Node array, Caveat dictionary: split:[Nodes], shared:Product, direction:true, circular:true
    "node": [1, 1, 1],
      // X, Y, Place
    "place": [1, 1, 1]
      // X, Y, Demographic
  };

  keys = Object.keys(schema);
  for (i = 0; i < keys.length; i += 1) {
    if (keys[i] in response === false || Array.isArray(response[keys[i]]) === false) {
      response[keys[i]] = [];
    }
    for (l = 0; l < response[keys[i]].length; l += 1) {
      if (Array.isArray(response[keys[i]][l]) === false) {
        throw new Error(errorText + keys[i] + "[" + (l + 1) + "] not iterable");
      }
      if (response[keys[i]][l].length < schema[keys[i]].length) {
        throw new Error(errorText + keys[i] + "[" + (l + 1) +
          "] length < " + schema[keys[i]].length +")");
      }
      for (var t = 0; t < schema[keys[i]].length; t += 1) {
        if (typeof response[keys[i]][l][t] !== type[schema[keys[i]][t]]) {
          throw new Error(errorText + keys[i] + "[" + (l + 1) +
            "][" + t + "] not type " + type[schema[keys[i]][t]]);
        }
      }
    }
  }
  return response;
},

"ui": function ui() {
  /**
   * Initiates user interface. At runtime only
   * @param {return} boolean success
   */
  "use strict";
   var self = this;
     // Lazy, but many closures and much juggling of values herein...
   var i, layers, set, input, label, span, div, name, text, layerLoop, controlNodes, controlForm, locales,
     lname, emb, exp, numeric, optionLocales;
     // Extremely messy code, every idea on its own, a lot of duplication of element-building

  if (typeof L === "undefined") {
    throw new Error("Could not find Leaflet");
  }
  if ("MEM" in this === false) {
    return false;
  }

  while (document.getElementById(self.OPT.id).firstChild) {
    document.getElementById(self.OPT.id).removeChild(document.getElementById(self.OPT.id).firstChild);
  }

  self.MEM.map = L.map(self.OPT.id, {preferCanvas: true})
    .setView([self.OPT.y, self.OPT.x], self.OPT.z);
    // Canvas renderer is faster. IE8 not supported anyway
  self.MEM.map.on("moveend", function () {
    var center = self.MEM.map.getCenter();
    self.OPT.x = center.lng;
    self.OPT.y = center.lat;
    self.OPT.z = self.MEM.map.getZoom();
    if (self.OPT.uiHash === true) {
      self.setHash({
        "x": center.lng.toFixed(Math.ceil(self.OPT.z/3)),
        "y": center.lat.toFixed(Math.ceil(self.OPT.z/3)),
        "z": self.OPT.z
      });
    }
  });

  self.MEM.map.on("click", function (evt) {
    self.OPT.c = evt.latlng.lng;
    self.OPT.k = evt.latlng.lat;
    self.OPT.m = self.OPT.z;
    if (self.OPT.uiHash === true) {
      self.setHash({
        "c": self.OPT.c.toFixed(Math.ceil(self.OPT.z/3)),
        "k": self.OPT.k.toFixed(Math.ceil(self.OPT.z/3)),
        "m": self.OPT.m
      });
    }
    self.draw();
  });

  self.MEM.map.attributionControl.addAttribution("<a href='https://timhowgego.github.io/Aquius/'>Aquius</a>");
    // Not localised

  for (i = 0; i < self.OPT.base.length; i += 1) {
    if ("url" in self.OPT.base[i]) {
      if ("options" in self.OPT.base[i] === false) {
        self.OPT.base[i].options = {};
      }
      if ("type" in self.OPT.base[i] && self.OPT.base[i].type === "wms") {
        L.tileLayer.wms(self.OPT.base[i].url, self.OPT.base[i].options).addTo(self.MEM.map);
      } else {
        L.tileLayer(self.OPT.base[i].url, self.OPT.base[i].options).addTo(self.MEM.map);
      }
    }
  }

  self.MEM.control = L.control.layers();

  layers = ["here", "link", "place", "node"];
    // First letter must be unique

  layerLoop = function layerLoop(i) {
    self.MEM[layers[i]] = L.layerGroup();

    self.MEM[layers[i]].on("add", function () {
      if (self.OPT.v.indexOf(layers[i][0]) === -1) {
        self.OPT.v += layers[i][0];
        if (self.OPT.uiHash === true) {
          self.setHash({
            "v": self.OPT.v
          });
        }
      }
    });

    self.MEM[layers[i]].on("remove", function () {
      self.OPT.v = self.OPT.v.replace(layers[i][0], "");
      if (self.OPT.uiHash === true) {
        self.setHash({
          "v": self.OPT.v
        });
      }
    });

    if (self.OPT.v.indexOf(layers[i][0]) !== -1) {
      self.MEM[layers[i]].addTo(self.MEM.map);
    }

    span = L.DomUtil.create("span");
    span.style.color = self.OPT[layers[i] + "Color"];
    span.id = self.OPT.id + "-layercontrol-" + layers[i];
    self.MEM.text[span.id] = layers[i];
    self.MEM.control.addOverlay(self.MEM[layers[i]], span.outerHTML);
  };

  for (i = 0;i < layers.length; i += 1) {
    layerLoop(i);
  }

  self.MEM.control.addTo(self.MEM.map);

  controlNodes = self.MEM.control.getContainer().childNodes;
  controlForm = null;
  for (i = 0; i < controlNodes.length; i += 1) {
    if (controlNodes[i].tagName === ("FORM" || "form")) {
      controlForm = controlNodes[i];
      break;
    }
  }

  if (controlForm !== null && self.OPT.uiLocale === true) {
    locales = Object.keys(self.LOC);
    optionLocales = Object.keys(self.OPT.translation);
    for (i = 0; i < optionLocales.length; i += 1) {
      if (locales.indexOf(optionLocales[i]) === -1) {
        locales.push(optionLocales[i]);
      }
    }
    if (locales.length > 1) {
      set = document.createElement("div");
      set.id = self.OPT.id + "-language";
      lname = set.id + "-radio";
      set.addEventListener("change", function () {
        self.OPT.t = document.querySelector("input[name='" + lname + "']:checked").value;
        if (self.OPT.uiHash === true) {
          self.setHash({"t": self.OPT.t});
        }
        self.localise();
      });
      for (i = 0; i < locales.length; i += 1) {
        input = document.createElement("input");
        input.value = locales[i];
        input.type = "radio";
        input.name = lname;
        if (self.OPT.t === locales[i]) {
          input.checked = "checked";
        }
        label = document.createElement("label");
        label.appendChild(input);
        if (locales[i] in self.OPT.translation && "language" in self.OPT.translation[locales[i]]) {
          text = self.OPT.translation[locales[i]].language;
        } else {
          if (locales[i] in self.LOC && "language" in self.LOC[locales[i]]) {
            text = self.LOC[locales[i]].language;
          } else {
            text = locales[i];
          }
        }
        label.appendChild(document.createTextNode(text));
          // Not localised
        set.appendChild(label);
      }
    controlForm.insertBefore(set, controlForm.childNodes[0]);
    }
  }

  if (controlForm !== null && self.OPT.uiNetwork === true && self.MEM.net.network.length > 1) {
    set = document.createElement("div");
    set.id = self.OPT.id + "-network";
    name = set.id + "-radio";
    set.addEventListener("change", function () {
      self.OPT.n = document.querySelector("input[name='" + name + "']:checked").value - 0;
      if (self.OPT.uiHash === true) {
        self.setHash({"n": self.OPT.n});
      }
      self.draw();
    });
    for (i = 0; i < self.MEM.net.network.length; i += 1) {
      input = document.createElement("input");
      input.value = i;
      input.type = "radio";
      input.name = name;
      if (i === self.OPT.n) {
        input.checked = "checked";
      }
      span = document.createElement("span");
      span.id = set.id + i;
      self.MEM.text[span.id] = "network" + i;
      label = document.createElement("label");
      label.appendChild(input);
      label.appendChild(span);
      set.appendChild(label);
    }
    controlForm.appendChild(set);
  }

  if (controlForm !== null && self.OPT.uiScale === true) {
    label = document.createElement("label");
    input = document.createElement("input");
    input.id = self.OPT.id + "-scale";
    input.type = "range";
      // Range not supported by IE9, but should default to text
    input.min = 1;
    input.value = self.OPT.s;
    input.max = 9;
    input.step = 2;
    input.addEventListener("change", function () {
      self.OPT.s = parseInt(document.getElementById(input.id).value, 10);
      if (self.OPT.uiHash === true) {
          self.setHash({"s": self.OPT.s});
        }
        self.draw();
    });
    div = document.createElement("div");
    div.id = input.id + "-text";
    div.style["text-align"] = "center";
    self.MEM.text[div.id] = "scale";
    label.appendChild(div);
    label.appendChild(input);
    controlForm.appendChild(label);
  }

  if (controlForm !== null && self.OPT.uiShare === true && Blob) {
    // IE<10 has no Blob support. Marginal feature omitted
    div = document.createElement("div");
    div.style["text-align"] = "center";
    emb = document.createElement("a");
    emb.id = self.OPT.id + "-embed";
    self.MEM.text[emb.id] = "embed";
    emb.style.cursor = "pointer";
    emb.download = self.OPT.id + ".html";
    emb.addEventListener("click", function () {
      var script = ("scriptUrl" in self.MEM) ? self.MEM.scriptUrl : "<!-- Add Script URL -->";
      var keys = Object.keys(self.OPT);
      var opt = {};
      var i, blob;
      for (i = 0; i < keys.length; i += 1) {
        if (keys[i] !== "id") {
          // ID is internal, instead specified as 1st argument of init()
          opt[keys[i]] = self.OPT[keys[i]];
        }
      }
      opt.uiHash = false;
        // Hash dangerous for embeds, so set false to ensure opt-in
      opt.locale = self.OPT.t;
        // User's language becomes default
      blob = new Blob(["<!DOCTYPE html><html style=\"height:100%;\" lang=\"" + opt.t +
        "\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width\" />" +
        "</head><body style=\"height:100%;margin:0;\">\n\n\n<div id=\"" +
        self.OPT.id + "\" style=\"height:100%;\"></div><script src=\"" + script +
        "\" async></script><script>window.addEventListener(\"load\",function(){aquius.init(\"" +
        self.OPT.id + "\"," + JSON.stringify(opt) +
        ")});</script>\n\n\n</body></html>"], {type: "text/html;charset=utf-8"});
        // Caution: If opt.dataset is local, embed will also be local
      emb.href = window.URL.createObjectURL(blob);
      // Hack imposing href on own caller to trigger download. Does this work everywhere?
    });
    div.appendChild(emb);
    div.appendChild(document.createTextNode(" | "));
    exp = document.createElement("a");
    exp.id = self.OPT.id + "-export";
    self.MEM.text[exp.id] = "export";
    exp.style.cursor = "pointer";
    exp.download = self.OPT.id + ".geojson";
    exp.addEventListener("click", function () {
      var outputMap = [],
        keys = Object.keys(self.MEM.outputMap);
      for (var i = 0; i < keys.length; i += 1) {
        if (self.OPT.v.indexOf(keys[i]) !== -1) {
          outputMap = outputMap.concat(self.MEM.outputMap[keys[i]]);
        }
      }
      // Missing all properties, but shapes and points may be useful
      var blob = new Blob([JSON.stringify(L.featureGroup(outputMap).toGeoJSON())],
        {type: "application/json;charset=utf-8"});
      exp.href = window.URL.createObjectURL(blob);
    });
    div.appendChild(exp);
    controlForm.appendChild(div);
  }

  var stats = ["link", "place", "node"];

  if (self.OPT.uiPanel === true) {
    self.MEM.panel = L.control({position: "bottomleft"});
    self.MEM.panel.onAdd = function () {
      div = document.createElement("div");
      L.DomEvent.disableClickPropagation(div);
      div.id = self.OPT.id + "-panel";
      div.style["font-weight"] = "bold";
      div.style.padding = "0.1em 0.6em";
      div.style["border-radius"] = "2em";
      div.style["background-color"] = "rgba(255, 255, 255, 0.7)";
      for (i = 0; i < stats.length; i += 1) {
        span = document.createElement("span");
        span.id = div.id + "-" + stats[i];
        span.style.color = self.OPT[stats[i] + "Color"];
        span.appendChild(document.createTextNode(" "));
        numeric = document.createElement("span");
        numeric.id =  span.id + "-value";
        numeric.style["font-size"] = Math.round(200 * self.OPT.panelScale) + "%";
        numeric.textContent = "0";
        span.appendChild(numeric);
        span.appendChild(document.createTextNode(" "));
        label = document.createElement("span");
        label.id = span.id + "-label";
        label.style["font-size"] = Math.round(100 * self.OPT.panelScale) + "%";
        label.style["vertical-align"] = Math.round(20 * self.OPT.panelScale) + "%";
        self.MEM.text[label.id] = stats[i];
        span.appendChild(label);
          // Order of number-label not (yet) localisable
        span.appendChild(document.createTextNode(" "));
        div.appendChild(span);
      }
      return div;
    };
    self.MEM.panel.addTo(self.MEM.map);
  }

  return self.localise();
},

"localise": function localise() {
  /**
   * Applies localized text
   * Precedence: option.translation, json.meta, json.network, these translations
   * First user locale, then default locale, else tag
   * @param {return} boolean success
   */
  "use strict";
  var keys, lang, tag, i, l, pos, attrib, anchor;

  function update(id, translation) {
    if (typeof translation !== "string") {
      translation = translation.toString();
    }
    if (document.getElementById(id)) {
      document.getElementById(id).textContent = translation;
    }
  }

  if ("MEM" in this === false) {
    return false;
  }

  keys = Object.keys(this.MEM.text);
  lang = [this.OPT.t, this.OPT.locale];
  parent: for (i = 0; i < keys.length; i += 1) {
    // Keys are document IDs with value tag
    for (l = 0; l < lang.length; l += 1) {
      tag = this.MEM.text[keys[i]];
      if (lang[l] in this.OPT.translation && tag in this.OPT.translation[lang[l]]) {
        update(keys[i], this.OPT.translation[lang[l]][tag]);
        continue parent;
      }
      if ("translation" in this.MEM.net && lang[l] in this.MEM.net.translation && tag in this.MEM.net.translation[lang[l]]) {
        update(keys[i], this.MEM.net.translation[lang[l]][tag]);
        continue parent;
      }
      if((/^network\d+/).test(tag)) {
        // Network psuedo tags = "network" + line number
        pos = tag.slice(7) - 0;
        if (pos >= 0 && pos < this.MEM.net.network.length && lang[l] in this.MEM.net.network[pos][1]) {
          update(keys[i], this.MEM.net.network[pos][1][lang[l]]);
          continue parent;
        }
      }
      if (lang[l] in this.LOC && tag in this.LOC[lang[l]]) {
        update(keys[i], this.LOC[lang[l]][tag]);
        continue parent;
      }
    }
    update(keys[i], tag);
      // Ergo needs translation
  }

  if ("attribution" in this.MEM) {
    this.MEM.map.attributionControl.removeAttribution(this.MEM.attribution);
  }

  if ("name" in this.MEM.net.meta) {
    if (this.OPT.t in this.MEM.net.meta.name &&
      typeof this.MEM.net.meta.name[this.OPT.t] === "string") {
      attrib = this.MEM.net.meta.name[this.OPT.t];
    } else {
      if (this.OPT.locale in this.MEM.net.meta.name &&
        typeof this.MEM.net.meta.name[this.OPT.locale] === "string") {
        attrib = this.MEM.net.meta.name[this.OPT.locale];
      }
    }
    if (typeof attrib === "string") {
      if ("url" in this.MEM.net.meta &&  typeof this.MEM.net.meta.url === "string") {
        anchor = document.createElement("a");
        anchor.href = this.MEM.net.meta.url;
        anchor.textContent = attrib;
        attrib = anchor.outerHTML;
      }
      if ("attribution" in this.MEM.net.meta && typeof this.MEM.net.meta.attribution === "object") {
        if (this.OPT.t in this.MEM.net.meta.attribution &&
          typeof this.MEM.net.meta.attribution[this.OPT.t] === "string") {
          attrib += " " + this.MEM.net.meta.attribution[this.OPT.t];
        } else {
          if (this.OPT.locale in this.MEM.net.meta.name &&
            typeof this.MEM.net.meta.name[this.OPT.locale] === "string") {
            attrib += " " + this.MEM.net.meta.attribution[this.OPT.locale];
          }
        }
      }
      this.MEM.attribution = attrib;
      this.MEM.map.attributionControl.addAttribution(this.MEM.attribution);
    }
  }

  return true;
},

"draw": function draw() {
  /**
   * Draws map content based on MEM and OPT. The main action
   * @param {return} boolean success
   */
  "use strict";
  var layers, i, searchRadius, searchCenter, fNode, stats, scale, link, net, node, place,
    hereMap, sLink, sNode, sFrom, split, common, circular, route, service, direction, r, pairs,
    p, placeMap, nodeMap, linkMap, uPlace, nodeOpt, placeOpt, linkOpt, from, matrix, index,
    to, id, fNum, tNum, f, t, keys, dummy, polyline, pop, shift, poly, serv;
    // That list is scary, viewed from up here, and half not needed like that

  function updatePanel (stats, option) {
    var keys = Object.keys(stats);
    var id, text;
    for (var s = 0; s < keys.length; s += 1) {
      id = option.id + "-panel-" + keys[s] + "-value";
      text = stats[keys[s]].toString();
      if (document.getElementById(id)) {
        if (typeof Intl.NumberFormat === "function") {
          try {
            text = new Intl.NumberFormat(option.t).format(stats[keys[s]]);
          } catch (e) {
            // Unsupported locale
          }
        }
        document.getElementById(id).textContent = text;
      }
    }
  }

  if (typeof L === "undefined") {
    throw new Error("Could not find Leaflet");
  }
  if ("MEM" in this === false) {
    return false;
  }
  if ("map" in this.MEM === false) {
    return this.ui();
  }

  layers = ["link", "place", "here", "node"];

  for (i = 0; i < layers.length; i += 1) {
    if (layers[i] in this.MEM === false) {
      return false;
    }
    this.MEM[layers[i]].clearLayers();
  }

  searchRadius = 5e6 / Math.pow(2, this.OPT.m);
    // Radius relates to zoom
  searchCenter = L.latLng(this.OPT.k, this.OPT.c);
  fNode = [];
  stats = {
    "link": 0,
      // Count of services (eg daily trains)
    "place": 0,
      // Count of demography (eg people)
    "node": 0
      // Count of nodes (eg stations)
  };
  scale = Math.exp((this.OPT.s-5)/2);
    // user scale factor
  link = this.MEM.net.link;
  net = this.MEM.net.network;
  node = this.MEM.net.node;
  place = this.MEM.net.place;
    // For readability

  hereMap = L.circle(searchCenter, {
    color: this.OPT.hereColor,
    weight: 2,
    fill: false,
    radius: searchRadius
  });
  hereMap.addTo(this.MEM.here);

  for (i = 0; i < node.length; i += 1) {
    if (node[i].length > 1 && searchRadius >=
      searchCenter.distanceTo(L.latLng(node[i][1], node[i][0]))) {
      fNode.push(i);
    }
  }

  if (fNode.length === 0) {
    if (this.OPT.uiPanel === true) {
      updatePanel(stats, this.OPT);
    }
    return true;
  }

  sLink = [];
    // Service by link [from[to[service]]] voids undefined
  sNode = [];
    // Service by node [node[service]] voids undefined

  for (i = 0; i < link.length; i += 1) {

    if (net[this.OPT.n][0].indexOf(link[i][0]) === -1) {
      // Product excluded
      continue;
    }
    if (link[i][2].length < 2) {
      // Erroneous route
      continue;
    }
    if ("shared" in link[i][3] && net[this.OPT.n][0].indexOf(link[i][3].shared) !== -1) {
      // Share included as parent
      continue;
    }
    sFrom = link[i][2].filter(function(value) {return fNode.indexOf(value) !== -1;});
      // Nodes both in this service and in fromNodes
    if (sFrom.length === 0) {
      // All nodes excluded
      continue;
    }

    split = 0;
    if ("split" in link[i][3] && Array.isArray(link[i][3].split)) {
      /**
       * splits (split === 1) only contributes to service count at nodes within unique sections,
       * unless (split === 2) fromNodes contains no common sections.
       * splits (split === 1) only plotted in unique sections,
       * unless (split === 2) fromNodes contains no common sections
       */
      common = link[i][2].filter(function(value) {return link[i][3].split.indexOf(value) === -1;});
      if (common.filter(function(value) {return fNode.indexOf(value) !== -1;}).length > 0) {
        split = 1;
          // Splits, including within common sections
      } else {
        split = 2;
          // Splits, containing no common sections
      }
    }
    circular = ("circular" in link[i][3] && link[i][3].circular === true) ?
      link[i][2].length - 1 : null;
      // Exclude the final node on a circular
    route = [];
    direction = ("direction" in link[i][3] && link[i][3].direction === true) ? 1 : 0;
    if (direction === 1) {
      for (r = 0; r < link[i][2].length; r += 1) {
        if (fNode.indexOf(link[i][2][r]) !== -1 ) {
          if (circular !== null) {
            route = link[i][2].slice(0, -1);
              // Come friendly bombs and fall on Parla
            route = route.slice(r).concat(route.slice(0, r));
              // Its circular uni-directional tram is nodal nightmare
            route.push(route[0]);
              /**
               * Still not perfect: Counts the whole service round the loop
               * Considered defering these service till they can be summarised at the end
               * However Parla has unequal frequencies in each direction,
               * so halving (as other circulars) over common sections is still wrong
               * Would need to calculate which direction is the fastest to each node
               */
          } else {
            route = link[i][2].slice(r);
              // Route ignores nodes before the 1st found in fNode
          }
          break;
        }
      }
    } else {
      route = link[i][2];
    }
    if (split !== 1) {
      stats.link += link[i][1];
    }

    for (r = 0; r < route.length; r += 1) {
      if ((split !== 1 || link[i][3].split.indexOf(route[r]) !== -1) && (circular !== r)) {
        service = (direction === 1 || fNode.indexOf(route[r]) !== -1) ? link[i][1] : link[i][1] / 2;
        sNode[route[r]] = (typeof sNode[route[r]] !== "undefined") ? sNode[route[r]] + service : service;
      }
      if (route.length-1 > r && (split !== 1 ||
        link[i][3].split.indexOf(route[r]) !== -1 || link[i][3].split.indexOf(route[r + 1]) !== -1)) {
        pairs = [
          [route[r], route[r + 1]],
          [route[r + 1], route[r]]
        ];
        service = (direction === 1 || (fNode.indexOf(route[r]) !== -1 && fNode.indexOf(route[r + 1]) !== -1)) ?
          link[i][1] : link[i][1] / 2;
        // sLink mirrored in both directions. once summed here, subsequently processing ignores the reverse
        for (p = 0; p < pairs.length; p += 1) {
          if (typeof sLink[pairs[p][0]] === "undefined") {
             sLink[pairs[p][0]] = [];
          }
          if (typeof sLink[pairs[p][0]][pairs[p][1]] === "undefined") {
            sLink[pairs[p][0]][pairs[p][1]] = service;
          } else {
          sLink[pairs[p][0]][pairs[p][1]] += service;
          }
        }
      }
    }
  }

  if (sLink.length === 0) {
    if (this.OPT.uiPanel === true) {
      updatePanel(stats, this.OPT);
    }
    return true;
  }

  placeMap = [];
  nodeMap = [];
  linkMap = [];
    // Layer content
  uPlace = [];
    // Unique places served
  nodeOpt = {
    weight: 1,
    color: this.OPT.nodeColor,
    fill: false
  };
  placeOpt = {
    stroke: false,
    fill: true,
    fillColor: this.OPT.placeColor,
    fillOpacity: this.OPT.placeOpacity
  };
  linkOpt = {
    color: this.OPT.linkColor
  };
  from = Object.keys(sLink);
  matrix = {};
    // from, to, service (listed twice, once in each direction)
  index = {};
    // serv-from [keys] (greatly speeds subsequent search of matrix)

  for (f = 0; f < from.length; f += 1) {
    fNum = from[f] - 0;
    to = Object.keys(sLink[fNum]);
    for (t = 0; t < to.length; t += 1) {
      if (to[t]+"-"+from[f] in matrix === false) {
        tNum = to[t] - 0;
        matrix[from[f]+"-"+to[t]] = [fNum, tNum, sLink[fNum][tNum]];
        id = sLink[fNum][tNum]+"-"+from[f];
        if (id in index) {
          index[id].push(from[f]+"-"+to[t]);
        } else {
          index[id] = [from[f]+"-"+to[t]];
        }
      }
    }
  }

  keys = Object.keys(matrix);
  dummy = 0;

  while (dummy < 1) {
    // Nonsense condition broken from within
    shift = keys.shift();
    poly = [matrix[shift][0], matrix[shift][1]];
    serv = matrix[shift][2];
    while (dummy < 1) {
      id = serv+"-"+poly[poly.length - 1];
      if (id in index && index[id].length > 0) {
        pop = index[id].pop();
        poly.push(matrix[pop][1]);
      } else{
        break;
        // Exit write polyline and reset loop
      }
    }
    polyline = [];
    for (i = 0; i < poly.length; i += 1) {
      polyline.push([node[poly[i]][1], node[poly[i]][0]]);
    }
    linkOpt.weight = Math.ceil(Math.log(1 + (serv *
      (1 / (this.OPT.linkScale * 4 * scale)))) * this.OPT.linkScale * 4 * scale);
      // Log factoring emphasised at higher scales
    linkMap.push(L.polyline(polyline, linkOpt)
      .bindTooltip(serv.toString()));
    if (keys.length === 0) {
      break;
      // All done
    }
  }

  for (i = 0; i < sNode.length; i += 1) {
    if (typeof sNode[i] !== "undefined" && node.length - 1 >= i) {
      stats.node += 1;
      nodeOpt.radius = Math.ceil(Math.log(1 + (sNode[i] *
      (1 / (this.OPT.nodeScale * 4 * scale)))) * this.OPT.nodeScale * 2 * scale);
        // If nodeScale=linkScale node radius is half link line width, so most nodes fit routes
      nodeMap.push(L.circleMarker([node[i][1], node[i][0]], nodeOpt)
        .bindTooltip(sNode[i].toString()));
      if(uPlace.indexOf(node[i][2]) === -1) {
        uPlace.push(node[i][2]);
      }
    }
  }

  for (i = 0; i < uPlace.length; i += 1) {
    if (place.length - 1 >= i) {
      stats.place += place[uPlace[i]][2];
      placeOpt.radius = Math.ceil(Math.sqrt(place[uPlace[i]][2] * this.OPT.placeScale * scale / 666));
        // Area in proportion to population
      placeMap.push(L.circleMarker([place[uPlace[i]][1], place[uPlace[i]][0]], placeOpt)
        .bindTooltip(place[uPlace[i]][2].toString()));
    }
  }

  L.layerGroup(placeMap).addTo(this.MEM.place);
  L.layerGroup(linkMap).addTo(this.MEM.link);
  L.layerGroup(nodeMap).addTo(this.MEM.node);
    /**
     * Layer order is initial visibility, bottom to top
     * These 3 lines account for almost half of draw() runtime
     * Heavier use may require limits, such as redrawing only to map bounds
     * and storing the nodeMap array in the meantime
     */
  this.MEM.outputMap = {
    "p": placeMap,
    "l": linkMap,
    "n": nodeMap,
    "h": hereMap
  };
    // Stored for geoJSON output

  if (this.OPT.uiPanel === true) {
    updatePanel(stats, this.OPT);
  }
  return true;
}

};
// EoF
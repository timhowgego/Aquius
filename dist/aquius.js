/*eslint-env browser*/
/*global L*/
/*global Promise*/


var aquius = aquius || {
/**
 * @namespace Aquius (Here+Us)
 * @version 0
 * @copyright MIT License
 */


"init": function init(configId, configOptions) {
  /**
   * Initialisation
   * @param {string} configId - Id of DOM element within which to build
   * @param {Object} configOptions - Optional, object with key:value configurations
   */
  "use strict";

  var hereFunction = this.here;
  var defaultLocale = "en-US";
  var defaultTranslation = {
    // Default locale translations: Each custom BCP 47-style locale matches en-US keys
    "en-US": {
      "lang": "English",
        // This language in that language
      "embed": "Embed",
        // Other strings are to be translated directed
      "export": "Export",
      "here": "Here",
      "language": "Language",
      "link": "Services",
      "network": "Network",
      "node": "Stops",
      "place": "People",
      "scale": "Scale",
      "service": "Period"
        // Expandable, but new keys should not start _ unless specially coded
    },
    "es-ES": {
      "lang": "Español",
      "embed": "Insertar",
      "export": "Exportar",
      "here": "Aquí",
      "language": "Idioma",
      "link": "Servicios",
      "network": "Red",
      "node": "Paradas",
      "place": "Personas",
      "scale": "Escala",
      "service": "Período"
    }
  };
  var defaultOptions = {
    "base": [
      {
        "options": {
          // May contain any option accepted by Leaflet's TileLayer
          "attribution":
            "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
          "maxZoom": 18
        },
        "type": "",
          // For WMS maps, type: "wms"
        "url": "http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
          // Without https likely to trigger mixed content warnings
      }
        // Multiple bases supported but only first can be solid, while others must be transparent
    ],
      // Base mapping (WMS tiles supported with type: wms)
    "c": -1.43,
      // Here click Longitude
    "dataObject": {},
      // JSON network data object: Used in preference to dataset
    "dataset": "",
      // JSON file containing network data: Recommended full URL, not just filename
    "hereColor": "#080",
      // CSS Color for here layer circle strokes
    "k": 54.54,
      // Here click Latitude
    "leaflet": {},
      // Active Leaflet library object L: Used in preference to loading own library
    "linkColor": "#f00",
      // CSS Color for link (service) layer strokes
    "linkScale": 1.0,
      // Scale factor for link (service) layer strokes: ceil(log(1+(service*(1/(scale*4))))*scale*2)
    "locale": defaultLocale,
      // Default locale, BCP 47-style: User selection is t
    "m": 9,
      // Here click zoom
    "map": {},
      // Active Leaflet map object: Used in preference to own map
    "minWidth": 2,
      // Minimum pixel width of links, regardless of scaling. Assists click useability
    "minZoom": 0,
      // Minimum map zoom. Sets a soft cap on query complexity
    "n": 0,
      // User selected network filter
    "network": [],
      // Extension of network: Array of products, Object of locale keyed names
    "networkAdd": true,
      // Append this network extension to dataset defaults. Set false to replace defaults
    "nodeColor": "#000",
      // CSS Color for node (stop) layer circle strokes
    "nodeScale": 1.0,
      // Scale factor for node (stop) layer circles: ceil(log(1+(service*(1/(scale*2))))*scale)
    "panelOpacity": 0.7,
      // CSS Opacity for background of the bottom-left summary panel
    "panelScale": 1.0,
      // Scale factor for text on the bottom-left summary panel
    "placeColor": "#00f",
      // CSS Color of place (population) layer circle fill
    "placeOpacity": 0.5,
      // CSS Opacity of place (population) layer circle fill: 0-1
    "placeScale": 1.0,
      // Scale factor for place (population) layer circles: ceil(sqrt(people*scale/666)
    "v": "hlnp",
      // Displayed map layers by first letter: here, link, node, place
    "r": 0,
      // User selected service filter
    "s": 5,
      // User selected global scale factor: 0 to 10
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
    "uiService": true,
      // Enables service selector
    "uiShare": true,
      // Enables embed and export
    "uiStore": true,
      // Enables browser session storage of user state
    "t": defaultLocale,
      // User selected locale: BCP 47-style)
    "translation": {},
      // Custom translations: Format matching aquius.LOC
    "x": 10.35,
      // Map view Longitude
    "y": 50.03,
      // Map view Latitude
    "z": 4
      // Map view zoom
  };
  var scriptURLs = [
    "https://unpkg.com/leaflet@1.3.4/dist/leaflet.css",
    "https://unpkg.com/leaflet@1.3.4/dist/leaflet.js"
  ];
    // Default Leaflet library CSS and JS
  var layerNames = ["place", "link", "node", "here"];
    // In order of map layer display, bottom to top. Char 0 unique. Has translation
  var layerSummaryNames = ["link", "place", "node"];
    // In order of display in panel, left to right

  function loadStatus(configId, configOptions, error) {
    // Error param optional

    var homeDomId = document.getElementById(configId);

    function toDiv(homeDomId, textContent, textScale) {
      var elementDiv = document.createElement("div");
      elementDiv.textContent = textContent;
      elementDiv.style["text-align"] = "center";
      if (typeof textScale !== "undefined" &&
        textScale > 0
      ) {
        elementDiv.style["font-size"] = parseInt(textScale * 100, 10) + "%";
      }
      homeDomId.appendChild(elementDiv);
    }

    while (homeDomId.firstChild) {
      homeDomId.removeChild(homeDomId.firstChild);
    }

    if (typeof error === "undefined") {
      toDiv(homeDomId, "\uD83C\uDF0D", 10);
        // Globe icon indicates a map of the globe to come. @future Animation of 3 globe views
      return true;
    } else {
      toDiv(homeDomId, "\uD83D\uDEAB", 10);
        // No entry icon indicates failure to load. @future re-init, would need all arguments
      if("message" in error) {
        toDiv(homeDomId, "( " + error.message + " )");
          // No localisation of errors
      }
      return false;
    }
  }


  function emptyNetworkJSON() {
    // Dummy dataset, to be used if no or bad dataset supplied

    return {
      "meta": {
        "schema": "0",
        "name": {
          "en-US": "Empty Dataset"
        }
      }
    };
  }


  function loadWithPromise(configId, configOptions, scriptURLs) {
    // Modern Promise is truly asynchronous, hence faster

    var i;
    var promiseArray = [];

    function promiseScript(url) {
      // Return Promise of url
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
    }

    for (i = 0; i < scriptURLs.length; i += 1) {
      promiseArray.push(promiseScript(scriptURLs[i]));
    }

    if ("dataset" in configOptions &&
      typeof configOptions.dataset === "string"
    ) {
      promiseArray.push(fetch(configOptions.dataset));
    }

    if (promiseArray.length === 0) {

      postLoad(configId, configOptions);
        // Skip loading

    } else {

      Promise.all(promiseArray)
      .then(function (responseObject) {
        if ("dataset" in configOptions &&
          typeof configOptions.dataset === "string"
        ) {
          return responseObject[promiseArray.length - 1].json();
        } else {
          return configOptions.dataObject;
        }
      })
      .then(function (responseJSON) {
        configOptions.dataObject = responseJSON;
        postLoad(configId, configOptions);
      })
      .catch(function (error) {
        // Script failure creates error event, while Fetch creates an error message
          return loadStatus(configId, configOptions, error);
      });
    }
  }


  function loadWithClassic(configId, configOptions, scriptURLs) {
    // Fallback is ordered, not so asynchronous

    var recallArguments, callbackLoadDataset, loadedScriptCount, recallScript, i;

    function loadScriptClassic(url, callback) {
      // Classic JS/CSS load, based on file extension

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
        return loadStatus(configId, configOptions, {"message": "Could not load " + url});
      });
      document.head.appendChild(element);
    }

    function fetchJson(url, callback) {
      // Classic JSON load

      var http = new XMLHttpRequest();

      http.onreadystatechange = (function() {
        if (http.readyState === 4) {
          if (http.status === 200) {
            var response = JSON.parse(http.responseText);
            if (callback) {
              callback(response);
            }
          } else {
            return loadStatus(configId, configOptions,
              {"message": http.status + ": Could not load "+ url});
          }
        }
      });
      http.open("GET", url);
      http.send();
    }

    callbackLoadDataset = function () {
      if ("dataset" in configOptions &&
        typeof configOptions.dataset === "string"
      ) { 
        fetchJson(configOptions.dataset, function(responseJSON) {
          configOptions.dataObject = responseJSON;
          return postLoad(configId, configOptions);
        });
      } else {
        postLoad(configId, configOptions);
      }
    };

    if (scriptURLs.length === 0) {

      callbackLoadDataset();
        // Skip Leaflet

    } else {

      loadedScriptCount = 0;
      recallScript = function recallScript() {
        loadedScriptCount += 1;
        recallArguments = arguments;
        if (loadedScriptCount >= scriptURLs.length) {
          callbackLoadDataset.call(this, recallArguments);
        }
      };

      for (i = 0; i < scriptURLs.length; i += 1) {
        if (i >= scriptURLs.length) {
          break;
        }
        loadScriptClassic(scriptURLs[i], recallScript);
      }

    }
  }


  function store(configId, configOptions, setObject) {
    // Returns URL hash if enabled, else session storage, as object, optionally setting setObject

    var storeObject = {};

    function getHash() {

      var i;
      var content = {};
      var hash = decodeURIComponent(document.location.hash.trim()).slice(1).split("/");

      for (i = 0; i < hash.length; i += 1) {
        if (hash[i].length >= 2 &&
          (/^[a-z\-()]$/.test(hash[i][0]))
        ) {
          content[hash[i][0]] = hash[i].slice(1);
        }
      }

      return content;
    }

    function setHash(configOptions, setObject) {

      var hashNames, urlHash, i;
      var content = getHash();
      var setNames = Object.keys(setObject);

      for (i = 0; i < setNames.length; i += 1) {
        if (setNames[i].length === 1 &&
          (/^[a-z\-()]$/.test(setNames[i]))
        ) {
          // Hash key names are a single alpha character
          content[setNames[i]] = setObject[setNames[i]];
        }
      }

      hashNames = Object.keys(content);
      urlHash = [];

      for (i = 0; i < hashNames.length; i += 1) {
        urlHash.push(hashNames[i] + encodeURIComponent(content[hashNames[i]]));
      }

      location.hash = "#" + urlHash.join("/");
      return content;
    }

    function getStore(configId) {

      try {
        // Support of sessionStorage does not automatically make it useable
        if (sessionStorage.getItem(configId) !== null) {
          return JSON.parse(sessionStorage.getItem(configId));
        } else {
          return {};
        }
          // Keyed by Id to allow multiple instances on the same HTML page
      } catch(e) {
        return {};
      }
    }

    function setStore(configId, configOptions, setObject) {

      var i;
      var theStore = getStore(configId);
      var setNames = Object.keys(setObject);

      for (i = 0; i < setNames.length; i += 1) {
        theStore[setNames[i]] = setObject[setNames[i]];
      }

      try {
        sessionStorage.setItem(configId, JSON.stringify(theStore));
      } catch(e) {
        // Pass
      }

      return theStore;
    }

    if (sessionStorage &&
      ("uiStore" in configOptions === false ||
      configOptions.uiStore === true)
    ) {
      // Store is opted out
      if (typeof setObject === "object") {
        storeObject = setStore(configId, configOptions, setObject);
      } else {
        storeObject = getStore(configId);
      }
    }

    if ("uiHash" in configOptions === true &&
      configOptions.uiHash === true
    ) {
      // Hash is opted in. Hash takes precedence over store for return object
      if (typeof setObject === "object") {
        storeObject = setHash(configOptions, setObject);
      } else {
        storeObject = getHash();
      }
    }

    return storeObject;
  }


  function parseconfigOptions(configId, configOptions) {
    // Reconcile configOptions with storage and defaults

    function networkTranslation(configOptions) {
      // Returns dummy translation block containing _networkI, where I is index position

      var networkTranslationNames, i, j;
      var networkTranslationObject = {};

      for (i = 0; i < configOptions.dataObject.network.length; i += 1) {
        if (configOptions.dataObject.network[i].length > 1 &&
          typeof configOptions.dataObject.network[i][1] === "object"
        ) {
          networkTranslationNames = Object.keys(configOptions.dataObject.network[i][1]);
          for (j = 0; j < networkTranslationNames.length; j += 1) {
            if (networkTranslationNames[j] in networkTranslationObject === false) {
              networkTranslationObject[networkTranslationNames[j]] = {};
            }
            networkTranslationObject[networkTranslationNames[j]]["_network" + i] =
              configOptions.dataObject.network[i][1][networkTranslationNames[j]];
          }
        }
      }

      return networkTranslationObject;
    }

    function attributionTranslation(configOptions) {
      // Returns dummy translation block containing _datasetName/Attribution

      var theseTranslationNames, i;
      var attributionTranslationObject = {};

      if ("meta" in configOptions.dataObject &&
        "name" in configOptions.dataObject.meta &&
        typeof configOptions.dataObject.meta.name === "object"
      ) {
        theseTranslationNames = Object.keys(configOptions.dataObject.meta.name);
        for (i = 0; i < theseTranslationNames.length; i += 1) {

          if (theseTranslationNames[i] in attributionTranslationObject === false) {
            attributionTranslationObject[theseTranslationNames[i]] = {};
          }

          attributionTranslationObject[theseTranslationNames[i]]._datasetName =
            configOptions.dataObject.meta.name[theseTranslationNames[i]].toString();

        }
      }

      if ("meta" in configOptions.dataObject &&
        "attribution" in configOptions.dataObject.meta &&
        typeof configOptions.dataObject.meta.attribution === "object"
      ) {
        theseTranslationNames = Object.keys(configOptions.dataObject.meta.attribution);
        for (i = 0; i < theseTranslationNames.length; i += 1) {

          if (theseTranslationNames[i] in attributionTranslationObject === false) {
            attributionTranslationObject[theseTranslationNames[i]] = {};
          }

          attributionTranslationObject[theseTranslationNames[i]]._datasetAttribution =
            configOptions.dataObject.meta.attribution[theseTranslationNames[i]].toString();

        }
      }

      return attributionTranslationObject;
    }

    function rangeIndexedOption(configOptions, option, dataObjectKey) {
      // Force eg n to be a valid network index

      configOptions[option] = parseInt(configOptions[option], 10);
      if (configOptions[option] < 0) {
        configOptions[option] = 0;
      } else {
        if (dataObjectKey in configOptions.dataObject &&
          Array.isArray(configOptions.dataObject[dataObjectKey]) &&
          configOptions[option] >= configOptions.dataObject[dataObjectKey].length
        ) {
          configOptions[option] = configOptions.dataObject[dataObjectKey].length - 1;
        }
      }

      return configOptions;
    }

    var storeObject, storeNames, translationObjects, translationLocales, translationNames, i, j, k;
    var defaultNames = Object.keys(defaultOptions);
    var localeNames = [];

    if (typeof configOptions.dataObject !== "object") {
      configOptions.dataObject = {};
    }

    // Option precedence = store, configuration, dataset, default

    for (i = 0; i < defaultNames.length; i += 1) {

      if (defaultOptions[defaultNames[i]] === defaultLocale) {
        localeNames.push(defaultNames[i]);
      }

      if (defaultNames[i] in configOptions === false ||
        typeof configOptions[defaultNames[i]] !== typeof defaultOptions[defaultNames[i]]
      ) {

        if ("option" in configOptions.dataObject &&
          defaultNames[i] in configOptions.dataObject.option &&
          typeof configOptions.dataObject.option[defaultNames[i]] ===
          typeof defaultOptions[defaultNames[i]]
        ) {
          configOptions[defaultNames[i]] = configOptions.dataObject.option[defaultNames[i]];
        } else {
          configOptions[defaultNames[i]] = defaultOptions[defaultNames[i]];
        }

      }

    }

    storeObject = store(configId, configOptions);
    storeNames = Object.keys(storeObject);
    for (i = 0; i < storeNames.length; i += 1) {
      if (defaultNames.indexOf(storeNames[i]) !== -1) {

        if (typeof configOptions[storeNames[i]] === "number") {
          if (Number.isNaN(parseFloat(storeObject[storeNames[i]])) === false) {
            configOptions[storeNames[i]] = parseFloat(storeObject[storeNames[i]]);
          }
            // Else bad data
        } else {
          if (typeof configOptions[storeNames[i]] === "string") {
            configOptions[storeNames[i]] = storeObject[storeNames[i]].toString();
          }
            // Else unsupported: Objects cannot be held in the store, since cannot easily be hashed
        }

      }
    }

    // Extend network
    if (configOptions.network.length > 0) {
      if ("network" in configOptions.dataObject &&
        Array.isArray(configOptions.dataObject.network)
      ) {
        if ("networkAdd" in configOptions &&
          configOptions.networkAdd === false
        ) {
          configOptions.dataObject.network = configOptions.network;
        } else {
          // Append bespoke network filters
          configOptions.dataObject.network =
            configOptions.dataObject.network.concat(configOptions.network);
        }
      } else {
        configOptions.dataObject.network = configOptions.network;
      }
    }

    configOptions = rangeIndexedOption(configOptions, "n", "network");
    configOptions = rangeIndexedOption(configOptions, "r", "service");

    if (configOptions.z < configOptions.minZoom) {
      configOptions.z = configOptions.minZoom;
    }
    if (configOptions.m < configOptions.minZoom) {
      configOptions.m = configOptions.minZoom;
    }

    // Translation precedence = configOptions, dataObject, default
    translationObjects = [];
    if ("translation" in configOptions.dataObject) {
      translationObjects.push(configOptions.dataObject.translation);
    }
    if ("network" in configOptions.dataObject &&
      Array.isArray(configOptions.dataObject.network)
    ) {
      translationObjects.push(networkTranslation(configOptions));
    }
    if ("meta" in configOptions.dataObject &&
      ("name" in configOptions.dataObject.meta ||
      "attribution" in configOptions.dataObject.meta)
    ) {
      translationObjects.push(attributionTranslation(configOptions));
    }
    translationObjects.push(defaultTranslation);

    for (i = 0; i < translationObjects.length; i += 1) {
      translationLocales = Object.keys(translationObjects[i]);
       for (j = 0; j < translationLocales.length; j += 1) {
         if (translationLocales[j] in configOptions.translation === false) {
           configOptions.translation[translationLocales[j]] = {};
         }
         translationNames = Object.keys(translationObjects[i][translationLocales[j]]);
         for (k = 0; k < translationNames.length; k += 1) {
           if (translationNames[k] in configOptions.translation[translationLocales[j]] === false) {
             configOptions.translation[translationLocales[j]][translationNames[k]] =
               translationObjects[i][translationLocales[j]][translationNames[k]];
           }
         }
      }
    }

    // Force locales to have at least some support. Entirely lowercase hashes get dropped here
    for (i = 0; i < localeNames.length; i += 1) {
      if (configOptions[localeNames[i]] in configOptions.translation === false) {
        configOptions[localeNames[i]] = defaultOptions[localeNames[i]];
      }
    }

    // Remove place if place data empty
    if ("place" in configOptions.dataObject === false ||
      configOptions.dataObject.place.length === 0
    ) {
      layerNames.splice(layerNames.indexOf("place"), 1);
      layerSummaryNames.splice(layerSummaryNames.indexOf("place"), 1);
    }

    return configOptions;
  }


  function buildMap(configId, configOptions) {
    // Map and events, all non-localised, with no bespoke layers or controls

    var i;

    if ("setView" in configOptions.map === false ||
      "on" in configOptions.map === false ||
      "getCenter" in configOptions.map === false ||
      "getZoom" in configOptions.map === false ||
      "attributionControl" in configOptions.map === false
    ) {
        // Create map
        while (document.getElementById(configId).firstChild) {
          document.getElementById(configId).removeChild(document.getElementById(configId).firstChild);
        }
        configOptions.map = configOptions.leaflet.map(configId, {
          minZoom: configOptions.minZoom,
          preferCanvas: true
        });
          // Canvas renderer is faster. IE8 not supported anyway
    }

    configOptions.map.attributionControl.addAttribution(
      "<a href=\"https://timhowgego.github.io/Aquius/\">Aquius</a>");

    configOptions.map.setView([configOptions.y, configOptions.x], configOptions.z);

    configOptions.map.on("moveend", function () {

      var accuracy;
      var center = configOptions.map.getCenter();
      configOptions.z = configOptions.map.getZoom();
      accuracy = Math.ceil(configOptions.z / 3);
      configOptions.x = parseFloat(center.lng.toFixed(accuracy));
      configOptions.y = parseFloat(center.lat.toFixed(accuracy));

      store(configId, configOptions, {
        "x": configOptions.x,
        "y": configOptions.y,
        "z": configOptions.z
      });

    });

    configOptions.map.on("click", function (evt) {

      var accuracy = Math.ceil(configOptions.z / 3);
      var center = evt.latlng;
      configOptions.c = parseFloat(center.lng.toFixed(accuracy));
      configOptions.k = parseFloat(center.lat.toFixed(accuracy));
      configOptions.m = configOptions.z;

      store(configId, configOptions, {
        "c": configOptions.c,
        "k": configOptions.k,
        "m": configOptions.m
      });

      configOptions = goHere(configId, configOptions);
    });

    for (i = 0; i < configOptions.base.length; i += 1) {
      if ("url" in configOptions.base[i]) {

        if ("options" in configOptions.base[i] === false) {
          configOptions.base[i].options = {};
        }

        if ("type" in configOptions.base[i] &&
          configOptions.base[i].type === "wms"
        ) {
          configOptions.leaflet.tileLayer.wms(
            configOptions.base[i].url, configOptions.base[i].options
            ).addTo(configOptions.map);
        } else {
          configOptions.leaflet.tileLayer(
            configOptions.base[i].url, configOptions.base[i].options
          ).addTo(configOptions.map);
        }

      }
    }

    return configOptions;
  }

  function getLocalised(configOptions, localiseThis) {

    if (configOptions.t in configOptions.translation &&
      localiseThis in configOptions.translation[configOptions.t]
    ) {
      // Available in user locale
      return configOptions.translation[configOptions.t][localiseThis];
    } else {
      if (configOptions.locale in configOptions.translation &&
        localiseThis in configOptions.translation[configOptions.locale]
      ) {
        // Available in default locale
        return configOptions.translation[configOptions.locale][localiseThis];
      }
    }
    return "";
  }

  function createElement(elementType, value, style) {
    // Returns DOM. Value and style key:value objects optional. Events not handled

    var theseValues, v;
    var thisElement = document.createElement(elementType);

    if (typeof value !== "undefined") {
      theseValues = Object.keys(value);
      for (v = 0; v < theseValues.length; v += 1) {
        thisElement[theseValues[v]] = value[theseValues[v]];
      }
    }

    if (typeof style !== "undefined") {
      theseValues = Object.keys(style);
      for (v = 0; v < theseValues.length; v += 1) {
        thisElement.style[theseValues[v]] = style[theseValues[v]];
      }
    }

    return thisElement;
  }

  function buildUI(configId, configOptions) {
    // Bespoke layers and controls, all localisable

    var keyName, selection, element, parent, child, control, controlForm,
      embedElement, exportElement, geoJSON, supportsPassiveOptions, i;
    var supportsPassive = false;
    var toLocalise = {};
      // DOM Id: translation key

    function localise(configOptions, toLocalise, rerender) {
      // Apply translation to localised DOM items

      var localiseThis, i;
      var toLocaliseNames = Object.keys(toLocalise);

      for (i = 0; i < toLocaliseNames.length; i += 1) {
        if (document.getElementById(toLocaliseNames[i])) {
          localiseThis = getLocalised(configOptions, toLocalise[toLocaliseNames[i]]);
          if (localiseThis !== "") {
            document.getElementById(toLocaliseNames[i]).textContent = localiseThis;
          }
        }
      }

      if (typeof rerender !== "undefined" &&
        rerender === true
      ) {
        configOptions = goHere(configId, configOptions, true);
      }
    }

    function layerEvents(configOptions, layerName) {
      // Adds events to _layer layers

      configOptions._layer[layerName].on("add", function () {
        if (configOptions.v.indexOf(layerName.charAt(0)) === -1) {
          configOptions.v += layerName.charAt(0);
          store(configId, configOptions, {
            "v": configOptions.v
          });
        }
      });

      configOptions._layer[layerName].on("remove", function () {
        configOptions.v = configOptions.v.replace(layerName.charAt(0), "");
        store(configId, configOptions, {
          "v": configOptions.v
        });
      });

      return configOptions;
    }

    function getControlForm(control) {
      // Returns DOM of form in control, to allow other elements to be hacked in

      var i;
      var controlForm = false;
      var nodes = control.getContainer().childNodes;

      for (i = 0; i < nodes.length; i += 1) {
        if (nodes[i].tagName === "FORM") {
          controlForm = nodes[i];
          break;
        }
      }

      return controlForm;
    }

    function getEmbed(configId, configOptions) {
      // Return embed blob

      var i;
      var lines = [];
      var script = "<!--Script URL-->";
      var scripts = document.getElementsByTagName("script");
      var ownOptions = {};
      var optionsNames = Object.keys(configOptions);
      var excludedOptions = ["dataObject", "leaflet", "map", "translation", "uiHash"];
        // Options begining _ automatically excluded

      for (i = 0; i < scripts.length; i += 1) {
        if (scripts[i].src.indexOf("aquius") !== -1) {
          // Script name must includes aquius. Crude
          script = scripts[i].src;
          break;
        }
      }

      for (i = 0; i < optionsNames.length; i += 1) {
        if (optionsNames[i].charAt(0) !== "_" &&
          excludedOptions.indexOf(optionsNames[i]) === -1 &&
          configOptions[optionsNames[i]] !== defaultOptions[optionsNames[i]]
        ) {
           ownOptions[optionsNames[i]] = configOptions[optionsNames[i]];
        }
      }

      lines.push(createElement("div", {
        "id": configId
      }, {
        "height": "100%"
      }).outerHTML);

      lines.push(createElement("script", {
        "src": script
      }).outerHTML);

      lines.push(createElement("script", {
        "textContent": "window.addEventListener(\"load\",function(){aquius.init(\"" +
          configId + "\"," + JSON.stringify(ownOptions) + ")});"
      }).outerHTML);

      return new Blob([lines.join("\n")], {type: "text/plain;charset=utf-8"});
    }

    function getSelect(selection, rootId, selected) {
      // Returns select DOM, for selection array of keys:
      // value (returned on selection), label (not localised), id (localisation referenced)

      var theChild, i;
      var theParent = createElement("select", {
        "id": rootId
      }, {
        "background-color": "#fff",
        "color": "#000",
        "font": "12px/1.5 \"Helvetica Neue\", Arial, Helvetica, sans-serif"
          // Leaflet font not inherented by Select
      });

      for (i = 0; i < selection.length; i += 1) {
        theChild = createElement("option");
        if ("value" in selection[i]) {
          theChild.value = selection[i].value;
          if (selection[i].value === selected) {
            theChild.selected = "selected";
          }
        }
        if ("label" in selection[i]) {
          theChild.textContent = selection[i].label;
        }
        if ("id" in selection[i]) {
          theChild.id = selection[i].id;
        }
        theParent.appendChild(theChild);
      }

      return theParent;
    }

    function getRadio(selection, rootId, selected) {
      // Returns radio DOM, for selection array of keys:
      // value (returned on selection), label (not localised), id (localisation referenced)

      var theChild, theElement, i;
      var theParent = createElement("div", {
        "id": rootId
      });

      for (i = 0; i < selection.length; i += 1) {
        theChild = createElement("label");

        theElement = createElement("input", {
          "type": "radio",
          "name": rootId
        });
        if ("value" in selection[i]) {
          theElement.value = selection[i].value;
          if (selection[i].value === selected) {
            theElement.checked = "checked";
          }
        }
        theChild.appendChild(theElement);

        theElement = createElement("span");
        if ("id" in selection[i]) {
          theElement.id = selection[i].id;
        }
        if ("label" in selection[i]) {
          theElement.textContent = selection[i].label;
        }
        theChild.appendChild(theElement);

        theParent.appendChild(theChild);
      }

      return theParent;
    }

    function createRadio(controlForm, configOptions, dataObjectKey, option, uiOption) {

      var element, selection, i;

      if (dataObjectKey in configOptions.dataObject &&
        Array.isArray(configOptions.dataObject[dataObjectKey]) &&
        configOptions.dataObject[dataObjectKey].length > 1 &&
        configOptions[uiOption] === true
      ) {

        selection = [];
        for (i = 0; i < configOptions.dataObject[dataObjectKey].length; i += 1) {
          selection.push({
            "value": i,
            "id": configId + dataObjectKey + i
            });
          toLocalise[configId + dataObjectKey + i] = "_" + dataObjectKey + i;
        }

        element = getRadio(selection, configId + dataObjectKey, configOptions[option]);
        element.addEventListener("change", function () {
          configOptions[option] = parseInt(document.querySelector("input[name='" +
            configId + dataObjectKey + "']:checked").value, 10);
          var opt = {};
          opt[option] = configOptions[option];
          store(configId, configOptions, opt);
          configOptions = goHere(configId, configOptions);
        }, supportsPassive ? { "passive": true } : false);
        controlForm.appendChild(element);

      }
    }

    try {
      supportsPassiveOptions = Object.defineProperty({}, "passive", {
        get: function() {
          supportsPassive = true;
          return true;
        }
      });
      window.addEventListener("test", null, supportsPassiveOptions);
      window.removeEventListener("test", null, supportsPassiveOptions);
    } catch (e) {
      // Pass
    }

    keyName = ["_datasetName", "_datasetAttribution"];
    for (i = 0; i < keyName.length; i += 1) {
      toLocalise[configId + keyName[i]] = keyName[i];
      keyName[i] = configId + keyName[i];
    }
    element = createElement("span");
    if ("meta" in configOptions.dataObject &&
      "url" in configOptions.dataObject.meta &&
      typeof configOptions.dataObject.meta.url === "string"
    ) {
      element.appendChild(createElement("a", {
        "href": configOptions.dataObject.meta.url,
        "id": keyName[0]
      }));
    } else {
      element.appendChild(createElement("span", {
        "id": keyName[0]
      }));
    }
    element.appendChild(document.createTextNode(" "));
    element.appendChild(createElement("span", {
      "id": keyName[1]
    }));
    configOptions.map.attributionControl.addAttribution(element.outerHTML);

    if (configOptions.uiLocale === true) {
      keyName = Object.keys(configOptions.translation);
      if (keyName.length > 1) {

        control = configOptions.leaflet.control({position: "topright"});
        control.onAdd = function () {

          parent = createElement("div", {
            "className": "aquius-locale",
            "id": configId + "locale"
          }, {
            "background-color": "#fff",
            "border-bottom": "2px solid rgba(0,0,0,0.3)",
            "border-left": "2px solid rgba(0,0,0,0.3)",
            "border-radius": "0 0 0 5px",
            "margin": 0,
            "padding": "0 0 1px 1px"
          });
          configOptions.leaflet.DomEvent.disableClickPropagation(parent);

          element = createElement("label", {
            "id": configId + "langname",
            "for": configId + "lang"
          } , {
            "display": "none"
          });
            // Label improves web accessibility, but is self-evident to most users
          toLocalise[configId + "langname"] = "language";
          parent.appendChild(element);

          selection = [];
          for (i = 0; i < keyName.length; i += 1) {
            selection.push({
              "value": keyName[i],
              "label": ("lang" in configOptions.translation[keyName[i]]) ?
                configOptions.translation[keyName[i]].lang : keyName[i]
            });
          }

          element = getSelect(selection, configId + "lang", configOptions.t);
          element.style.border = "none";
          element.addEventListener("change", function () {
            configOptions.t = document.getElementById(configId + "lang").value;
            store(configId, configOptions, {
              "t": configOptions.t
            });
            localise(configOptions, toLocalise, true);
          }, supportsPassive ? { "passive": true } : false);
          parent.appendChild(element);

          return parent;
        };
        control.addTo(configOptions.map);

      }
    }

    if (configOptions.uiPanel === true) {
      control = configOptions.leaflet.control({position: "bottomleft"});
      control.onAdd = function () {

        parent = createElement("div", {
          "className": "aquius-panel",
          "id": configId + "panel"
        }, {
          "background-color": "rgba(255,255,255," + configOptions.panelOpacity + ")",
          "font-weight": "bold",
          "padding": "0 3px",
          "border-radius": "5px"
        });
        configOptions.leaflet.DomEvent.disableClickPropagation(parent);

        for (i = 0; i < layerSummaryNames.length; i += 1) {

          child = createElement("span", {}, {
            "color": configOptions[layerSummaryNames[i] + "Color"],
            "margin": "0 0.1em"
          });
          element = createElement("span", {
            "id": configId + layerSummaryNames[i] + "value",
            "textContent": "0"
          }, {
            "font-size": Math.round(200 * configOptions.panelScale).toString() + "%",
            "margin": "0 0.1em"
          });
          child.appendChild(element);
          element = createElement("span", {
            "id": configId + layerSummaryNames[i] + "label",
          }, {
            "font-size": Math.round(100 * configOptions.panelScale).toString() + "%",
            "margin": "0 0.1em",
            "vertical-align": "20%"
          });
          toLocalise[element.id] = layerSummaryNames[i];
          child.appendChild(element);
          parent.appendChild(child);
          parent.appendChild(document.createTextNode(" "));

        }

        return parent;
      };
      control.addTo(configOptions.map);
    }

    configOptions._layer = {};
    selection = layerNames.reverse();

    control = configOptions.leaflet.control.layers();
    for (i = 0; i < selection.length; i += 1) {

      configOptions._layer[selection[i]] = configOptions.leaflet.layerGroup();
      configOptions = layerEvents(configOptions, selection[i]);
      if (configOptions.v.indexOf(selection[i].charAt(0)) !== -1) {
        configOptions._layer[selection[i]].addTo(configOptions.map);
      }

      element = createElement("span", {
        "id": configId + selection[i] + "name"
      }, {
        "color": configOptions[selection[i] + "Color"]
      });
      toLocalise[element.id] = selection[i];
      control.addOverlay(configOptions._layer[selection[i]], element.outerHTML);

    }
    control.addTo(configOptions.map);

    controlForm = getControlForm(control);
    if (!controlForm) {
      // Error, escape with partial UI
      localise(configOptions, toLocalise);
      return configOptions;
    }

    createRadio(controlForm, configOptions, "network", "n", "uiNetwork");

    createRadio(controlForm, configOptions, "service", "r", "uiService");

    if (configOptions.uiScale === true) {
      parent = createElement("label");

      child = createElement("div", {
        "id": configId + "scalename"
      }, {
        "text-align": "center"
      });
      toLocalise[child.id] = "scale";
      parent.appendChild(child);

      child = createElement("div", {}, {
        "text-align": "center"
      });
      element = createElement("input", {
        "id": configId + "scale",
        "type": "range",
          // Range not supported by IE9, but should default to text
        "min": 0,
        "max": 10,
        "value": configOptions.s
      });
      element.addEventListener("change", function () {
        configOptions.s = parseInt(document.getElementById(configId + "scale").value, 10);
        store(configId, configOptions, {
          "s": configOptions.s
        });
        configOptions = goHere(configId, configOptions, true);
      }, supportsPassive ? { "passive": true } : false);
      child.appendChild(element);
      parent.appendChild(child);

      controlForm.appendChild(parent);
    }

    if (configOptions.uiShare === true &&
      Blob
    ) {
      // IE<10 has no Blob support
      parent = createElement("div", {}, {
        "text-align": "center"
      });

      if (configOptions.dataset !== "") {
        // Data supplied direct to dataObject cannot sensibly be embedded
        embedElement = createElement("a", {
          "id": configId + "embed",
          "download": configId + ".txt",
          "role": "button"
            // Actual buttons would look like like form submit thus too important
        }, {
          "cursor": "pointer"
        });
        embedElement.addEventListener("click", function () {
          embedElement.href = window.URL.createObjectURL(getEmbed(configId, configOptions));
            // Hack imposing href on own caller to trigger download. Requires embedElement persist
        }, supportsPassive ? { "passive": true } : false);
        toLocalise[embedElement.id] = "embed";
        parent.appendChild(embedElement);
        parent.appendChild(document.createTextNode(" | "));
      }

      exportElement = createElement("a", {
        "id": configId + "export",
        "download": configId + ".json",
        "role": "button"
        }, {
          "cursor": "pointer"
        });
      exportElement.addEventListener("click", function () {
        geoJSON = [];
        for (i = 0; i < layerNames.length; i += 1) {
          if (configOptions.v.indexOf(layerNames[i].charAt(0)) !== -1) {
            geoJSON.push(layerNames[i]);
          }
        }
        exportElement.href = window.URL.createObjectURL(
          new Blob([JSON.stringify(hereFunction(
            configOptions.dataObject,
            configOptions.c,
            configOptions.k,
            5e6 / Math.pow(2, configOptions.m),
            {
              "filter": configOptions.n,
              "geoJSON": geoJSON,
              "sanitize": false,
              "service": configOptions.r
            }
          ))],
          {type: "application/json;charset=utf-8"})
        );
      }, supportsPassive ? { "passive": true } : false);
      toLocalise[exportElement.id] = "export";
      parent.appendChild(exportElement);

      controlForm.appendChild(parent);
    }

    localise(configOptions, toLocalise);
    return configOptions;
  }


  function postLoad(configId, configOptions) {
    // Post-load object and data checks, map and UI build, and initial here query

    if (typeof L !== "object" ||
      "version" in L === false
    ) {
      return loadStatus(configId, configOptions, {"message": "Leaflet failed to load"});
    } else {
      configOptions.leaflet = L;
    }

    configOptions = parseconfigOptions(configId, configOptions);
    configOptions = buildMap(configId, configOptions);
    configOptions = buildUI(configId, configOptions);

    configOptions = goHere(configId, configOptions, false, true);
  }


  function goHere(configId, configOptions, rerender, runonce) {
    // Requests and here and processes result. Rerender refreshes UI only. Runonce initial only

    var id, geometry, keyName, name, options, scale, i, j;

    function makePopup(name, value, linkObject, nodeObject) {

      var popup = createElement("div", {}, {
        "color": "#000"
      });

      function buildData(reference, popup, isHead) {

        var block, element, i;

        if (reference !== "undefined" &&
          Array.isArray(reference)
        ) {
          block = createElement("div", {}, {
            "margin": "0.3em 0"
          });
          if (isHead) {
            block.style["font-weight"] = "bold";
          } else {
            block.style["line-height"] = "2.3em";
          }
          for (i = 0; i < reference.length; i += 1) {
            if ("n" in reference[i]) {
              if ("u" in reference[i]) {
                if (isHead) {
                  element = createElement("a", {
                    "href": reference[i].u
                  });
                } else {
                  element = createElement("a", {
                    "href": reference[i].u
                  }, {
                    "color": "#000",
                    "text-decoration": "none"
                  });
                }
              } else {
                element = createElement("span");
              }
              element.textContent = reference[i].n;
              if (isHead === false) {
                element.style.border = "1px solid #000";
                element.style.padding = "0.3em 0.5em";
                element.style["white-space"] = "nowrap";
                if ("c" in reference[i]) {
                  element.style["background-color"] = "#" + reference[i].c;
                }
                if ("t" in reference[i]) {
                  element.style.color = "#" + reference[i].t;
                  element.style["border-color"] = "#" + reference[i].t;
                }
              }
              block.appendChild(element);
              if (i < reference.length - 1) {
                if (isHead) {
                  block.appendChild(document.createTextNode("|"));
                } else {
                  block.appendChild(document.createTextNode(" "));
                }
              }
            }
          }
          popup.appendChild(block);
        }

        return popup;
      }

      popup = buildData(nodeObject, popup, true);

      if (value < 10 &&
        value % 1 !== 0
      ) {
        value = (Math.round(value * 10) / 10).toString();
      } else {
        value = Math.round(value).toString();
      }
      popup.appendChild(createElement("div", {
        "textContent": name + ": " + value
      }, {
        "margin": "0.3em 0"
      }));

      popup = buildData(linkObject, popup, false);

      return popup;

    }

    function getLinkColor(configOptions, reference) {

      var i;
      var colors = [];

      function mergeColors(colors, defaultColor) {

        var averageColor, i;
        var mixedColor = "#";
        var rgb = [[], [], []];

        for (i = 0; i < colors.length; i += 1) {
          if (colors[i].length === 6) {
            // Currently supports only original HTML hex style colors
            rgb[0].push(parseInt(colors[i].slice(0, 2), 16));
            rgb[1].push(parseInt(colors[i].slice(2, 4), 16));
            rgb[2].push(parseInt(colors[i].slice(4, 6), 16));
          }
        }

        for (i = 0; i < rgb.length; i += 1) {
          if (rgb[i].length === 0) {
            return defaultColor;
              // Unrecognised color style
          }
          averageColor = Math.round((rgb[i].reduce(function(a, b) {
            return a + b;
          }, 0)) / rgb[i].length);
          if (averageColor <= 16) {
            mixedColor += "0";
          }
          mixedColor += averageColor.toString(16);
        }

        return mixedColor;
      }

      if (reference === "undefined" ||
        !Array.isArray(reference)
      ) {
        return configOptions.linkColor;
      }

      for (i = 0; i < reference.length; i += 1) {
        if ("c" in reference[i] &&
          colors.indexOf(reference[i].c) === -1
        ) {
          colors.push(reference[i].c);
        }
      }

      if (colors.length === 0) {
        return configOptions.linkColor;
      }
      if (colors.length === 1) {
        return "#" + colors[0];
        // Future: Link color !== node color (also below)
      }

      return mergeColors(colors, "#" + colors[0]);
    }

    for (i = 0; i < layerNames.length; i += 1) {
      if (layerNames[i] in configOptions._layer) {
        configOptions._layer[layerNames[i]].clearLayers();
      }
    }

    if (typeof rerender === "undefined" ||
      rerender !== true ||
      "_here" in configOptions === false
    ) {
      options = {
        "filter": configOptions.n,
        "service": configOptions.r
      };
      if (typeof runonce !== "undefined" &&
        runonce === true
      ) {
        options.sanitize = true;
      } else {
        options.sanitize = false;
      }
      configOptions._here = hereFunction(
        configOptions.dataObject,
        configOptions.c,
        configOptions.k,
        5e6 / Math.pow(2, configOptions.m),
          // Range factor duplicated in export
        options
      );
    }

    if ("dataObject" in configOptions._here) {
      configOptions.dataObject = configOptions._here.dataObject;
    }

    if (configOptions.uiPanel === true &&
      "summary" in configOptions._here
    ) {
      keyName = Object.keys(configOptions._here.summary);
      for (i = 0; i < keyName.length; i += 1) {
        id = configId + keyName[i] + "value";
        if (document.getElementById(id)) {
          try {
            document.getElementById(id).textContent =
              new Intl.NumberFormat(configOptions.t)
                .format(Math.round(configOptions._here.summary[keyName[i]]));
          } catch (e) {
            // Unsupported feature or locale
            document.getElementById(id).textContent =
              Math.round(configOptions._here.summary[keyName[i]]).toString();
          }
        }
      }
    }

    if ("place" in configOptions._here &&
      "place" in configOptions.dataObject &&
      configOptions.dataObject.place.length > 0
    ) {
      scale = Math.exp((configOptions.s - 5) / 2) * configOptions.placeScale / 666;
      name = getLocalised(configOptions, "place");
      for (i = 0; i < configOptions._here.place.length; i += 1) {
        if ("circle" in configOptions._here.place[i] &&
          "value" in configOptions._here.place[i] &&
          configOptions._here.place[i].circle.length > 1
        ) {
          configOptions.leaflet.circleMarker(
            configOptions.leaflet.latLng([
              configOptions._here.place[i].circle[1],
              configOptions._here.place[i].circle[0]
            ]), {
              "fill": true,
              "fillColor": configOptions.placeColor,
              "fillOpacity": configOptions.placeOpacity,
              "radius": Math.ceil(Math.sqrt(configOptions._here.place[i].value * scale)),
              "stroke": false
            }
          ).bindTooltip(Math.round(configOptions._here.place[i].value).toString() + " " + name)
            // Place is a tooltip, not popup, to allow easier here clicks
          .addTo(configOptions._layer.place);
        }
      }
    }

    if ("link" in configOptions._here) {
      scale = Math.exp((configOptions.s - 5) / 2) * configOptions.linkScale * 4;
      name = getLocalised(configOptions, "link");
      for (i = 0; i < configOptions._here.link.length; i += 1) {
        if ("polyline" in configOptions._here.link[i] &&
          "value" in configOptions._here.link[i]
        ) {
          geometry = [];
          for (j = 0; j < configOptions._here.link[i].polyline.length; j += 1) {
            if (configOptions._here.link[i].polyline[j].length > 1) {
              geometry.push([
                configOptions._here.link[i].polyline[j][1],
                configOptions._here.link[i].polyline[j][0]
              ]);
            }
          }
          configOptions.leaflet.polyline(geometry, {
              "color": getLinkColor(configOptions, configOptions._here.link[i].link),
              "weight": Math.ceil(Math.log(1 + (configOptions._here.link[i].value * (1 / scale)))
                * scale + configOptions.minWidth)
            }
          ).on("click", function (evt) {
            var popup = evt.target.getPopup();
            var index = parseInt(popup.getContent(), 10);
            if (!Number.isNaN(index)) {
              // Else already processed
              popup.setContent(makePopup(name, configOptions._here.link[index].value, configOptions._here.link[index].link));
              popup.update();
            }
          })
          .bindPopup(i)
            // Popup stores only the index value until clicked
          .addTo(configOptions._layer.link);
        }
      }
    }

    if ("node" in configOptions._here) {
      scale = Math.exp((configOptions.s - 5) / 2) * configOptions.nodeScale * 2;
      name = getLocalised(configOptions, "link");
      for (i = 0; i < configOptions._here.node.length; i += 1) {
        if ("circle" in configOptions._here.node[i] &&
          "value" in configOptions._here.node[i] &&
          configOptions._here.node[i].circle.length > 1
        ) {
          configOptions.leaflet.circleMarker(
            configOptions.leaflet.latLng([
              configOptions._here.node[i].circle[1],
              configOptions._here.node[i].circle[0]
            ]), {
              "color": configOptions.nodeColor,
              "fill": false,
              "radius": Math.ceil(Math.log(1 + (configOptions._here.node[i].value * (1 / (scale * 2))))
                * scale + (configOptions.minWidth / 2)),
              "weight": 1
            }
          ).on("click", function (evt) {
            var popup = evt.target.getPopup();
            var index = parseInt(popup.getContent(), 10);
            if (!Number.isNaN(index)) {
              // Else already processed
              popup.setContent(makePopup(name, configOptions._here.node[index].value,
                configOptions._here.node[index].link, configOptions._here.node[index].node));
              popup.update();
            }
          })
          .bindPopup(i)
            // Popup stores only the index value until clicked
          .addTo(configOptions._layer.node);
        }
      }
    }

    if ("here" in configOptions._here &&
      configOptions._here.here.length > 0 &&
      "circle" in configOptions._here.here[0] &&
      "value" in configOptions._here.here[0] &&
      configOptions._here.here[0].circle.length > 1
    ) {
      configOptions.leaflet.circle(
        configOptions.leaflet.latLng([
          configOptions._here.here[0].circle[1],
          configOptions._here.here[0].circle[0]
        ]), {
          "color": configOptions.hereColor,
          "fill": false,
          "interactive": false,
          "radius": configOptions._here.here[0].value,
          "weight": 2
        }
      ).addTo(configOptions._layer.here);
    }

    return configOptions;
  }


  if (!document.getElementById(configId)) {
    return false;
      // Exit stage left. Nowhere to report failure gracefully
  }

  if (!Object.keys ||
    ![].indexOf ||
    typeof JSON !== "object"
  ) {
    // Arcane pre-IE9 browser
    document.getElementById(configId).appendChild(
      document.createTextNode("Browser not supported: Try a modern browser"));
      // There is no localisation of errors
    document.getElementById(configId).style.height = "auto";
      // Prevents unusable embed areas being filled with whitespace
    return false;
  }

  loadStatus(configId, configOptions);
    // Visual indicator to manage expectations

  if (typeof configOptions !== "object") {
    configOptions = {};
  }

  if ("dataObject" in configOptions === false ||
    typeof configOptions.dataObject !== "object"
  ) {
    configOptions.dataObject = emptyNetworkJSON();
  } else {
    if ("dataset" in configOptions) {
      delete configOptions.dataset;
    }
  }

  if ("leaflet" in configOptions &&
    typeof configOptions.leaflet === "object" &&
    "version" in configOptions.leaflet &&
    Number.isNaN(parseInt(configOptions.leaflet.version.split(".")[0], 10)) === false &&
    parseInt(configOptions.leaflet.version.split(".")[0], 10) >= 1
  ) {
    // Leaflet version 1+, so no new load
    scriptURLs = [];
      // ScriptURLs are not in configOptions - would allow random script insertion
  }

  if (typeof Promise !== "undefined") {
    loadWithPromise(configId, configOptions, scriptURLs);
  } else {
    loadWithClassic(configId, configOptions, scriptURLs);
  }
},


"here": function here(dataObject, x, y, range, options) {
  /**
   * Raw Here Query
   * @param {Object} dataObject - as init() option dataObject
   * @param {number} x - longitude
   * @param {number} y - latitude
   * @param {number} range - metres from lat,lng
   * @param {Object} options - filter:network index, geoJSON:array layernames, sanitize:boolean, service:service index
   * @return {Object} key:values - error:description on failure
   */
  "use strict";

  var raw;


  function parseDataObject(dataObject) {
    // Check and fix network data. Fix sufficiently not to break code, not fix to produce accurate results

    var keyName, i, j, k, l;
    var networkObjects = {
      // Minimum default structure of each "line" (array) for non-header data structures
      "0": {
        // By schema ID, extendable for future schema
        "link": [[0], [0], [0], {}],
        "network": [[0], {"en-US": "Unknown"}],
        "node": [0, 0, {}],
        "place": [0, 0, {}],
        "service": [[0], {"en-US": "Unknown"}]
      }
    };
      // In practice 0 equates to null, while avoiding dataset rejection or variable checking during draw

    if (typeof dataObject !== "object") {
      dataObject = {};
    }
    if ("meta" in dataObject === false) {
      dataObject.meta = {};
    }
    if ("schema" in dataObject.meta === false ||
      dataObject.meta.schema in networkObjects === false
    ) {
      dataObject.meta.schema = "0";
    }
      // Other translation, option, and meta keys not used here, so ignored

    keyName = Object.keys(networkObjects[dataObject.meta.schema]);
    for (i = 0; i < keyName.length; i += 1) {
      if (keyName[i] in dataObject &&
        typeof dataObject[keyName[i]] !== "object"
      ) {
        delete dataObject[keyName[i]];
      }
    }

    for (i = 0; i < keyName.length; i += 1) {

      if (keyName[i] in dataObject === false ||
        Array.isArray(dataObject[keyName[i]]) == false ||
        dataObject[keyName[i]].length === 0
      ) {
        // Set whole key to default, with one dummy entry
        dataObject[keyName[i]] =
          [networkObjects[dataObject.meta.schema][keyName[i]]];
      }

      for (j = 0; j < dataObject[keyName[i]].length; j += 1) {

        if (dataObject[keyName[i]][j].length <
          networkObjects[dataObject.meta.schema][keyName[i]].length
        ) {
          for (k = dataObject[keyName[i]][j].length - 1; k <
            networkObjects[dataObject.meta.schema][keyName[i]].length; k += 1) {
            // Append defaults to short lines
            dataObject[keyName[i]][j].push(
              networkObjects[dataObject.meta.schema][keyName[i]][k]);
          }
        }

        for (k = 0; k <
          networkObjects[dataObject.meta.schema][keyName[i]].length; k += 1) {

          if (typeof dataObject[keyName[i]][j][k] !==
            typeof networkObjects[dataObject.meta.schema][keyName[i]][k]
          ) {

            if ((keyName[i] === "node" ||
              keyName[i] === "place") &&
              k === 2 &&
              typeof dataObject[keyName[i]][j][k] === "number"
            ) {
              // Accomodate old non-property node/place data structure
              dataObject[keyName[i]][j][k] = {"p": dataObject[keyName[i]][j][k]};
            } else {
              if (keyName[i] === "link" &&
                typeof dataObject[keyName[i]][j][k] === "number" &&
                (k === 0 ||
                k === 1)
              ) {
                // Accomodate old non-array link product data structure
                dataObject[keyName[i]][j][k] = [dataObject[keyName[i]][j][k]];
              } else {
                // Replace specific data item with default
                dataObject[keyName[i]][j][k] =
                  networkObjects[dataObject.meta.schema][keyName[i]][k];
              }
            }
          }

          if (Array.isArray(dataObject[keyName[i]][j][k])) {
            for (l = 0; l < dataObject[keyName[i]][j][k].length; l += 1) {
              if (typeof dataObject[keyName[i]][j][k][l] !==
                typeof networkObjects[dataObject.meta.schema][keyName[i]][k][0]
              ) {
                // Replace specific data item within array with default
                dataObject[keyName[i]][j][k][l] =
                  networkObjects[dataObject.meta.schema][keyName[i]][k][0];
              }
            }
          }

        }

      }

    }

    return dataObject;
  }

  function findHereNodes(raw, dataObject, x, y, range) {
    // Adds all nodes within range of lng,lat to raw.hereNodes

    var i;

    function haversine(lat1, lng1, lat2, lng2) {
      // Earth distance, modified from Leaflet CRS.Earth.js

      var rad = Math.PI / 180;
      var sinDLat = Math.sin((lat2 - lat1) * rad / 2);
      var sinDLon = Math.sin((lng2 - lng1) * rad / 2);
      var a = sinDLat * sinDLat + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * sinDLon * sinDLon;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return 6371000 * c;
    }

    for (i = 0; i < dataObject.node.length; i += 1) {
      if (dataObject.node[i].length > 1 &&
        range >= haversine(y, x, dataObject.node[i][1], dataObject.node[i][0])
      ) {
        raw.hereNodes.push(i);
      }
    }

    return raw;
  }

  function walkRoutes(raw, dataObject, options) {
    // Adds serviceLink and serviceNode matrices to raw, filtered for here and product

    var destination, origin, pickup, pickupIndex, products, reference, route, serviceCircular,
      serviceDirection, serviceLevel, serviceLevelLink, serviceSplit, serviceSplitIndex, services, i, j, k;
    
    raw.serviceLink = [];
      // Service by link [from[to[service]]] - with voids undefined
    raw.serviceNode = [];
      // Service by node [node[service]] - with voids undefined

    if ("filter" in options &&
      typeof options.filter === "number" &&
      options.filter >= 0 &&
      options.filter < dataObject.network.length
    ) {
      products = dataObject.network[options.filter][0];
    } else {
      products = [];
        // Zero length means all products
    }

    if ("service" in options &&
      typeof options.service === "number" &&
      options.service >= 0 &&
      options.service < dataObject.service.length
    ) {
      services = dataObject.service[options.service][0];
    } else {
      services = [];
        // Zero length means all services
    }

    for (i = 0; i < dataObject.link.length; i += 1) {

      if ((products.length === 0 ||
        ((products.filter( function (value) {
          return dataObject.link[i][0].indexOf(value) !== -1;
        })).length > 0) ) &&
          // Product included

        (("shared" in dataObject.link[i][3] === false ||
          products.indexOf(dataObject.link[i][3].shared) === -1) ||
          ("h" in dataObject.link[i][3] === false &&
          products.indexOf(dataObject.link[i][3].h) === -1)) &&
          // Share not included as parent

        (dataObject.link[i][2].filter( function (value) {
          return raw.hereNodes.indexOf(value) !== -1;
        })).length > 0 &&
          // Node within here

        (("setdown" in dataObject.link[i][3] === false ||
          (raw.hereNodes.filter( function (value) {
            return (dataObject.link[i][2].filter( function (valued) {
              return dataObject.link[i][3].setdown.indexOf(valued) < 0;
            })).indexOf(value) !== -1;
          })).length > 0) &&
          ("s" in dataObject.link[i][3] === false ||
          (raw.hereNodes.filter( function (value) {
            return (dataObject.link[i][2].filter( function (valued) {
              return dataObject.link[i][3].s.indexOf(valued) < 0;
            })).indexOf(value) !== -1;
          })).length > 0))
          // At least one here node is not setdown only

      ) {
        // Process this link line, otherwise ignore

        serviceLevel = 0;
        for (j = 0; j < dataObject.link[i][1].length; j += 1) {
          if (services.indexOf(j) !== -1 ||
            services.length === 0
          ) {
            serviceLevel += dataObject.link[i][1][j];
          }
        }

        if (serviceLevel > 0) {

          reference = [];
          route = [];
          serviceCircular = null;
          serviceDirection = null;
          serviceSplit = null;
          serviceSplitIndex = [];

          if ("reference" in dataObject.link[i][3] &&
            Array.isArray(dataObject.link[i][3]["reference"])
          ) {
            reference = dataObject.link[i][3]["reference"];
          } else {
            if ("r" in dataObject.link[i][3] &&
              Array.isArray(dataObject.link[i][3]["r"])
            ) {
              reference = dataObject.link[i][3]["r"];
            }
          }

          if (("split" in dataObject.link[i][3] &&
            Array.isArray(dataObject.link[i][3]["split"])) ||
            ("t" in dataObject.link[i][3] &&
            Array.isArray(dataObject.link[i][3].t))
          ) {
            /**
             * splits (split === 1) only contributes to service count at nodes within unique sections,
             * unless (split === 2) fromNodes contains no common sections.
             * splits (split === 1) only plotted in unique sections,
             * unless (split === 2) fromNodes contains no common sections
             */
            if ("split" in dataObject.link[i][3]) {
              serviceSplitIndex = dataObject.link[i][3]["split"];
            } else {
              serviceSplitIndex = dataObject.link[i][3].t;
            }
            if (
              (dataObject.link[i][2].filter( function (value) {
              return serviceSplitIndex.indexOf(value) === -1;
              }))
              .filter( function (value) {
                return raw.hereNodes.indexOf(value) !== -1;
              }).length > 0
            ) {
              // Splits, including within common sections
              serviceSplit = 1;
            } else {
              // Splits, containing no common sections
              serviceSplit = 2;
              raw.summary.link += serviceLevel;
            }
          } else {
            raw.summary.link += serviceLevel;
          }

          if (("circular" in dataObject.link[i][3] &&
            (dataObject.link[i][3].circular === true ||
            dataObject.link[i][3].circular === 1)) ||
            ("c" in dataObject.link[i][3] &&
            (dataObject.link[i][3].c === true ||
            dataObject.link[i][3].c === 1))
          ) {
            serviceCircular = dataObject.link[i][2].length - 1;
              // Exclude the final node on a circular
          }

          if (("direction" in dataObject.link[i][3] &&
            (dataObject.link[i][3].direction === true ||
            dataObject.link[i][3].direction === 1)) ||
            ("d" in dataObject.link[i][3] &&
            (dataObject.link[i][3].d === true ||
            dataObject.link[i][3].d === 1))
          ) {
            serviceDirection = 1;

            for (j = 0; j < dataObject.link[i][2].length; j += 1) {
              if (raw.hereNodes.indexOf(dataObject.link[i][2][j]) !== -1 ) {
                if (serviceCircular !== null) {
                  route = dataObject.link[i][2].slice(0, -1);
                    // Come friendly bombs and fall on Parla
                  route = route.slice(j).concat(route.slice(0, j));
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
                  route = dataObject.link[i][2].slice(j);
                    // Route ignores nodes before the 1st found in hereNodes
                }
                break;
              }
            }

          } else {
            route = dataObject.link[i][2];
          }

          if ("pickup" in dataObject.link[i][3] ||
            "u" in dataObject.link[i][3]
          ) {
            if ("pickup" in dataObject.link[i][3]) {
              pickup = dataObject.link[i][3].pickup;
            } else {
              pickup = dataObject.link[i][3].u;
            }
            for (j = 0; j < pickup.length; j += 1) {
              if (raw.hereNodes.indexOf(pickup[j]) === -1) {
                pickupIndex = route.indexOf(pickup[j]);
                if (pickupIndex !== -1) {
                  // Pickup-only nodes are removed from route unless within here
                  route.splice(pickupIndex, 1);
                }
              }
            }
          }

          for (j = 0; j < route.length; j += 1) {

            if ((serviceSplit !== 1 ||
              serviceSplitIndex.indexOf(route[j]) !== -1) &&
              (serviceCircular !== j)
            ) {

              if (serviceDirection === 1 ||
                raw.hereNodes.indexOf(route[j]) !== -1
              ) {
                serviceLevelLink = serviceLevel;
              } else {
                serviceLevelLink = serviceLevel / 2;
              }
              if (typeof raw.serviceNode[route[j]] === "undefined") {
                raw.serviceNode[route[j]] = {
                  "reference": [],
                  "service": serviceLevelLink
                };
              } else {
                raw.serviceNode[route[j]].service += serviceLevelLink;
              }
              if (reference.length > 0) {
                for (k = 0; k < reference.length; k += 1) {
                  raw.serviceNode[route[j]].reference.push(reference[k]);
                    // May contains duplicates
                }
              }

            }

            if (route.length - 1 > j &&
              (serviceSplit !== 1 ||
              serviceSplitIndex.indexOf(route[j]) !== -1 ||
              serviceSplitIndex.indexOf(route[j + 1]) !== -1)
            ) {

              if (serviceDirection === 1 ||
                (raw.hereNodes.indexOf(route[j]) !== -1 && raw.hereNodes.indexOf(route[j + 1]) !== -1)
              ) {
                serviceLevelLink = serviceLevel;
              } else {
                serviceLevelLink = serviceLevel / 2;
              }

              if (route[j] < route[j + 1]) {
                // Origin is largest node first. Skips reverse. Subsequent pop rather than shift
                origin = route[j + 1];
                destination = route[j];
              } else {
                origin = route[j];
                destination = route[j + 1];
              }

              if (typeof raw.serviceLink[origin] === "undefined") {
                raw.serviceLink[origin] = [];
              }
              if (typeof raw.serviceLink[origin][destination] ===
                "undefined"
              ) {
                raw.serviceLink[origin][destination] = {
                  "reference": [],
                  "service": serviceLevelLink
                };
              } else {
                raw.serviceLink[origin][destination].service += serviceLevelLink;
              }
              if (reference.length > 0) {
                for (k = 0; k < reference.length; k += 1) {
                  raw.serviceLink[origin][destination].reference.push(reference[k]);
                    // May contains duplicates
                }
              }

            }

          }
        }

      }

    }

    return raw;
  }

  function pathRoutes(raw) {
    // Converts OD matrix into raw.path's routes of the same service level

    var destination, destinationNum, link, originNum, service, serviceKey, stack, i, j, k;
    var serviceOD = {};
      // service: [ [from, to] ]
    var serviceData = {};
      // equivalently keyed service: {service, reference}
    var origin = Object.keys(raw.serviceLink);

    for (i = 0; i < origin.length; i += 1) {

      originNum = origin[i] - 0;
        // Numeric of origin
      destination = Object.keys(raw.serviceLink[originNum]);

      for (j = 0; j < destination.length; j += 1) {

        destinationNum = destination[j] - 0;
          // Numeric of destination
        serviceKey = [raw.serviceLink[originNum][destinationNum].service.toString()];
        if ("reference" in raw.serviceLink[originNum][destinationNum]) {
          for (k = 0; k < raw.serviceLink[originNum][destinationNum].reference.length; k += 1) {
            if ("n" in raw.serviceLink[originNum][destinationNum].reference[k]) {
              // Name
              serviceKey.push(raw.serviceLink[originNum][destinationNum].reference[k].n.toString());
            } else {
              if ("c" in raw.serviceLink[originNum][destinationNum].reference[k]) {
                // Else route color
                serviceKey.push(raw.serviceLink[originNum][destinationNum].reference[k].c.toString());
              }
            }
          }
        }
        serviceKey = serviceKey.join(":");

        if (serviceKey in serviceOD === false) {
          serviceOD[serviceKey] = [];
          serviceData[serviceKey] = raw.serviceLink[originNum][destinationNum];
        }
        serviceOD[serviceKey].push([originNum, destinationNum]);

      }

    }

    raw.path = [];
      // Path elements [serviceData, [node, node, etc]]

    service = Object.keys(serviceOD);
    for (i = 0; i < service.length; i += 1) {
      stack = [serviceOD[service[i]].pop()];
      while (serviceOD[service[i]].length > 0) {

        link = serviceOD[service[i]].pop();

        for (j = 0; j < stack.length; j += 1) {

          if (link[0] === stack[j][0]) {
            stack[j].unshift(link[1]);
            break;
          }
          if (link[1] === stack[j][0]) {
            stack[j].unshift(link[0]);
            break;
          }
          if (link[0] === stack[j][stack.length - 1]) {
            stack[j].push(link[1]);
            break;
          }
          if (link[1] === stack[j][stack.length - 1]) {
            stack[j].push(link[0]);
            break;
          }

          if (j === stack.length - 1) {
            stack.push(link);
            break;
          }

        }

      }
      // Further stack aggregation possible, but time-consuming vs resulting reduction in objects

      for (j = 0; j < stack.length; j += 1) {
        raw.path.push([serviceData[service[i]], stack[j]]);
      }

    }

    return raw;
  }

  function conjureGeometry(raw, dataObject, options) {
    // Convert matrices into geospatial structures

    var geojson, geometry, maxIndex, placeList, properties, value, i, j, k;
    var result = {};

    function makePolyline(polyPoints, node) {
      // Return polyline of polyPoints

      var i;
      var maxIndex = node.length - 1;
      var polyline = [];

      for (i = 0; i < polyPoints.length; i += 1) {
        if (polyPoints[i] <= maxIndex &&
          polyPoints[i] >= 0
        ) {
          polyline.push([node[polyPoints[i]][0], node[polyPoints[i]][1]]);
        }
      }

      return polyline;
    }

    function extractReferences(referenceObject) {

      var keys, i;
      var stack = {};
      var reference = [];

      for (i = 0; i < referenceObject.length; i += 1) {

        if ("n" in referenceObject[i]) {
          stack[referenceObject[i].n.toString()] = referenceObject[i];
            // Duplicate n on the same link are merged
        } else {
          if ("c" in referenceObject[i]) {
            stack[referenceObject[i].c.toString()] = referenceObject[i];
          }
        }

      }

      keys = Object.keys(stack).sort();
      for (i = 0; i < keys.length; i += 1) {
        reference.push(stack[keys[i]]);
      }

      return reference;
    }

    result.summary = raw.summary;
    result.here = raw.here;
    result.link = [];

    for (i = 0; i < raw.path.length; i += 1) {
      geometry = {
        "polyline": makePolyline(raw.path[i][1], dataObject.node),
        "value": raw.path[i][0].service
      };

      if ("reference" in raw.path[i][0] &&
        raw.path[i][0].reference.length > 0
      ) {
        geometry.link = extractReferences(raw.path[i][0].reference);
      }

      result.link.push(geometry);
    }

    result.node = [];
    maxIndex = dataObject.node.length - 1;
    placeList = [];

    for (i = 0; i < raw.serviceNode.length; i += 1) {
      if (typeof raw.serviceNode[i] !== "undefined" &&
        i <= maxIndex
      ) {
        result.summary.node += 1;

        geometry = {
          "circle": [
            dataObject.node[i][0],
            dataObject.node[i][1]
          ],
          "value": raw.serviceNode[i].service
        };

        if ("reference" in raw.serviceNode[i] &&
          raw.serviceNode[i].reference.length > 0
        ) {
          geometry.link = extractReferences(raw.serviceNode[i].reference);
        }

        if ("reference" in dataObject.node[i][2] &&
          dataObject.node[i][2].reference.length > 0
        ) {
          geometry.node = extractReferences(dataObject.node[i][2].reference);
        } else {
          if ("r" in dataObject.node[i][2] &&
            dataObject.node[i][2].r.length > 0
          ) {
            geometry.node = extractReferences(dataObject.node[i][2].r);
          }
        }

        result.node.push(geometry);

        if ("place" in dataObject.node[i][2] &&
          placeList.indexOf(dataObject.node[i][2].place) === -1
        )  {
          placeList.push(dataObject.node[i][2].place);
        } else {
          if ("p" in dataObject.node[i][2] &&
            placeList.indexOf(dataObject.node[i][2].p) === -1
          ) {
            placeList.push(dataObject.node[i][2].p);
          }
        }
      }
    }

    result.place = [];
    maxIndex = dataObject.place.length - 1;

    for (i = 0; i < placeList.length; i += 1) {
      if (placeList[i] <= maxIndex &&
        placeList[i] >= 0
      ) {
        value = 0;

        if ("population" in dataObject.place[placeList[i]][2]) {
          value = dataObject.place[placeList[i]][2].population;
        } else {
          if ("p" in dataObject.place[placeList[i]][2]) {
            value = dataObject.place[placeList[i]][2].p;
          }
        }

        if (value > 0) {
          result.summary.place += value;
          result.place.push({
            "circle": [
              dataObject.place[placeList[i]][0],
              dataObject.place[placeList[i]][1]
            ],
            "value": value
          });
        }

      }
    }

    if ("geoJSON" in options === false ||
      !Array.isArray(options.geoJSON)
    ) {

      return result;

    } else {

      geojson = {
        "type": "FeatureCollection",
        "features": []
      };

      for (i = 0; i < options.geoJSON.length; i += 1) {
        if (options.geoJSON[i] in result) {
          for (j = 0; j < result[options.geoJSON[i]].length; j += 1) {
            if ("value" in result[options.geoJSON[i]][j] &&
            ("circle" in result[options.geoJSON[i]][j] ||
            "polyline" in result[options.geoJSON[i]][j])
            ) {
              if ("circle" in result[options.geoJSON[i]][j]) {
                geometry = {
                  "type": "Point",
                  "coordinates": result[options.geoJSON[i]][j].circle
                };
              } else {
                geometry = {
                  "type": "LineString",
                  "coordinates": []
                };
                //
                for (k = 0; k <  result[options.geoJSON[i]][j].polyline.length; k += 1) {
                  geometry.coordinates.push(result[options.geoJSON[i]][j].polyline[k]);
                }
              }
              properties = {
                "type": options.geoJSON[i],
                "value": result[options.geoJSON[i]][j].value
              };
              if ("link" in result[options.geoJSON[i]][j]) {
                properties.link = result[options.geoJSON[i]][j].link;
              }
              if ("node" in result[options.geoJSON[i]][j]) {
                properties.node = result[options.geoJSON[i]][j].node;
              }
              geojson.features.push({
                "type": "Feature",
                "geometry": geometry,
                "properties": properties
              });
            }
          }
        }
      }

      return geojson;

    }
  }


  if (!Object.keys ||
    ![].indexOf ||
    typeof JSON !== "object"
  ) {
    return {"error": "Unsupported browser"};
  }
  if (typeof x !== "number" ||
    typeof y !== "number" ||
    typeof range !== "number"
  ) {
    return {"error": "Here parameters not numeric"};
  }
  if (typeof options !== "object") {
    options = {};
  }

  raw = {
    // Working data depository
    "hereNodes": [],
      // Nodes in range of lng,lat
    "here": [{
      "circle": [x, y],
      "value": range
    }],
    "summary": {
      "link": 0,
        // Count of services (eg daily trains)
      "node": 0,
        // Count of nodes (eg stations)
      "place": 0
        // Count of demography (eg people)
    }
  };

  if ("sanitize" in options === false ||
    options.sanitize !== false
  ) {
    dataObject = parseDataObject(dataObject);
    raw.dataObject = dataObject;
  }

  try {

    raw = findHereNodes(raw, dataObject, x, y, range);
    raw = walkRoutes(raw, dataObject, options);
    raw = pathRoutes(raw);
    return conjureGeometry(raw, dataObject, options);

  } catch (e) {

    return {"error": e};

  }
},

};
// EoF

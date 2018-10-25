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
   * Initialisation of Aquius with a user interface
   * @param {string} configId - Id of DOM element within which to build
   * @param {Object} configOptions - Optional, object with key:value configurations
   * @return {boolean} platform supported
   */
  "use strict";

  var HERE;
    // Cache of last here() result, to be referenced as configOptions._here
  var targetDOM = document.getElementById(configId);

  function getDefaultTranslation() {
    /**
     * Reference: Default locale translations
     * @return {object} BCP 47 locale key:{slug:translation}
     */

    return {

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
        // Each custom BCP 47-style locale matches en-US keys

    };
  }

  function getDefaultOptions() {
    /**
     * Reference: Default configOptions
     * @return {object} option:value
     */

    return {
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
      "locale": "en-US",
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
    };
  }
  
  function getLayerNames(configOptions, panel) {
    /**
     * Reference: Layer names
     * @param {object} configOptions
     * @param {boolean} panel - optional, layername slugs for the panel. Else for map
     * @return {object} array of layername slugs
     */

    function filterLayerNames(configOptions, layerNames) {

      var i;
      var filtered = [];

      for (i = 0; i < layerNames.length; i += 1) {
        if (layerNames[i] === "here" ||
          (layerNames[i] in configOptions.dataObject &&
          configOptions.dataObject[layerNames[i]].length > 0)
        ) {
          filtered.push(layerNames[i]);
        }
      }

      return filtered;
    }

    if (typeof panel === "boolean" &&
      panel === true
    ) {
      return filterLayerNames(configOptions, ["link", "place", "node"]);
        // Order left to right in panel
    } else {
      return filterLayerNames(configOptions, ["place", "link", "node", "here"]);
        // Order bottom-to-top of map layers. First character of each unique. Has translation
    }
  }

  function createElement(elementType, valueObject, styleObject) {
    /**
     * Helper: Creates DOM element
     * @param {string} elementType
     * @param {object} valueObject - optional DOM value:content pairs
     * @param {object} styleObject - optional DOM style value:content pairs
     * @return {object} DOM element
     */

    var values, styles, i;
    var element = document.createElement(elementType);

    if (typeof valueObject !== "undefined") {
      values = Object.keys(valueObject);
      for (i = 0; i < values.length; i += 1) {
        element[values[i]] = valueObject[values[i]];
      }
    }

    if (typeof styleObject !== "undefined") {
      styles = Object.keys(styleObject);
      for (i = 0; i < styles.length; i += 1) {
        element.style[styles[i]] = styleObject[styles[i]];
      }
    }

    return element;
  }

  function createRadioElement(optionObject, baseName, selectedValue) {
    /**
     * Helper: Creates DOM radio element
     * @param {object} optionObject - array of radio options, each array an object with keys:
     *   value (returned on selection), label (not localised), id (localisation referenced)
     * @param {string} baseName - for containing DOM div id and input name
     * @param {string} selectedValue - optional, currently selected value, type matching
     * @return {object} DOM div containing radio
     */

    var input, label, span, i;
    var div = createElement("div", {
      "id": baseName
    });

    for (i = 0; i < optionObject.length; i += 1) {
      label = createElement("label");

      input = createElement("input", {
        "type": "radio",
        "name": baseName
      });
      if ("value" in optionObject[i]) {
        input.value = optionObject[i].value;
        if (typeof selectedValue !== "undefined" &&
          optionObject[i].value === selectedValue
        ) {
          input.checked = "checked";
        }
      }
      label.appendChild(input);

      span = createElement("span");
      if ("id" in optionObject[i]) {
        span.id = optionObject[i].id;
      }
      if ("label" in optionObject[i]) {
        span.textContent = optionObject[i].label;
      }
      label.appendChild(span);

      div.appendChild(label);
    }

    return div;
  }

  function createSelectElement(optionObject, selectedValue) {
    /**
     * Helper: Creates DOM select element
     * @param {object} optionObject - array of select options, each array an object with keys:
     *   value (returned on selection), label (not localised), id (localisation referenced)
     * @param {string} selectedValue - optional, currently selected value, type matching
     * @return {object} DOM select
     */

    var option, i;
    var select = createElement("select");

    for (i = 0; i < optionObject.length; i += 1) {
      option = createElement("option");
      if ("value" in optionObject[i]) {
        option.value = optionObject[i].value;
        if (optionObject[i].value === selectedValue) {
          option.selected = "selected";
        }
      }
      if ("label" in optionObject[i]) {
        option.textContent = optionObject[i].label;
      }
      if ("id" in optionObject[i]) {
        option.id = optionObject[i].id;
      }
      select.appendChild(option);
    }

    return select;
  }

  function outputStatusNoMap(configOptions, error) {
    /**
     * Non-map screen output, used pre-map or on fatal error
     * @param {object} configOptions
     * @param {object} error - optional Javascript error
     * @return {boolean} false on error, else true
     */

    var symbol;
    var targetDOM = document.getElementById(configOptions._id);
    var wrapper = createElement("div", {}, {
      "margin": "0 auto",
      "max-width": "800px",
      "text-align": "center"
    });

    while (targetDOM.firstChild) {
      targetDOM.removeChild(targetDOM.firstChild);
    }

    if ("map" in configOptions &&
      typeof configOptions.map.remove === "function"
    ) {
      configOptions.map.remove();
      targetDOM.className = "";
    }

    if (typeof error !== "undefined") {
      symbol = "\uD83D\uDEAB";
        // No entry
    } else {
      symbol = "\uD83C\uDF0D";
        // Globe in progress
    }
    wrapper.appendChild(createElement("div", {
      "textContent": symbol
    }, {
      "font-size": "1000%"
    }));

    if (typeof error !== "undefined") {
      wrapper.appendChild(createElement("p", {
        "textContent": error.toString()
      }));
    }

    targetDOM.appendChild(wrapper);

    if (typeof error !== "undefined") {
      return false;
    }
    return true;
  }

  function createEmbedBlob(configOptions) {
    /**
     * Contents of a file containing embed code
     * @param {object} configOptions
     * @return {object} file Blob
     */

    var lines = [];

    function getThisScriptURL() {

      var i;
      var scripts = document.getElementsByTagName("script");
      
      for (i = 0; i < scripts.length; i += 1) {
        if (scripts[i].src.indexOf("aquius") !== -1) {
          // Script name must includes aquius. Crude
          return scripts[i].src;
        }
      }
      return  "<!--Script URL-->";
        // Ugly fallback
    }

    function getOwnOptions(configOptions) {

      var i;
      var defaultOptions = getDefaultOptions();
      var ownOptions = {};
      var optionsNames = Object.keys(configOptions);

      for (i = 0; i < optionsNames.length; i += 1) {
        if (optionsNames[i].charAt(0) !== "_" &&
          // Exclude options beginning _
          ["base", "dataObject", "leaflet", "map", "network", "translation", "uiHash"]
          .indexOf(optionsNames[i]) === -1 &&
          // Exclude options that may confuse an embed, currently also ANY Object
          configOptions[optionsNames[i]] !== defaultOptions[optionsNames[i]]
        ) {
           ownOptions[optionsNames[i]] = configOptions[optionsNames[i]];
        }
      }
        // Future: Contents of values which are Objects always considered non-default

      return ownOptions;
    }

    lines.push(createElement("div", {
      "id": configOptions._id
    }, {
      "height": "100%"
    }).outerHTML);
    lines.push(createElement("script", {
      "src": getThisScriptURL()
    }).outerHTML);
    lines.push(createElement("script", {
      "textContent": "window.addEventListener(\"load\",function(){aquius.init(\"" +
        configOptions._id + "\"," + JSON.stringify(getOwnOptions(configOptions)) + ")});"
    }).outerHTML);

    return new Blob([lines.join("\n")], {type: "text/plain;charset=utf-8"});
  }

  function loadWithPromise(configOptions, scriptURLs) {
    /**
     * Modern loader of supporting data files - truly asynchronous, hence faster
     * @param {object} configOptions
     * @param {object} scriptURLs - array of CSS or JS to load
     */

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

      postLoadInitScripts(configOptions);
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
        postLoadInitScripts(configOptions);
      })
      .catch(function (error) {
        // Script failure creates error event, while Fetch creates an error message
          return outputStatusNoMap(configOptions, error);
      });
    }
  }

  function loadWithClassic(configOptions, scriptURLs) {
    /**
     * Fallback loader of supporting data files - not so asynchronous
     * @param {object} configOptions
     * @param {object} scriptURLs - array of CSS or JS to load
     */

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
        return outputStatusNoMap(configOptions, {"message": "Could not load " + url});
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
            return outputStatusNoMap(configOptions, {"message": http.status + ": Could not load "+ url});
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
          return postLoadInitScripts(configOptions);
        });
      } else {
        postLoadInitScripts(configOptions);
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

  function getLocalised(configOptions, localiseKey) {
    /**
     * Helper: Get localised text by translation key
     * @param {object} configOptions
     * @param {string} localiseKey - translation key
     * @return {string} translated text or empty on failure
     */

    if (configOptions.t in configOptions.translation &&
      localiseKey in configOptions.translation[configOptions.t]
    ) {
      // Available in user locale
      return configOptions.translation[configOptions.t][localiseKey];
    } else {
      if (configOptions.locale in configOptions.translation &&
        localiseKey in configOptions.translation[configOptions.locale]
      ) {
        // Available in default locale
        return configOptions.translation[configOptions.locale][localiseKey];
      }
    }
    return "";
  }

  function applyLocalisation(configOptions, rerender) {
    /**
     * Apply translation to localised DOM items
     * @param {object} configOptions - including _toLocale (dom:translation key)
     * @param {boolean} rerender - also update localisations in map layers
     * @return {object} configOptions
     */

    var targetDOM, localiseText, i;
    var localiseNames = Object.keys(configOptions._toLocale);

    for (i = 0; i < localiseNames.length; i += 1) {
      targetDOM = document.getElementById(localiseNames[i]);
      if (targetDOM) {
        localiseText = getLocalised(configOptions, configOptions._toLocale[localiseNames[i]]);
        if (localiseText !== "") {
          targetDOM.textContent = localiseText;
        }
      }
    }

    if (typeof rerender !== "undefined" &&
      rerender === true
    ) {
      queryHere(configOptions, true);
    }
    return configOptions;
  }

  function userStore(configOptions, setObject) {
    /**
     * Helper: Retrieve and set URL hash (takes precedence) and Session storage
     *   Caution: Hashable keys must be single alpha characters
     * @param {object} configOptions
     * @param {object} setObject - optional key:value pairs to set
     * @return {object} store contents
     */

    var storeObject = {};

    function getUserHash() {

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

    function setUserHash(configOptions, setObject) {

      var hashNames, urlHash, i;
      var content = getUserHash();
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

    function getUserStore(configOptions) {

      try {
        // Support of sessionStorage does not automatically make it useable
        if (sessionStorage.getItem(configOptions._id) !== null) {
          return JSON.parse(sessionStorage.getItem(configOptions._id));
        } else {
          return {};
        }
          // Keyed by Id to allow multiple instances on the same HTML page
      } catch(e) {
        return {};
      }
    }

    function setUserStore(configOptions, setObject) {

      var i;
      var theStore = getUserStore(configOptions);
      var setNames = Object.keys(setObject);

      for (i = 0; i < setNames.length; i += 1) {
        theStore[setNames[i]] = setObject[setNames[i]];
      }

      try {
        sessionStorage.setItem(configOptions._id, JSON.stringify(theStore));
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
        storeObject = setUserStore(configOptions, setObject);
      } else {
        storeObject = getUserStore(configOptions);
      }
    }

    if ("uiHash" in configOptions === true &&
      configOptions.uiHash === true
    ) {
      // Hash is opted in. Hash takes precedence over store for return object
      if (typeof setObject === "object") {
        storeObject = setUserHash(configOptions, setObject);
      } else {
        storeObject = getUserHash();
      }
    }

    return storeObject;
  }


  function parseConfigOptions(configOptions) {
    /**
     * Reconcile configOptions with storage and defaults
     *   Option precedence = store, configuration, dataset, default
     * @param {object} configOptions
     * @return {object} configOptions
     */

    var storeObject, storeNames, translationObjects, translationLocales, translationNames, i, j, k;
    var defaultOptions = getDefaultOptions();
    var defaultLocale = "en-US";
    var defaultNames = Object.keys(defaultOptions);
    var localeNames = [];

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

    if (typeof configOptions.dataObject !== "object") {
      configOptions.dataObject = {};
    }

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

    storeObject = userStore(configOptions);
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
    translationObjects.push(getDefaultTranslation());

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

    return configOptions;
  }


  function buildMapBase(configOptions) {
    /**
     * Builds map and related events, all non-localised, with no bespoke layers or controls
     * @param {object} configOptions
     * @return {object} configOptions
     */

    var i;

    if ("setView" in configOptions.map === false ||
      "on" in configOptions.map === false ||
      "getCenter" in configOptions.map === false ||
      "getZoom" in configOptions.map === false ||
      "attributionControl" in configOptions.map === false
    ) {
        // Create map
        while (document.getElementById(configOptions._id).firstChild) {
          document.getElementById(configOptions._id).removeChild(document.getElementById(configOptions._id).firstChild);
        }
        configOptions.map = configOptions.leaflet.map(configOptions._id, {
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

      userStore(configOptions, {
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

      userStore(configOptions, {
        "c": configOptions.c,
        "k": configOptions.k,
        "m": configOptions.m
      });

      queryHere(configOptions);
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

  function buildMapUI(configOptions) {
    /**
     * Builds map layers and controls. All localisable
     * @param {object} configOptions
     * @return {object} configOptions
     */ 

    var controlForm;

    function layerEvents(configOptions, layerName) {
      // Adds events to _layer layers

      configOptions._layer[layerName].on("add", function () {
        if (configOptions.v.indexOf(layerName.charAt(0)) === -1) {
          configOptions.v += layerName.charAt(0);
          userStore(configOptions, {
            "v": configOptions.v
          });
        }
      });

      configOptions._layer[layerName].on("remove", function () {
        configOptions.v = configOptions.v.replace(layerName.charAt(0), "");
        userStore(configOptions, {
          "v": configOptions.v
        });
      });

      return configOptions;
    }

    function getControlForm(configOptions) {
      // Returns DOM of form in control, to allow other elements to be hacked in

      var nodes, i;
      
      if ("_control" in configOptions) {
        nodes = configOptions._control.getContainer().childNodes;

        for (i = 0; i < nodes.length; i += 1) {
          if (nodes[i].tagName === "FORM") {
            return nodes[i];
          }
        }
      }

      return false;
    }

    function buildRadioOnControl(configOptions, controlForm, dataObjectKey, option, uiOption) {

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
            "id": configOptions._id + dataObjectKey + i
            });
          configOptions._toLocale[configOptions._id + dataObjectKey + i] = "_" + dataObjectKey + i;
        }

        element = createRadioElement(selection, configOptions._id + dataObjectKey, configOptions[option]);
        element.addEventListener("change", function () {
          configOptions[option] = parseInt(document.querySelector("input[name='" +
            configOptions._id + dataObjectKey + "']:checked").value, 10);
          var opt = {};
          opt[option] = configOptions[option];
          userStore(configOptions, opt);
          queryHere(configOptions);
        }, false);
        controlForm.appendChild(element);

      }
      return configOptions;
    }

    function buildAttributions(configOptions) {

      var span, i;
      var keyName = ["_datasetName", "_datasetAttribution"];

      for (i = 0; i < keyName.length; i += 1) {
        configOptions._toLocale[configOptions._id + keyName[i]] = keyName[i];
        keyName[i] = configOptions._id + keyName[i];
      }

      span = createElement("span");

      if ("meta" in configOptions.dataObject &&
        "url" in configOptions.dataObject.meta &&
        typeof configOptions.dataObject.meta.url === "string"
      ) {
        span.appendChild(createElement("a", {
          "href": configOptions.dataObject.meta.url,
          "id": keyName[0]
        }));
      } else {
        span.appendChild(createElement("span", {
          "id": keyName[0]
        }));
      }

      span.appendChild(document.createTextNode(" "));
      span.appendChild(createElement("span", {
        "id": keyName[1]
      }));

      configOptions.map.attributionControl.addAttribution(span.outerHTML);

      return configOptions;
    }

    function buildUILocale(configOptions) {

      var control, div, id, label, select, selectOptions, i;
      var keyName = Object.keys(configOptions.translation);
      
      if (configOptions.uiLocale === true &&
        keyName.length > 1
      ) {

        control = configOptions.leaflet.control({position: "topright"});
        control.onAdd = function () {

          div = createElement("div", {
            "className": "aquius-locale",
            "id": configOptions._id + "locale"
          }, {
            "background-color": "#fff",
            "border-bottom": "2px solid rgba(0,0,0,0.3)",
            "border-left": "2px solid rgba(0,0,0,0.3)",
            "border-radius": "0 0 0 5px",
            "margin": 0,
            "padding": "0 0 1px 1px"
          });
          configOptions.leaflet.DomEvent.disableClickPropagation(div);

          id = configOptions._id + "langname";
          div.appendChild(createElement("label", {
            "id": id,
            "for": configOptions._id + "lang"
          } , {
            "display": "none"
          }));
            // Label improves web accessibility, but is self-evident to most users
          configOptions._toLocale[id] = "language";

          selectOptions = [];
          for (i = 0; i < keyName.length; i += 1) {
            if ("lang" in configOptions.translation[keyName[i]]) {
              label = configOptions.translation[keyName[i]].lang;
            } else {
              label = keyName[i];
            }
            selectOptions.push({
              "value": keyName[i],
              "label": label
            });
          }
          select = createSelectElement(selectOptions, configOptions.t);

          select.id = configOptions._id + "lang";
          select.style["background-color"] = "#fff";
          select.style.border = "none";
          select.style.color = "#000";
          select.style.font = "12px/1.5 \"Helvetica Neue\", Arial, Helvetica, sans-serif";
            // Leaflet styles not inherited by Select
          select.addEventListener("change", function () {
            configOptions.t = document.getElementById(configOptions._id + "lang").value;
            userStore(configOptions, {
              "t": configOptions.t
            });
            applyLocalisation(configOptions, true);
          }, false);

          div.appendChild(select);

          return div;
        };
        control.addTo(configOptions.map);

      }

      return configOptions;
    }

    function buildUIPanel(configOptions) {
    
      var control, div, frame, id, layerSummaryNames, i;
      
      if (configOptions.uiPanel === true) {
        control = configOptions.leaflet.control({position: "bottomleft"});
        control.onAdd = function () {

          div = createElement("div", {
            "className": "aquius-panel",
            "id": configOptions._id + "panel"
          }, {
            "background-color": "rgba(255,255,255," + configOptions.panelOpacity + ")",
            "font-weight": "bold",
            "padding": "0 3px",
            "border-radius": "5px"
          });
          configOptions.leaflet.DomEvent.disableClickPropagation(div);

          layerSummaryNames = getLayerNames(configOptions, true);
          for (i = 0; i < layerSummaryNames.length; i += 1) {

            frame = createElement("span", {}, {
              "color": configOptions[layerSummaryNames[i] + "Color"],
              "margin": "0 0.1em"
            });
            frame.appendChild(createElement("span", {
              "id": configOptions._id + layerSummaryNames[i] + "value",
              "textContent": "0"
            }, {
              "font-size": Math.round(200 * configOptions.panelScale).toString() + "%",
              "margin": "0 0.1em"
            }));

            id = configOptions._id + layerSummaryNames[i] + "label";
            frame.appendChild(createElement("span", {
              "id": id,
            }, {
              "font-size": Math.round(100 * configOptions.panelScale).toString() + "%",
              "margin": "0 0.1em",
              "vertical-align": "20%"
            }));
            configOptions._toLocale[id] = layerSummaryNames[i];

            div.appendChild(frame);
            div.appendChild(document.createTextNode(" "));

          }

          return div;
        };
        control.addTo(configOptions.map);
      }

      return configOptions;
    }

    function buildUILayerControl(configOptions) {

      var id, i;
      var layerNames = getLayerNames(configOptions).reverse();

      configOptions._control = configOptions.leaflet.control.layers();
      for (i = 0; i < layerNames.length; i += 1) {

        configOptions._layer[layerNames[i]] = configOptions.leaflet.layerGroup();
        configOptions = layerEvents(configOptions, layerNames[i]);

        if (configOptions.v.indexOf(layerNames[i].charAt(0)) !== -1) {
          configOptions._layer[layerNames[i]].addTo(configOptions.map);
        }

        id = configOptions._id + layerNames[i] + "name";
        configOptions._toLocale[id] = layerNames[i];
        configOptions._control.addOverlay(configOptions._layer[layerNames[i]], createElement("span", {
          "id": id
        }, {
          "color": configOptions[layerNames[i] + "Color"]
        }).outerHTML);

      }
      configOptions._control.addTo(configOptions.map);
      
      return configOptions;
    }

    function buildUIScale(configOptions, controlForm) {

      var frame, id, input, label;

      if (configOptions.uiScale === true) {
        label = createElement("label");

        id = configOptions._id + "scalename";
        label.appendChild(createElement("div", {
          "id": id
        }, {
          "text-align": "center"
        }));
        configOptions._toLocale[id] = "scale";

        frame = createElement("div", {}, {
          "text-align": "center"
        });
        input = createElement("input", {
          "id": configOptions._id + "scale",
          "type": "range",
            // Range not supported by IE9, but should default to text
          "min": 0,
          "max": 10,
          "value": configOptions.s
        });
        input.addEventListener("change", function () {
          configOptions.s = parseInt(document.getElementById(configOptions._id + "scale").value, 10);
          userStore(configOptions, {
            "s": configOptions.s
          });
          queryHere(configOptions, true);
        }, false);
        frame.appendChild(input);

        label.appendChild(frame);

        controlForm.appendChild(label);
      }
    
      return configOptions;
    }

    function buildUIShare(configOptions, controlForm) {

      var aEmbed, aExport, dataObject, div, id, layerNames, options, i;

      if (configOptions.uiShare === true &&
        Blob
      ) {
        // IE<10 has no Blob support
        div = createElement("div", {}, {
          "text-align": "center"
        });

        if (configOptions.dataset !== "") {
          // Data supplied direct to dataObject cannot sensibly be embedded
          id = configOptions._id + "embed";
          aEmbed = createElement("a", {
            "id": id,
            "download": configOptions._id + "-embed.txt",
            "role": "button"
              // Actual buttons would look like like form submit thus too important
          }, {
            "cursor": "pointer"
          });
          aEmbed.addEventListener("click", function () {
            aEmbed.href = window.URL.createObjectURL(createEmbedBlob(configOptions));
              // Hack imposing href on own caller to trigger download. Requires embedElement persist
          }, false);
          configOptions._toLocale[id] = "embed";
          div.appendChild(aEmbed);
          div.appendChild(document.createTextNode(" | "));
        }

        layerNames = getLayerNames(configOptions);
        id = configOptions._id + "export";
        aExport = createElement("a", {
          "id": id,
          "download": configOptions._id + "-export.json",
          "role": "button"
          }, {
            "cursor": "pointer"
          });
        aExport.addEventListener("click", function () {

          options = {
            "filter": configOptions.n,
            "geoJSON": [],
            "service": configOptions.r
          };

          for (i = 0; i < layerNames.length; i += 1) {
            if (configOptions.v.indexOf(layerNames[i].charAt(0)) !== -1) {
              options.geoJSON.push(layerNames[i]);
            }
          }

          if (typeof configOptions._here === "object" &&
            "dataObject" in configOptions._here
          ) {
            dataObject = configOptions._here.dataObject;
            options.sanitize = false;
          } else {
            dataObject = configOptions.dataObject;
            options.sanitize = true;
          }

          aExport.href = window.URL.createObjectURL(
            new Blob([JSON.stringify(configOptions._call(
              dataObject,
              configOptions.c,
              configOptions.k,
              5e6 / Math.pow(2, configOptions.m),
              options
            ))],
            {type: "application/json;charset=utf-8"})
          );
            // Future: Export should execute with callback

        }, false);
        configOptions._toLocale[id] = "export";
        div.appendChild(aExport);

        controlForm.appendChild(div);
      }

      return configOptions;
    }

    function exitBuildUI(configOptions) {

      if ("_control" in configOptions) {
        delete configOptions.control;
      }
      return applyLocalisation(configOptions);
    }

    configOptions._toLocale = {};
      // DOM Id: translation key
    configOptions._layer = {};
      // Layer name: Leaflet layerGroup

    configOptions = buildAttributions(configOptions);
    configOptions = buildUILocale(configOptions);
    configOptions = buildUIPanel(configOptions);
    configOptions = buildUILayerControl(configOptions);

    controlForm = getControlForm(configOptions);
    if (!controlForm) {
      // Error, escape with partial UI
      return exitBuildUI(configOptions);
    }

    configOptions = buildRadioOnControl(configOptions, controlForm, "network", "n", "uiNetwork");
    configOptions = buildRadioOnControl(configOptions, controlForm, "service", "r", "uiService");
    configOptions = buildUIScale(configOptions, controlForm);
    configOptions = buildUIShare(configOptions, controlForm);

    return exitBuildUI(configOptions);
  }

  function queryHere(configOptions, rerender) {
    /**
     * Trigger new here() query (executed via callback)
     * @param {object} configOptions
     * @param {boolean} rerender - optional, if true redraw using here, with no new query
     */

    var dataObject, options;

    if (typeof rerender === "undefined" ||
      rerender !== true ||
      typeof configOptions._here !== "object"
    ) {

      options = {
        "_configOptions": configOptions,
        "callback": postHereQuery,
        "filter": configOptions.n,
        "service": configOptions.r
      };

      if (typeof configOptions._here === "object" &&
        "dataObject" in configOptions._here
      ) {
        dataObject = configOptions._here.dataObject;
        options.sanitize = false;
      } else {
        dataObject = configOptions.dataObject;
        options.sanitize = true;
      }

      configOptions._call(
        dataObject,
        configOptions.c,
        configOptions.k,
        5e6 / Math.pow(2, configOptions.m),
          // Range factor duplicated in export
        options
      );

    } else {

      outputHere(configOptions);

    }
  }

  function postHereQuery(error, here, options) {
    /**
     * Callback from here. Writes HERE and initiates map update
     * @param {object} error - Javascript Error
     * @param {object} here - here() raw
     * @param {object} options - as submitted
     */
    if ("_configOptions" in options) {
      if (typeof error === "undefined") {
        options._configOptions._here = here;
          // Store globally for reference by following rerenders
        outputHere(options._configOptions);
      } else {
        outputStatusNoMap(options._configOptions, error);
      }
    }
  }

  function getLinkColor(configOptions, referenceObject) {
    /**
     * Helper: Determine a simgle color for a link, merging colors where necessary
     * @param {object} configOptions
     * @param {object} referenceObject - link reference object, including key c
     * @return {string} 6-hex HTML color with leading hash
     */

      var i;
      var colors = [];

      function mergeColors(colors) {
        // Array of 6-hex colors, no hash

        var averageColor, i;
        var mixedColor = "#";
        var rgbStack = [[], [], []];

        for (i = 0; i < colors.length; i += 1) {
          if (colors[i].length === 6) {
            // Currently supports only original HTML hex style colors, GTFS-compatible
            rgbStack[0].push(parseInt(colors[i].slice(0, 2), 16));
            rgbStack[1].push(parseInt(colors[i].slice(2, 4), 16));
            rgbStack[2].push(parseInt(colors[i].slice(4, 6), 16));
          }
        }

        for (i = 0; i < rgbStack.length; i += 1) {
          if (rgbStack[i].length === 0) {
            return mixedColor + colors[0];
              // Unrecognised color style
          }
          averageColor = Math.round((rgbStack[i].reduce(function(a, b) {
            return a + b;
          }, 0)) / rgbStack[i].length);
          if (averageColor <= 16) {
            mixedColor += "0";
          }
          mixedColor += averageColor.toString(16);
        }

        return mixedColor;
      }

      if (referenceObject === "undefined" ||
        !Array.isArray(referenceObject)
      ) {
        return configOptions.linkColor;
      }

      for (i = 0; i < referenceObject.length; i += 1) {
        if ("c" in referenceObject[i] &&
          colors.indexOf(referenceObject[i].c) === -1
        ) {
          colors.push(referenceObject[i].c);
        }
      }

      if (colors.length === 0) {
        return configOptions.linkColor;
      }
      if (colors.length === 1) {
        return "#" + colors[0];
        // Future: Check link color !== node color
      }

      return mergeColors(colors);
    }

  function getLinkOrNodePopupContent(statName, statValue, linkObject, nodeObject) {
    /**
     * Helper: Content for map link/node popup. Generated on-click for efficiency
     * @param {string} statName - pre-translated name of value (eg "Daily Services")
     * @param {number} statValue - numeric associated with statName
     * @param {object} linkObject - link reference object, including key n
     * @param {object} nodeObject - node reference object, including key n
     * @return {object} DOM div element
     */

    var popupDiv;

    function buildPopupData(referenceObject, popupDiv, isNode) {
      // Object, DOM, boolean. Fills content for one Object

      var div, divider, element, i;

      if (typeof referenceObject !== "undefined" &&
        Array.isArray(referenceObject)
      ) {

        div = createElement("div", {}, {
          "margin": "0.3em 0"
        });
        if (isNode) {
          div.style["font-weight"] = "bold";
        } else {
          div.style["line-height"] = "2.3em";
        }

        for (i = 0; i < referenceObject.length; i += 1) {
          if ("n" in referenceObject[i]) {

            if ("u" in referenceObject[i]) {
              element = createElement("a", {
                "href": referenceObject[i].u
              });
              if (!isNode) {
                element.style.color = "#000";
                element.style["text-decoration"] = "none";
              }
            } else {
              element = createElement("span");
            }

            element.textContent = referenceObject[i].n;

            if (!isNode) {
              element.style.border = "1px solid #000";
              element.style.padding = "0.3em 0.5em";
              element.style["white-space"] = "nowrap";
              if ("c" in referenceObject[i]) {
                element.style["background-color"] = "#" + referenceObject[i].c;
              }
              if ("t" in referenceObject[i]) {
                element.style.color = "#" + referenceObject[i].t;
                element.style["border-color"] = "#" + referenceObject[i].t;
              }
            }

            div.appendChild(element);

            if (i < referenceObject.length - 1) {
              if (isNode) {
                divider = "|";
              } else {
                divider = " ";
              }
              div.appendChild(document.createTextNode(divider));
            }

          }
        }

        popupDiv.appendChild(div);
      }

      return popupDiv;
    }

    popupDiv = createElement("div", {}, {
      "color": "#000"
    });

    popupDiv = buildPopupData(nodeObject, popupDiv, true);

    if (statValue < 10 &&
      statValue % 1 !== 0
    ) {
      statValue = (Math.round(statValue * 10) / 10).toString();
    } else {
      statValue = Math.round(statValue).toString();
    }

    popupDiv.appendChild(createElement("div", {
      "textContent": statName + ": " + statValue
    }, {
      "margin": "0.3em 0"
    }));

    popupDiv = buildPopupData(linkObject, popupDiv, false);

    return popupDiv;
  }

  function outputHere(configOptions) {
    /**
     * Update map display with here
     * @param {object} configOptions
     */

    var geometry, keyName, panelDOM, statName, scale, i, j;
    var layerNames = getLayerNames(configOptions);

    for (i = 0; i < layerNames.length; i += 1) {
      if (layerNames[i] in configOptions._layer) {
        configOptions._layer[layerNames[i]].clearLayers();
      }
    }

    if (configOptions.uiPanel === true &&
      "summary" in configOptions._here
    ) {

      keyName = Object.keys(configOptions._here.summary);
      for (i = 0; i < keyName.length; i += 1) {

        panelDOM = document.getElementById(configOptions._id + keyName[i] + "value");
        if (panelDOM) {
          try {
            panelDOM.textContent = new Intl.NumberFormat(configOptions.t)
              .format(Math.round(configOptions._here.summary[keyName[i]]));
          } catch (err) {
            // Unsupported feature or locale
           panelDOM.textContent = Math.round(configOptions._here.summary[keyName[i]]).toString();
          }
        }

      }

    }

    if ("place" in configOptions._here &&
      "place" in configOptions.dataObject &&
      configOptions.dataObject.place.length > 0
    ) {

      scale = Math.exp((configOptions.s - 5) / 2) * configOptions.placeScale / 666;
      statName = getLocalised(configOptions, "place");
      for (i = 0; i < configOptions._here.place.length; i += 1) {

        if ("circle" in configOptions._here.place[i] &&
          "value" in configOptions._here.place[i] &&
          configOptions._here.place[i].circle.length > 1
        ) {

          configOptions.leaflet.circleMarker(configOptions.leaflet.latLng([
            configOptions._here.place[i].circle[1],
            configOptions._here.place[i].circle[0]
          ]), {
            "fill": true,
            "fillColor": configOptions.placeColor,
            "fillOpacity": configOptions.placeOpacity,
            "radius": Math.ceil(Math.sqrt(configOptions._here.place[i].value * scale)),
            "stroke": false
          })
          .bindTooltip(Math.round(configOptions._here.place[i].value).toString() + " " + statName)
            // Place is a tooltip, not popup, to allow easier configOptions._here clicks
          .addTo(configOptions._layer.place);

        }

      }

    }

    if ("link" in configOptions._here) {

      scale = Math.exp((configOptions.s - 5) / 2) * configOptions.linkScale * 4;
      statName = getLocalised(configOptions, "link");
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
          })
          .on("click", function (evt) {
            var popup = evt.target.getPopup();
            var index = parseInt(popup.getContent(), 10);
            if (!Number.isNaN(index)) {
              // Else already processed
              popup.setContent(getLinkOrNodePopupContent(
                statName, configOptions._here.link[index].value, configOptions._here.link[index].link));
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
      statName = getLocalised(configOptions, "link");
      for (i = 0; i < configOptions._here.node.length; i += 1) {

        if ("circle" in configOptions._here.node[i] &&
          "value" in configOptions._here.node[i] &&
          configOptions._here.node[i].circle.length > 1
        ) {

          configOptions.leaflet.circleMarker(configOptions.leaflet.latLng([
            configOptions._here.node[i].circle[1],
            configOptions._here.node[i].circle[0]
          ]), {
            "color": configOptions.nodeColor,
            "fill": false,
            "radius": Math.ceil(Math.log(1 + (configOptions._here.node[i].value * (1 / (scale * 2))))
              * scale + (configOptions.minWidth / 2)),
            "weight": 1
          })
          .on("click", function (evt) {
            var popup = evt.target.getPopup();
            var index = parseInt(popup.getContent(), 10);
            if (!Number.isNaN(index)) {
              // Else already processed
              popup.setContent(getLinkOrNodePopupContent(
                statName, configOptions._here.node[index].value, configOptions._here.node[index].link, configOptions._here.node[index].node));
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

      configOptions.leaflet.circle(configOptions.leaflet.latLng([
        configOptions._here.here[0].circle[1],
        configOptions._here.here[0].circle[0]
      ]), {
        "color": configOptions.hereColor,
        "fill": false,
        "interactive": false,
        "radius": configOptions._here.here[0].value,
        "weight": 2
      })
      .addTo(configOptions._layer.here);

    }

  }

  function loadInitScripts(configOptions) {
    /**
     * Initialisation of supporting scripts. Calls postLoadInitScripts()
     * @param {object} configOptions
     */

    var leafletURLs;

    outputStatusNoMap(configOptions);
      // Visual indicator to manage expectations

    if ("dataObject" in configOptions === false ||
      typeof configOptions.dataObject !== "object"
    ) {
      configOptions.dataObject = {};
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
      // Leaflet version 1+, so no need to load
      leafletURLs = [];
    } else {
      leafletURLs = [
        "https://unpkg.com/leaflet@1.3.4/dist/leaflet.css",
        "https://unpkg.com/leaflet@1.3.4/dist/leaflet.js"
      ];
        // Default Leaflet library CSS and JS
    }

    if (typeof Promise !== "undefined") {
      loadWithPromise(configOptions, leafletURLs);
    } else {
      loadWithClassic(configOptions, leafletURLs);
    }
  }

  function postLoadInitScripts(configOptions) {
    /**
     * Initialisation of UI with first query. Callback from loadInitScripts()
     * @param {object} configOptions
     */

    if (typeof L === "object" &&
      "version" in L === false
    ) {
      return outputStatusNoMap(configOptions, {"message": "Leaflet failed to load"});
    }

    configOptions.leaflet = L;

    configOptions = parseConfigOptions(configOptions);
    configOptions = buildMapBase(configOptions);
    configOptions = buildMapUI(configOptions);

    queryHere(configOptions);
  }


  if (!targetDOM) {
    return false;
      // Exit stage left with nowhere to report failure gracefully
  }

  while (targetDOM.firstChild) {
    targetDOM.removeChild(targetDOM.firstChild);
  }

  if (!Object.keys ||
    ![].indexOf ||
    typeof JSON !== "object"
  ) {
    // Unspoorted pre-IE9 vintage browser
    targetDOM.appendChild(
      document.createTextNode("Browser not supported by Aquius: Try a modern browser"));
      // There is no localisation of errors
    targetDOM.style.height = "auto";
      // Prevents unusable embed areas being filled with whitespace
    return false;
  }

  if (typeof configOptions !== "object") {
    configOptions = {};
  }
  configOptions._id = configId;
  configOptions._call = this.here;
  configOptions._here = HERE;

  loadInitScripts(configOptions);
  return true;
},


"here": function here(dataObject, x, y, range, options) {
  /**
   * Here Query. May be called independently
   * @param {Object} dataObject - as init() option dataObject
   * @param {number} x - longitude
   * @param {number} y - latitude
   * @param {number} range - metres from lat,lng
   * @param {Object} options - filter:network index, geoJSON:array layernames, sanitize:boolean,
   *   service:service index, callback:function(error, output, options)
   * @return {Object} key:values or callback
   */
  "use strict";

  var error;
  var raw = {};

  function parseDataObject(raw) {
    /**
     * Check and fix dataObject. Fixes only sufficient not to break here()
     * @param {object} raw
     * @param {return} raw
     */

    var keyName, i, j, k, l;
    var networkObjects = {
      // Minimum default structure of each "line" (array) for non-header data structures
      "0": {
        // By schema ID, extendable for future schema
        "link": [[0], [0], [0], {}],
        "network": [[0], {"en-US": "Unknown"}, {}],
        "node": [0, 0, {}],
        "place": [0, 0, {}],
        "service": [[0], {"en-US": "Unknown"}, {}]
      }
    };
      // In practice 0 equates to null, while avoiding dataset rejection or variable checking during draw

    if ("sanitize" in options &&
      options.sanitize === false
    ) {
      return raw;
    }

    if (typeof raw.dataObject !== "object") {
      raw.dataObject = {};
    }
    if ("meta" in raw.dataObject === false) {
      raw.dataObject.meta = {};
    }
    if ("schema" in raw.dataObject.meta === false ||
      raw.dataObject.meta.schema in networkObjects === false
    ) {
      raw.dataObject.meta.schema = "0";
    }
      // Other translation, option, and meta keys not used here, so ignored

    keyName = Object.keys(networkObjects[raw.dataObject.meta.schema]);
    for (i = 0; i < keyName.length; i += 1) {
      if (keyName[i] in raw.dataObject &&
        typeof raw.dataObject[keyName[i]] !== "object"
      ) {
        delete raw.dataObject[keyName[i]];
      }
    }

    for (i = 0; i < keyName.length; i += 1) {

      if (keyName[i] in raw.dataObject === false ||
        Array.isArray(raw.dataObject[keyName[i]]) == false ||
        raw.dataObject[keyName[i]].length === 0
      ) {
        // Set whole key to default, with one dummy entry
        raw.dataObject[keyName[i]] =
          [networkObjects[raw.dataObject.meta.schema][keyName[i]]];
      }

      for (j = 0; j < raw.dataObject[keyName[i]].length; j += 1) {

        if (raw.dataObject[keyName[i]][j].length <
          networkObjects[raw.dataObject.meta.schema][keyName[i]].length
        ) {
          for (k = raw.dataObject[keyName[i]][j].length - 1; k <
            networkObjects[raw.dataObject.meta.schema][keyName[i]].length; k += 1) {
            // Append defaults to short lines
            raw.dataObject[keyName[i]][j].push(
              networkObjects[raw.dataObject.meta.schema][keyName[i]][k]);
          }
        }

        for (k = 0; k <
          networkObjects[raw.dataObject.meta.schema][keyName[i]].length; k += 1) {

          if (typeof raw.dataObject[keyName[i]][j][k] !==
            typeof networkObjects[raw.dataObject.meta.schema][keyName[i]][k]
          ) {

            if ((keyName[i] === "node" ||
              keyName[i] === "place") &&
              k === 2 &&
              typeof raw.dataObject[keyName[i]][j][k] === "number"
            ) {
              // Accomodate old non-property node/place data structure
              raw.dataObject[keyName[i]][j][k] = {"p": raw.dataObject[keyName[i]][j][k]};
            } else {
              if (keyName[i] === "link" &&
                typeof raw.dataObject[keyName[i]][j][k] === "number" &&
                (k === 0 ||
                k === 1)
              ) {
                // Accomodate old non-array link product data structure
                raw.dataObject[keyName[i]][j][k] = [raw.dataObject[keyName[i]][j][k]];
              } else {
                // Replace specific data item with default
                raw.dataObject[keyName[i]][j][k] =
                  networkObjects[raw.dataObject.meta.schema][keyName[i]][k];
              }
            }
          }

          if (Array.isArray(raw.dataObject[keyName[i]][j][k])) {
            for (l = 0; l < raw.dataObject[keyName[i]][j][k].length; l += 1) {
              if (typeof raw.dataObject[keyName[i]][j][k][l] !==
                typeof networkObjects[raw.dataObject.meta.schema][keyName[i]][k][0]
              ) {
                // Replace specific data item within array with default
                raw.dataObject[keyName[i]][j][k][l] =
                  networkObjects[raw.dataObject.meta.schema][keyName[i]][k][0];
              }
            }
          }

        }

      }

    }

    return raw;
  }

  function walkRoutes(raw, x, y, range, options) {
    /**
     * Adds raw.serviceLink and raw.serviceNode matrices, filtered
     * @param {object} raw - internal working data
     * @param {number} x - x (longitude) coordinate
     * @param {number} y - y (latitude) coordinate
     * @param {number} range - metres from lat,lng
     * @param {object} options
     * @return {object} raw
     */

    var linkChecks, service, i;
    
    function haversineDistance(lat1, lng1, lat2, lng2) {
      // Earth distance. Modified from Leaflet CRS.Earth.js

      var rad = Math.PI / 180;
      var sinDLat = Math.sin((lat2 - lat1) * rad / 2);
      var sinDLon = Math.sin((lng2 - lng1) * rad / 2);
      var a = sinDLat * sinDLat + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * sinDLon * sinDLon;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return 6371000 * c;
    }

    function createLinkChecks(raw, x, y, range, options) {
      // Key=value indices optimised for fast confirmation of the existence of a value

      var i;
      var linkChecks = {};


      if ("filter" in options &&
        typeof options.filter === "number" &&
        options.filter >= 0 &&
        options.filter < raw.dataObject.network.length
      ) {
        linkChecks.product = {};
          // Product
        for (i = 0; i < raw.dataObject.network[options.filter][0].length; i += 1) {
          linkChecks.product[raw.dataObject.network[options.filter][0][i]] = raw.dataObject.network[options.filter][0][i];
        }
      }

      linkChecks.here = {};
        // Here Nodes
      for (i = 0; i < raw.dataObject.node.length; i += 1) {
        if (raw.dataObject.node[i].length > 1 &&
          range >= haversineDistance(y, x, raw.dataObject.node[i][1], raw.dataObject.node[i][0])
        ) {
          linkChecks.here[i] = i;
        }
      }

      if ("service" in options &&
        typeof options.service === "number" &&
        options.service >= 0 &&
        options.service < raw.dataObject.service.length
      ) {
        linkChecks.service = {};
          // Index positions in link service array to be analysed
        for (i = 0; i < raw.dataObject.service[options.service][0].length; i += 1) {
          linkChecks.service[raw.dataObject.service[options.service][0][i]] = raw.dataObject.service[options.service][0][i];
        }
      }

      return linkChecks;
    }

    function isProductOK(linkChecks, linkProductArray) {
      // At least 1 product must be included in productFilter, or productFilter missing

      var i;

      if ("product" in linkChecks) {
        if (linkProductArray.length === 1) {
          // Not initiating a loop where length is 1 reduces runtime
          if (linkProductArray[0] in linkChecks.product) {
            return true;
          }
        } else {
          for (i = 0; i < linkProductArray.length; i += 1) {
            if (linkProductArray[i] in linkChecks.product) {
              return true;
            }
          }
        }
      } else {
        return true;
      }

      return false;
    }

    function isShareOK(linkChecks, linkPropertiesObject) {
      // Any share must not be included as parent

      if ("h" in linkPropertiesObject &&
        linkPropertiesObject.h in linkChecks.product
      ) {
        return false;
      }
      if ("shared" in linkPropertiesObject &&
        linkPropertiesObject.shared in linkChecks.product
      ) {
        return false;
      }
      return true;
    }

    function isHereOK(linkChecks, linkNodeArray, linkPropertiesObject) {
      // At least one node is in here that is not setdown only

      var i;

      for (i = 0; i < linkNodeArray.length; i += 1) {
        // Length of linkNodeArray logically not 1, so no optimisation from length===1 check
        if (linkNodeArray[i] in linkChecks.here) {
          if ("s" in linkPropertiesObject === false &&
            "setdown" in linkPropertiesObject === false
          ) {
            return true;
          } else {
            if ("s" in linkPropertiesObject &&
              Array.isArray(linkPropertiesObject.s) &&
              linkPropertiesObject.s.indexOf(linkNodeArray[i]) === -1
            ) {
              // IndexOf() efficient here since whole setdown list needs to be checked as-is
              return true;
            }
            if ("setdown" in linkPropertiesObject &&
              Array.isArray(linkPropertiesObject.setdown) &&
              linkPropertiesObject.setdown.indexOf(linkNodeArray[i]) === -1
            ) {
              return true;
            }
          }
        }
      }

      return false;
    }

    function addServiceLevel(service, linkChecks, linkServiceArray) {

      var i;

      if (linkServiceArray.length === 1 &&
        ("service" in linkChecks === false ||
        0 in linkChecks.service)
      ) {
        // Not initiating a loop where length is 1 reduces runtime
        service.level = linkServiceArray[0];
        return service;
      }

      service.level = 0;
      for (i = 0; i < linkServiceArray.length; i += 1) {
        if ("service" in linkChecks === false ||
          i in linkChecks.service
        ) {
          service.level += linkServiceArray[i];
        }
      }

      return service;
    }
    
    function addServiceDirection(service, linkChecks, linkNodeArray, linkPropertiesObject) {
      // Includes circular and route

      var i;

      if ("circular" in linkPropertiesObject) {
        linkPropertiesObject.c = linkPropertiesObject.circular;
      }

      if (linkNodeArray.length > 1 &&
        ("c" in linkPropertiesObject &&
        (linkPropertiesObject.c ||
        linkPropertiesObject.c === 1))
      ) {
        service.circular = linkNodeArray.length - 1;
          // Exclude the final node on a circular
      }

      if ("direction" in linkPropertiesObject) {
        linkPropertiesObject.d = linkPropertiesObject.direction;
      }

      if ("d" in linkPropertiesObject &&
        (linkPropertiesObject.d ||
        linkPropertiesObject.d === 1)
      ) {
        service.direction = 1;

        for (i = 0; i < linkNodeArray.length; i += 1) {

          if (linkNodeArray[i] in linkChecks.here) {
            if ("circular" in service) {
              service.route = linkNodeArray.slice(0, -1);
                // Come friendly bombs and fall on Parla
              service.route = service.route.slice(i).concat(service.route.slice(0, i));
                // Its circular uni-directional tram is nodal nightmare
              service.route.push(service.route[0]);
                /**
                 * Still not perfect: Counts the whole service round the loop
                 * Considered defering these service till they can be summarised at the end
                 * However Parla has unequal frequencies in each direction,
                 * so halving (as other circulars) over common sections is still wrong
                 * Would need to calculate which direction is the fastest to each node
                 */
            } else {
              service.route = linkNodeArray.slice(i);
                // Route ignores nodes before the 1st found in hereNodes
            }
            break;
          }

        }

      } else {
        service.route = linkNodeArray;
      }

      if ("route" in service === false) {
        service.route = [];
      }

      return service;
    }

    function addServicePickup(service, linkChecks, linkPropertiesObject) {

      var pickupIndex, i;

      if ("pickup" in linkPropertiesObject) {
        linkPropertiesObject.u = linkPropertiesObject.pickup;
      }

      if ("u" in linkPropertiesObject &&
        Array.isArray(linkPropertiesObject.u) &&
        linkPropertiesObject.u.length > 0
      ) {

        for (i = 0; i < linkPropertiesObject.u.length; i += 1) {

          if (linkPropertiesObject.u[i] in linkChecks.here === false) {
            pickupIndex = service.route.indexOf(linkPropertiesObject.u[i]);
              // Individual routes tend to be short arrays, so this should remain efficient
            if (pickupIndex !== -1) {
              // Pickup-only nodes are removed from route unless within here
              service.route.splice(pickupIndex, 1);
            }
          }

        }
      }

      return service;
    }

    function addServiceSplits(service, linkChecks, linkNodeArray, linkPropertiesObject) {
      /**
       * Splits logic: service.splits = 1, only contributes to service count at 
       *   nodes within unique sections, and are only plotted in unique sections.
       *   Unless: service.splits = 2, hereNodes contains no common sections.
       */

      var i;

      if ("split" in linkPropertiesObject) {
        linkPropertiesObject.t = linkPropertiesObject.split;
      }
      
      if ("t" in linkPropertiesObject &&
        Array.isArray(linkPropertiesObject.t) &&
        linkPropertiesObject.t.length > 0
      ) {

        service.splitsIndex = {};
          // Key=value for speed, also used in subsequent route loop
        for (i = 0; i < linkPropertiesObject.t.length; i += 1) {
          service.splitsIndex[linkPropertiesObject.t[i]] = linkPropertiesObject.t[i];
        }

        service.splits = 2;
        for (i = 0; i < linkNodeArray.length; i += 1) {
          if (linkNodeArray[i] in service.splitsIndex === false &&
            linkNodeArray[i] in linkChecks.here
          ) {
            // Without splitsIndex could test t.indexOf(linkNodeArray[i]) === -1 &&...
            service.splits = 1;
            break;
          }
        }

      }

      return service;
    }

    function addServiceReferences(service, linkPropertiesObject) {
      // Saves constant rechecking of r property

      if ("reference" in linkPropertiesObject) {
        linkPropertiesObject.r = linkPropertiesObject.reference;
      }

      if ("r" in linkPropertiesObject &&
        Array.isArray(linkPropertiesObject.r) &&
        linkPropertiesObject.r.length > 0
      ) {
        service.reference = linkPropertiesObject.r;
      }

      return service;
    }

    function mergeReference(masterReference, addReference) {
      // Adds a link property.r array to a master object, unique by name or color

      var i;

      if (!Array.isArray(addReference) ||
        addReference.length === 0
      ) {
        return masterReference;
      }

      for (i = 0; i < addReference.length; i += 1) {

        if ("n" in addReference[i]) {
          // Group by name
          if (addReference[i].n in masterReference === false) {
            masterReference[addReference[i].n] = addReference[i];
          }
        } else {
          if ("c" in addReference[i]) {
            // Group by color
            if (addReference[i].c in masterReference === false) {
              masterReference[addReference[i].c] = addReference[i];
            }
          }
        }

      }

      return masterReference;
    }

    function walkServiceRoutes(raw, service, linkChecks) {
    
      var destination, origin, serviceLevel, i;

      for (i = 0; i < service.route.length; i += 1) {

        if ((("splits" in service === false ||
          service.splits !== 1) ||
          service.route[i] in service.splitsIndex) &&
          ("circular" in service === false ||
            service.circular !== i)
        ) {

          if ("direction" in service ||
            service.route[i] in linkChecks.here
          ) {
            serviceLevel = service.level;
          } else {
            serviceLevel = service.level / 2;
          }

          if (typeof raw.serviceNode[service.route[i]] === "undefined") {
            raw.serviceNode[service.route[i]] = {
              "reference": {},
              "service": serviceLevel
            };
          } else {
            raw.serviceNode[service.route[i]].service += serviceLevel;
          }

          if ("reference" in service) {
            raw.serviceNode[service.route[i]].reference =
              mergeReference(raw.serviceNode[service.route[i]].reference, service.reference);
          }

        }

        if (service.route.length - 1 > i &&
          (("splits" in service === false ||
          service.splits !== 1) ||
          service.route[i] in service.splitsIndex ||
          service.route[i + 1] in service.splitsIndex)
        ) {

          if ("direction" in service ||
            (service.route[i] in linkChecks.here &&
            service.route[i + 1] in linkChecks.here)
          ) {
            serviceLevel = service.level;
          } else {
            serviceLevel = service.level / 2;
          }

          if (service.route[i] < service.route[i + 1]) {
            // Origin is largest node first. Skips reverse. Order allows subsequent pop rather than shift
            origin = service.route[i + 1];
            destination = service.route[i];
          } else {
            origin = service.route[i];
            destination = service.route[i + 1];
          }

          if (typeof raw.serviceLink[origin] === "undefined") {
            raw.serviceLink[origin] = [];
          }

          if (typeof raw.serviceLink[origin][destination] === "undefined") {
            raw.serviceLink[origin][destination] = {
              "reference": {},
              "service": serviceLevel
            };
          } else {
            raw.serviceLink[origin][destination].service += serviceLevel;
          }

          if ("reference" in service) {
            raw.serviceLink[origin][destination].reference =
              mergeReference(raw.serviceLink[origin][destination].reference, service.reference);
          }

        }

      }

      return raw;
    }

    raw.serviceLink = [];
      // Service by link [from[to[service]]] - with voids undefined
    raw.serviceNode = [];
      // Service by node [node[service]] - with voids undefined
    linkChecks = createLinkChecks(raw, x, y, range, options);

    for (i = 0; i < raw.dataObject.link.length; i += 1) {

      if (
        isProductOK(linkChecks, raw.dataObject.link[i][0]) &&
        isShareOK(linkChecks, raw.dataObject.link[i][3]) &&
        isHereOK(linkChecks, raw.dataObject.link[i][2], raw.dataObject.link[i][3])
      ) {

        service = {};
        service = addServiceLevel(service, linkChecks, raw.dataObject.link[i][1]);

        if (service.level > 0) {
          // Process this service, else skip

          service = addServiceDirection(service, linkChecks, raw.dataObject.link[i][2], raw.dataObject.link[i][3]);
          service = addServicePickup(service, linkChecks, raw.dataObject.link[i][3]);
          service = addServiceSplits(service, linkChecks, raw.dataObject.link[i][2], raw.dataObject.link[i][3]);
          service = addServiceReferences(service, raw.dataObject.link[i][3]);

          if ("splits" in service === false ||
            service.splits !== 1
          ) {
            raw.summary.link += service.level;
          }

          raw = walkServiceRoutes(raw, service, linkChecks);

        }

      }

    }

    return raw;
  }

  function pathRoutes(raw) {
    /**
     * Builds raw.path links of the same service level from matrices added in walkRoutes()
     * @param {object} raw - internal working data 
     * @return {object} raw
     */

    function buildODMatrix(serviceLink) {

      var destination, destinationNum, originNum, serviceKey, i, j;
      var origin = Object.keys(serviceLink);
      var service = {};

      service.od = {},
        // service: [ [from, to] ]
      service.data = {};
        // service: {service, reference}

      for (i = 0; i < origin.length; i += 1) {

        originNum = origin[i] - 0;
          // Numeric of origin
        destination = Object.keys(serviceLink[originNum]);

        for (j = 0; j < destination.length; j += 1) {

          destinationNum = destination[j] - 0;
            // Numeric of destination
          serviceKey = serviceLink[originNum][destinationNum].service.toString();

          if ("reference" in serviceLink[originNum][destinationNum]) {
            serviceKey += ":" + Object.keys(serviceLink[originNum][destinationNum].reference).join(":");
          }

          if (serviceKey in service.od === false) {
            service.od[serviceKey] = [];
            service.data[serviceKey] = serviceLink[originNum][destinationNum];
          }
          service.od[serviceKey].push([originNum, destinationNum]);

        }

      }

      return service;
    }

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

    function buildLinkFromMatrix(raw, service) {
      // Further stack aggregation possible, but time-consuming vs resulting reduction in objects

      var geometry, link, stack, i, j;
      var serviceKeys = Object.keys(service.od);

      raw.link = [];

      for (i = 0; i < serviceKeys.length; i += 1) {
        stack = [service.od[serviceKeys[i]].pop()];
        while (service.od[serviceKeys[i]].length > 0) {

          link = service.od[serviceKeys[i]].pop();

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

        for (j = 0; j < stack.length; j += 1) {

          geometry = {
            "polyline": makePolyline(stack[j], raw.dataObject.node),
            "value": service.data[serviceKeys[i]].service
          };

          if ("reference" in service.data[serviceKeys[i]]) {
            geometry.link = referenceToArray(service.data[serviceKeys[i]].reference);
          }

          raw.link.push(geometry);
        }

      }

      return raw;
    }

    raw = buildLinkFromMatrix(raw, buildODMatrix(raw.serviceLink));
    delete raw.serviceLink;

    return raw;
  }

  function referenceToArray(referenceObject) {
    /**
     * Helper: Converts mergeReference() structure object into final array
     * @param {object} referenceObject - object of r properties
     * @return {object} sorted array of r properties
     */

    var reference, i;
    var keys = Object.keys(referenceObject).sort();

    if (keys.length === 0) {
      return [];
    }

    if (keys.length === 1) {
      return [referenceObject[keys[0]]];
    }
 
    reference = [];
    for (i = 0; i < keys.length; i += 1) {
      reference.push(referenceObject[keys[i]]);
    }

    return reference;
  }

  function conjureGeometry(raw, options) {
    /**
     * Builds geospatial output using walkRoutes() matrices and pathRoutes() paths
     * @param {object} raw
     * @param {object} options
     * @return {object} output
     */

    function toGeojson(raw, geoJSON) {
      // Future: Faster if built with raw, not reprocessing link/etc, but feature is marginal

      var geometry, properties, i, j, k;
      var geojsonObject = {
        "type": "FeatureCollection",
        "features": []
      };

      for (i = 0; i < geoJSON.length; i += 1) {
        if (geoJSON[i] in raw) {
          for (j = 0; j < raw[geoJSON[i]].length; j += 1) {
            if ("value" in raw[geoJSON[i]][j] &&
            ("circle" in raw[geoJSON[i]][j] ||
            "polyline" in raw[geoJSON[i]][j])
            ) {
              if ("circle" in raw[geoJSON[i]][j]) {
                geometry = {
                  "type": "Point",
                  "coordinates": raw[geoJSON[i]][j].circle
                };
              } else {
                geometry = {
                  "type": "LineString",
                  "coordinates": []
                };
                for (k = 0; k <  raw[geoJSON[i]][j].polyline.length; k += 1) {
                  geometry.coordinates.push(raw[geoJSON[i]][j].polyline[k]);
                }
              }
              properties = {
                "type": geoJSON[i],
                "value": raw[geoJSON[i]][j].value
              };
              if ("link" in raw[geoJSON[i]][j]) {
                properties.link = raw[geoJSON[i]][j].link;
              }
              if ("node" in raw[geoJSON[i]][j]) {
                properties.node = raw[geoJSON[i]][j].node;
              }
              geojsonObject.features.push({
                "type": "Feature",
                "geometry": geometry,
                "properties": properties
              });
            }
          }
        }
      }

      return geojsonObject;
    }

    function addNodePlace(raw) {

      var dataObjectNode, geometry, population, i;
      var maxNodeIndex = raw.dataObject.node.length - 1;
      var maxPlaceIndex = raw.dataObject.place.length - 1;
      var placeList = {};

      raw.node = [];
      raw.place = [];

      for (i = 0; i < raw.serviceNode.length; i += 1) {
        if (typeof raw.serviceNode[i] !== "undefined" &&
          i <= maxNodeIndex
        ) {

          raw.summary.node += 1;
          dataObjectNode = raw.dataObject.node[i];

          geometry = {
            "circle": [
              dataObjectNode[0],
              dataObjectNode[1]
            ],
            "value": raw.serviceNode[i].service
          };

          if ("reference" in raw.serviceNode[i]) {
            geometry.link = referenceToArray(raw.serviceNode[i].reference);
          }

          if ("reference" in dataObjectNode[2]) {
            dataObjectNode[2].r = dataObjectNode[2].reference;
          }

          if ("r" in dataObjectNode[2] &&
            dataObjectNode[2].r.length > 0
          ) {
            geometry.node = dataObjectNode[2].r;
          }

          raw.node.push(geometry);

          if ("place" in dataObjectNode[2]) {
            dataObjectNode[2].p = dataObjectNode[2].place;
          }

          if ("p" in dataObjectNode[2] &&
            dataObjectNode[2].p in placeList === false
          ) {
            placeList[dataObjectNode[2].p] = dataObjectNode[2].p;
            if (dataObjectNode[2].p <= maxPlaceIndex &&
              dataObjectNode[2].p >= 0
            ) {

              population = 0;
              if ("p" in raw.dataObject.place[dataObjectNode[2].p][2]) {
                population = raw.dataObject.place[dataObjectNode[2].p][2].p;
              } else {
                if ("population" in raw.dataObject.place[dataObjectNode[2].p][2]) {
                  population = raw.dataObject.place[dataObjectNode[2].p][2].population;
                }
              }

              if (population > 0) {
                raw.summary.place += population;
                raw.place.push({
                  "circle": [
                    raw.dataObject.place[dataObjectNode[2].p][0],
                    raw.dataObject.place[dataObjectNode[2].p][1]
                  ],
                  "value": population
                });
              }

            }
          }

        }
      }

      delete raw.serviceNode;

      return raw;
    }

    raw = addNodePlace(raw);

    if ("geoJSON" in options === false ||
      !Array.isArray(options.geoJSON)
    ) {
      return raw;
    } else {
      return toGeojson(raw, options.geoJSON);
    }
  }

  function exitHere(error, raw, options) {
    /**
     * Called on exit
     * @param {object} error - Jvaascript error
     * @param {object} raw
     * @param {object} options
     * @return {object} raw or callback
     */
    if (typeof error === "undefined" &&
      "error" in raw
    ) {
      error = new Error(raw.error);
    }

    if ("callback" in options) {
      options.callback(error, raw, options);
      return true;
    } else {
      return raw;
    }
  }


  if (!Object.keys ||
    ![].indexOf ||
    typeof JSON !== "object"
  ) {
    raw.error = "Unsupported browser";
    return exitHere(error, raw, options);
  }

  if (typeof x !== "number" ||
    typeof y !== "number" ||
    typeof range !== "number"
  ) {
    raw.error = "Here parameters not numeric";
    return exitHere(error, raw, options);
  }

  if (typeof options !== "object") {
    options = {};
  }

  raw.dataObject = dataObject;

  raw.here = [{
    "circle": [x, y],
    "value": range
  }];

  raw.summary = {
    "link": 0,
      // Count of services (eg daily trains)
    "node": 0,
      // Count of nodes (eg stations)
    "place": 0
      // Count of demography (eg people)
  };

  try {

    raw = parseDataObject(raw, options);
    raw = walkRoutes(raw, x, y, range, options);
    raw = pathRoutes(raw);
    raw = conjureGeometry(raw, options);

    return exitHere(error, raw, options);

  } catch (err) {

    error = err;

    return exitHere(error, raw, options);

  }
},

};
// EoF

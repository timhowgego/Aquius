/*eslint-env browser*/
/*global aquius*/

var geojsonToAquius = geojsonToAquius || {
/**
 * @namespace GeoJSON to Aquius
 * @version 0
 * @copyright MIT License
 */


"init": function init(configId) {
  /**
   * Initialisation with user interface
   * @param {string} configId - Id of DOM element within which to build UI
   * @return {boolean} initialisation success
   */
   "use strict";

   // Functions shared with gtfsToAquius: createElement, initialiseUI, outputError

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

  function initialiseUI(vars, loadFunction, prompt) {
    /**
     * Creates user interface in its initial state
     * @param {object} vars - internal data references (including configId)
     * @param {object} loadFunction - function to load files
     * @param {string} prompt - label
     * @return {boolean} initialisation success
     */

    var button, form, label;
    var baseDOM = document.getElementById(vars.configId);

    if (!baseDOM) {
      return false;
    }

    while (baseDOM.firstChild) {
      baseDOM.removeChild(baseDOM.firstChild);
    }

    if (!Object.keys ||
      ![].indexOf ||
      typeof JSON !== "object" ||
      !window.File ||
      !window.FileReader ||
      !window.Blob
    ) {
      baseDOM.appendChild(
        document.createTextNode("Browser not supported: Try a modern browser"));
      return false;
    }

    document.head.appendChild(createElement("script", {
      "src": "https://timhowgego.github.io/Aquius/dist/aquius.min.js",
      "type": "text/javascript"
    }));
      // Optional in much later post-processing, so no callback

    form = createElement("form", {
      "className": vars.configId + "Input"
    });

    label = createElement("label", {
      "textContent": prompt
    });
    
    button = createElement("input", {
      "id": vars.configId + "ImportFiles",
      "multiple": "multiple",
      "name": vars.configId + "ImportFiles[]",
      "type": "file"
    });
    button.addEventListener("change", (function(){
      loadFunction(vars);
    }), false);
    label.appendChild(button);

    form.appendChild(label);

    form.appendChild(createElement("span", {
      "id": vars.configId + "Progress"
    }));

    baseDOM.appendChild(form);

    baseDOM.appendChild(createElement("div", {
      "id": vars.configId + "Output"
    }));

    return true;
  }
  
  function initialiseCartograph(vars) {
    /**
     * Initiates JSON file import and Aquius creation
     * @param {object} vars - internal data references
     */

    var reader;
    var loaded = [];
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var options = {
      "_vars": vars,
      "callback": outputCartograph
    };
    var processedFiles = 0;
    var progressDOM = document.getElementById(vars.configId + "Progress");
    var totalFiles = 0;

    function loadFiles(fileList) {

      var i;

      totalFiles = fileList.length;

      for (i = 0; i < totalFiles; i += 1) {
        reader = new FileReader();
        reader.onerror = (function(evt, theFile) {
          outputError(new Error("Could not read " + theFile.name), vars);
          reader.abort();
        });
        reader.onload = (function(theFile) {
          return function() {
            try {
              onLoad(theFile.name, this.result);
            } catch (err) {
              outputError(err, vars);
            }
          };
        })(fileList[i]);
        reader.readAsText(fileList[i]);
      }
    }

    function onLoad(filename, result) {

      var json;

      try {
        json = JSON.parse(result);
        if (typeof json === "object") {
          if (filename.toLowerCase() === "config.json") {
            options.config = json;
          } else {
            if ("type" in json &&
              json.type === "FeatureCollection" &&
              "features" in json &&
              Array.isArray(json.features)
            ) {
              loaded.push(json);
            } else {
              if ("config" in options === false) {
                options.config = json;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof SyntaxError === false) {
          outputError(err, vars);
        }
          // Else it not JSON
      }

      processedFiles += 1;

      if (processedFiles === totalFiles) {
        vars.cartograph(loaded, options);
      }
    }

    if (fileDOM !== null &&
      fileDOM.files.length > 0
    ) {
      fileDOM.disabled = true;
      if (progressDOM !== null) {
        while (progressDOM.firstChild) {
          progressDOM.removeChild(progressDOM.firstChild);
        }
        progressDOM.textContent = "Working...";
      }
      loadFiles(fileDOM.files);
    }
  }

  function outputCartograph(error, out, options) {
    /**
     * Called after Aquius creation
     * @param {object} error - Error object or undefined 
     * @param {object} out - output, including keys aquius and config
     * @param {object} options - as sent, including _vars
     */

    // Similiar to GTFS (fewer variables, no summaries/tables)

    var keys, i;
    var vars = options._vars;
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var outputDOM = document.getElementById(vars.configId + "Output");
    var progressDOM = document.getElementById(vars.configId + "Progress");

    if (error !== undefined) {
      outputError(error, vars);
      return false;
    }

    if (!outputDOM ||
      !progressDOM
    ) {
      return false;
    }

    while (outputDOM.firstChild) {
      outputDOM.removeChild(outputDOM.firstChild);
    }

    while (progressDOM.firstChild) {
      progressDOM.removeChild(progressDOM.firstChild);
    }

    if (fileDOM !== null) {
      fileDOM.disabled = false;
    }

    outputDOM.className = "";

    keys = ["aquius", "config"];
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in out &&
        Object.keys(out[keys[i]]).length > 0
      ) {

        progressDOM.appendChild(createElement("a", {
          "className": vars.configId + "Download",
          "href": window.URL.createObjectURL(
            new Blob([JSON.stringify(out[keys[i]])],
            {type: "application/json;charset=utf-8"})
          ),
          "download": keys[i] + ".json",
          "textContent": "Save " + keys[i] + ".json",
          "role": "button"
        }));

      }
    }

    if (typeof aquius !== "undefined" &&
      "aquius" in out
    ) {
      // If aquius has not loaded by now, skip the map
      outputDOM.appendChild(createElement("div", {
        "id": vars.configId + "Map"
      }, {
        "height": (document.documentElement.clientHeight / 2) + "px"
      }));
      aquius.init(vars.configId + "Map", {
        "dataObject": out.aquius,
        "uiStore": false
      });
    }

  }

  function outputError(error, vars) {
    /**
     * Output errors to user interface, destroying any prior Output
     * @param {object} error - error Object
     * @param {object} vars - internal data references
     */

    var message;
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var outputDOM = document.getElementById(vars.configId + "Output");
    var progressDOM = document.getElementById(vars.configId + "Progress");
    
    if (error !== undefined &&
      outputDOM !== null
    ) {

      while (outputDOM.firstChild) {
        outputDOM.removeChild(outputDOM.firstChild);
      }

      outputDOM.className = vars.configId + "OutputError";

      if ("message" in error) {

        message = error.message;
      } else {
        message = JSON.stringify(error);
      }

      outputDOM.appendChild(createElement("p", {
        "textContent": "Error: " + message
      }));

      if (progressDOM !== null) {
        while (progressDOM.firstChild) {
          progressDOM.removeChild(progressDOM.firstChild);
        }
        progressDOM.textContent = "Failed";
      }
      if (fileDOM !== null) {
        fileDOM.disabled = false;
      }
    }
  }

  return initialiseUI({
    "configId": configId,
    "cartograph": this.cartograph
    },
    initialiseCartograph,
    "GeoJSON files and optional config to process:");
},


"cartograph": function cartograph(geojson, options) {
  /**
   * Creates Aquius dataObject from GeoJSON components
   * @param {array} geojson - array of GeoJSON objects
   * @param {object} options - config, callback
   * @return {object} without callback: possible keys aquius, config, error
   * with callback: callback(error, out, options)
   */
  "use strict";

  var out = {
    "_": {},
      // Internal objects
    "aquius": {},
      // Output file
    "config": {}
      // Output config
  };

  out._.place = [];
    // 2-part array: Multipolygons, properties object, as yet unassigned to aquius.place
  out._.placeLast = -1;
    // Last out._.place index within boundary - next node often in same boundary
  out._.placeLookup = {};
    // out._.place index: aquius.node index
  out._.node = {};
    // x:y key: [x,y,properties] as yet unassigned to aquius.node
  out._.nodeLookup = {};
    // x:y key: aquius.node index
  out._.nodeIgnore = {};
    // x:y key not to analyse

  function parseConfig(out, options) {
    /**
     * Parse options.config into valid out.config. Defines defaults
     * @param {object} out - internal data references
     * @param {object} options
     * @return {object} out
     */

    var i;
    var defaults = {
      "blockProperty": "block",
        // Field name in GeoJSON properties containing block
      "circularProperty": "circular",
        // Field name in GeoJSON properties containing circular
      "colorProperty": "color",
        // Field name in GeoJSON properties containing service color (6-hex, no hash, as GTFS)
      "coordinatePrecision": 5,
        // Coordinate decimal places (smaller values tend to group clusters of stops)
      "directionProperty": "direction",
        // Field name in GeoJSON properties containing direction
      "inGeojson": true,
        // If geojson boundaries are provided, only services at nodes within a boundary will be analysed
      "linkNameProperty": "name",
        // Field name in GeoJSON properties containing service name
      "linkUrlProperty": "url",
        // Field name in GeoJSON properties containing service url
      "meta": {},
        // As Data Structure meta key
      "network":[],
        // As Data Structure network key
      "nodeCodeProperty": "code",
        // Field name in GeoJSON properties containing node code
      "nodeNameProperty": "name",
        // Field name in GeoJSON properties containing node name
      "nodeUrlProperty": "url",
        // Field name in GeoJSON properties containing node url
      "option": {},
        // As Data Structure/Configuration option key
      "populationProperty": "population",
        // Field name in GeoJSON properties containing the number of people (or equivalent demographic statistic)
      "product": [],
        // As Data Structure network reference.product key (products in index order, referencing productProperty data)
      "productProperty": "product",
        // Field name in GeoJSON properties containing product array as comma-separated string
      "service": [],
        // As Data Structure service key (structure must match serviceProperty data)
      "serviceProperty": "service",
        // Field name in GeoJSON properties containing service array as comma-separated string
      "sharedProperty": "shared",
        // Field name in GeoJSON properties containing shared product ID
      "textColorProperty": "text",
        // Field name in GeoJSON properties containing service text color (6-hex, no hash, as GTFS)
      "translation": {}
        // As Data Structure/Configuration translation key
    };
      // Future: Pickup, setdown, split support: Referencing index in own node sequence hard to build manually

    var keys = Object.keys(defaults);

    if (typeof options !== "object") {
      options = {};
    }

    for (i = 0; i < keys.length; i += 1) {
      if ("config" in options &&
        keys[i] in options.config &&
        typeof options.config[keys[i]] === typeof defaults[keys[i]]
      ) {
        out.config[keys[i]] = options.config[keys[i]];
      } else {
        out.config[keys[i]] = defaults[keys[i]];
      }
    }

    return out;
  }

  function buildHead(out) {
    /**
     * Add meta, option, translation, network and service
     * @param {object} out - internal data references
     * @return {object} out
     */

    var loop, i;

    out.aquius.meta = out.config.meta;
    out.aquius.meta.schema = "0";
      // Always schema "0"

    loop = ["option", "translation"];
    for (i = 0; i < loop.length; i += 1) {
      if (Object.keys(out.config[loop[i]]).length > 0) {
        out.aquius[loop[i]] = out.config[loop[i]];
      }
    }

    loop = ["network", "service"];
    for (i = 0; i < loop.length; i += 1) {
      out.aquius[loop[i]] = out.config[loop[i]];
      // Currently unchecked
    }

    if (out.config.product.length > 0) {
      out.aquius.reference = {};
      out.aquius.reference.product = out.config.product;
      // Currently unchecked
    }

    return out;
  }

  function preciseCoordinate(out, numeric) {
    /**
     * Helper: Standardise precision of x or y coordinate
     * @param {object} out
     * @param {number} numeric - x or y coordinate
     * @return {number} numeric
     */

    var precision = Math.pow(10, out.config.coordinatePrecision);

    numeric = parseFloat(numeric);
    if (Number.isNaN(numeric)) {
      // Erroneous geojson
      return 0;
    }

    return Math.round(numeric * precision) / precision;
  }

  function parsePlace(out, geojson) {
    /**
     * Populates out._.place
     * @param {object} out
     * @param {array} geojson
     * @return {object} out
     */

    var place, population, i, j;
    var maxPopulation = 0;

    for (i = 0; i < geojson.length; i += 1) {
      if (typeof geojson[i] === "object" &&
        "features" in geojson[i] &&
        Array.isArray(geojson[i].features)
      ) {
        for (j = 0; j < geojson[i].features.length; j += 1) {
          if (typeof geojson[i].features[j] === "object" &&
            "geometry" in geojson[i].features[j] &&
            typeof geojson[i].features[j].geometry === "object" &&
            "type" in geojson[i].features[j].geometry &&
            (geojson[i].features[j].geometry.type === "MultiPolygon" ||
            geojson[i].features[j].geometry.type === "Polygon") &&
            "coordinates" in geojson[i].features[j].geometry &&
            Array.isArray(geojson[i].features[j].geometry.coordinates)
          ) {

            if (geojson[i].features[j].geometry.type === "Polygon") {
              place = [[geojson[i].features[j].geometry.coordinates], {}];
            } else {
              // MultiPolygon
              place = [geojson[i].features[j].geometry.coordinates, {}];
            }

            if ("properties" in geojson[i].features[j] &&
              typeof geojson[i].features[j].properties === "object" &&
              out.config.populationProperty in geojson[i].features[j].properties &&
              geojson[i].features[j].properties[out.config.populationProperty] !== null
            ) {
              population = parseFloat(geojson[i].features[j].properties[out.config.populationProperty]);
              if (!Number.isNaN(population)) {
                place[1].p = population;
                if (population > maxPopulation) {
                  maxPopulation = population;
                }
              }
            }

            out._.place.push(place);

          }
        }
      }
    }

    if (maxPopulation > 0 &&
      "placeScale" in out.config.option === false
    ) {
      out.config.option.placeScale = Math.round((1 / (maxPopulation / 2e6)) * 1e5) / 1e5;
        // Scaled relative to 2 million maximum. Rounded to 5 decimal places
      if ("option" in out.aquius === false) {
        out.aquius.option = {};
      }
      out.aquius.option.placeScale = out.config.option.placeScale;
    }

    return out;
  }

  function parseNode(out, geojson) {
    /**
     * Populates out._.node
     * @param {object} out
     * @param {array} geojson
     * @return {object} out
     */

     // Future: Integrate i-j loop into parsePlace

    var content, index, key, loop, ref, x, y, i, j, k;

    function withinKeys(properties, reference) {
      // Checks only properties are within reference - reference may contain other keys
      
      // Function via GTFS

      var match, i, j;
      var keys = Object.keys(properties);

      for (i = 0; i < reference.length; i += 1) {
        match = true;
        for (j = 0; j < keys.length; j += 1) {
          if (keys[j] in reference[i] === false ||
            reference[i][keys[j]] !== properties[keys[j]]
          ) {
            match = false;
            break;
          }
        }
        if (match === true) {
          return true;
        }
      }

      return false;
    }

    for (i = 0; i < geojson.length; i += 1) {
      if (typeof geojson[i] === "object" &&
        "features" in geojson[i] &&
        Array.isArray(geojson[i].features)
      ) {
        for (j = 0; j < geojson[i].features.length; j += 1) {
          if (typeof geojson[i].features[j] === "object" &&
            "geometry" in geojson[i].features[j] &&
            typeof geojson[i].features[j].geometry === "object" &&
            "type" in geojson[i].features[j].geometry &&
            geojson[i].features[j].geometry.type === "Point" &&
            "coordinates" in geojson[i].features[j].geometry &&
            Array.isArray(geojson[i].features[j].geometry.coordinates) &&
            geojson[i].features[j].geometry.coordinates.length === 2
          ) {

            x = preciseCoordinate(out, geojson[i].features[j].geometry.coordinates[0]);
            y = preciseCoordinate(out, geojson[i].features[j].geometry.coordinates[1]);
            key = [x, y].join(":");
            if (key in out._.node === false) {
              out._.node[key] = [x, y, {}];
            }

            if ("properties" in geojson[i].features[j] &&
              typeof geojson[i].features[j].properties === "object"
            ) {
              ref = [];
              loop = ["nodeNameProperty", "nodeCodeProperty"];
                // Name first
              for (k = 0; k< loop.length; k += 1) {
                if (out.config[loop[k]] in geojson[i].features[j].properties &&
                  geojson[i].features[j].properties[out.config[loop[k]]] !== null
                ) {
                  content = geojson[i].features[j].properties[out.config[loop[k]]].trim();
                  if (content !== "") {
                    ref.push({"n": content});
                  }
                }
              }

              if (ref.length > 0 &&
                out.config.nodeUrlProperty in geojson[i].features[j].properties &&
                geojson[i].features[j].properties[out.config.nodeUrlProperty] !== null
              ) {
                content = geojson[i].features[j].properties[out.config.nodeUrlProperty].trim();
                if (content !== "") {
                  // Future: No url wildcards yet
                  if ("reference" in out.aquius === false) {
                    out.aquius.reference = {};
                  }
                  if ("url" in out.aquius.reference === false) {
                    out.aquius.reference.url = [];
                  }
                  index = out.aquius.reference.url.indexOf(content);
                  if (index === -1) {
                    out.aquius.reference.url.push(content);
                    // Unused nodes may clutter reference.url slightly, since use unknown at this stage
                    index = out.aquius.reference.url.length - 1;
                  }
                  ref[0].u = index;
                }
              }

              if (ref.length > 0) {
                if ("r" in out._.node[key][2]) {
                  for (k = 0; k< ref.length; k += 1) {
                    if (withinKeys(ref[k], out._.node[key][2].r) === false) {
                      out._.node[key][2].r.push(ref);
                    }
                  }
                } else {
                  out._.node[key][2].r = ref;
                }
              }
            }

          }
        }
      }
    }

    return out;
  }


  function buildLink(out, geojson) {
    /**
     * Main loop, building aquius.link and triggerng node/place additions
     * @param {object} out
     * @param {array} geojson
     * @return {object} out
     */

    var content, coordinate, index, key, link, loop, node, property, x, y, i, j, k, l;

    function numericArray(raw) {

      var numeric, i;
      var numericArray = [];
      var stringArray = raw.toString().split(",");
      for (i = 0; i < stringArray.length; i += 1) {
        numeric = parseFloat(stringArray[i]);
        if (Number.isNaN(numeric)) {
          // Erroneous
          numeric = 0;
        }
        numericArray.push(numeric);
      }

      return numericArray;
    }

    for (i = 0; i < geojson.length; i += 1) {
      if (typeof geojson[i] === "object" &&
        "features" in geojson[i] &&
        Array.isArray(geojson[i].features)
      ) {
        for (j = 0; j < geojson[i].features.length; j += 1) {
          if (typeof geojson[i].features[j] === "object" &&
            "geometry" in geojson[i].features[j] &&
            typeof geojson[i].features[j].geometry === "object" &&
            "type" in geojson[i].features[j].geometry &&
            (geojson[i].features[j].geometry.type === "MultiLineString" ||
            geojson[i].features[j].geometry.type === "LineString") &&
            "coordinates" in geojson[i].features[j].geometry
          ) {
            // In short, links require line geometry and service

            node = [];
            if (geojson[i].features[j].geometry.type === "LineString") {
              coordinate = [geojson[i].features[j].geometry.coordinates];
            } else {
              // MultiLineString
              coordinate = geojson[i].features[j].geometry.coordinates;
            }

            for (k = 0; k < coordinate.length; k += 1) {
              if (Array.isArray(coordinate[k])) {
                for (l = 0; l < coordinate[k].length; l += 1) {
                   if (Array.isArray(coordinate[k][l]) &&
                     coordinate[k][l].length === 2
                   ) {

                    x = preciseCoordinate(out, coordinate[k][l][0]);
                    y = preciseCoordinate(out, coordinate[k][l][1]);
                    key = [x, y].join(":");
                    if (key in out._.nodeLookup) {
                      if (node.length === 0 ||
                        out._.nodeLookup[key] !== node[node.length - 1]
                      ) {
                        node.push(out._.nodeLookup[key]);
                      }
                    } else {
                      if (key in out._.nodeIgnore === false) {
                        out = addNode(out, x, y);
                        if (key in out._.nodeLookup &&
                          (node.length === 0 ||
                          out._.nodeLookup[key] !== node[node.length - 1])
                        ) {
                          node.push(out._.nodeLookup[key]);
                        }
                      }
                    }

                  }
                }
              }
            }
            
            if (node.length > 1) {
              // At least a pair of nodes
              link = [];
              property = {};

              if ("properties" in geojson[i].features[j] &&
                typeof geojson[i].features[j].properties === "object"
              ) {

                loop = [["circularProperty", "c"], ["directionProperty", "d"]];
                  // Booleans
                for (k = 0; k < loop.length; k += 1) {
                  if (out.config[loop[k][0]] in geojson[i].features[j].properties &&
                    geojson[i].features[j].properties[out.config[loop[k][0]]] == 1
                  ) {
                    // == also captures "1" and true
                    property[loop[k][1]] = 1;
                  }
                }

                loop = [["blockProperty", "b"], ["sharedProperty", "h"]];
                  // Integers
                for (k = 0; k < loop.length; k += 1) {
                  if (out.config[loop[k][0]] in geojson[i].features[j].properties) {
                    content = parseInt(geojson[i].features[j].properties[out.config[loop[k][0]]], 10);
                    if (!Number.isNaN(content)) {
                      property[loop[k][1]] = content;
                    }
                  }
                }

                if (out.config.linkNameProperty in geojson[i].features[j].properties &&
                  geojson[i].features[j].properties[out.config.linkNameProperty] !== null
                ) {
                  content = geojson[i].features[j].properties[out.config.linkNameProperty].trim();
                  if (content !== "") {
                    if ("r" in property === false) {
                      property.r = [{}];
                    }
                    property.r[0].n = content;
                  }
                }

                loop = [["colorProperty", "c"], ["textColorProperty", "t"]];
                  // Colors
                for (k = 0; k < loop.length; k += 1) {
                  if (out.config[loop[k][0]] in geojson[i].features[j].properties &&
                    geojson[i].features[j].properties[out.config[loop[k][0]]] !== null
                  ) {
                    content = geojson[i].features[j].properties[out.config[loop[k][0]]].trim();
                    if (content.length === 6) {
                      if ("reference" in out.aquius === false) {
                        out.aquius.reference = {};
                      }
                      if ("color" in out.aquius.reference === false) {
                        out.aquius.reference.color = [];
                      }
                      content = "#" + content;
                      index = out.aquius.reference.color.indexOf(content);
                      if (index === -1) {
                        out.aquius.reference.color.push(content);
                        index = out.aquius.reference.color.length - 1;
                      }
                      if ("r" in property === false) {
                        property.r = [{}];
                      }
                      property.r[0][loop[k][1]] = index;
                    }
                  }
                }

                if (out.config.linkUrlProperty in geojson[i].features[j].properties &&
                  geojson[i].features[j].properties[out.config.linkUrlProperty] !== null
                ) {
                  content = geojson[i].features[j].properties[out.config.linkUrlProperty].trim();
                  if (content !== "") {
                    // Future: No url wildcards yet
                    if ("reference" in out.aquius === false) {
                      out.aquius.reference = {};
                    }
                    if ("url" in out.aquius.reference === false) {
                      out.aquius.reference.url = [];
                    }
                    index = out.aquius.reference.url.indexOf(content);
                    if (index === -1) {
                      out.aquius.reference.url.push(content);
                      // Unused nodes may clutter reference.url slightly, since use unknown at this stage
                      index = out.aquius.reference.url.length - 1;
                    }
                    if ("r" in property === false) {
                      property.r = [{}];
                    }
                    property.r[0].u = index;
                  }
                }
                // Future: Pickup, setdown, split support:
                // Referencing index in own node sequence hard to build manually

                if (out.config.productProperty in geojson[i].features[j].properties) {
                link.push(numericArray(geojson[i].features[j].properties[out.config.productProperty]));
                } else {
                  link.push([0]);
                  // Dummy product
                }

                if (out.config.serviceProperty in geojson[i].features[j].properties &&
                  geojson[i].features[j].properties[out.config.serviceProperty] !== null &&
                  geojson[i].features[j].properties[out.config.serviceProperty] !== ""
                ) {
                  link.push(numericArray(geojson[i].features[j].properties[out.config.serviceProperty]));
                } else {
                  link.push([1]);
                  // Dummy service count
                }

              } else {
                // Dummy product and service
                link.push([0]);
                link.push([1]);
              }

              link.push(node);
              link.push(property);
              if ("link" in out.aquius === false) {
                out.aquius.link = [];
              }
              out.aquius.link.push(link);

            }

          }
        }
      }
    }
    
    if ("node" in out.aquius &&
      out.aquius.node.length > 0
    ) {

      if ("option" in out.aquius === false) {
        out.aquius.option = {};
      }

      if ("c" in out.config.option === false ||
        "k" in out.config.option === false
      ) {
        // Focus on first node - often arbitrary, but should render something
        out.config.option.c = out.aquius.node[0][0];
        out.config.option.k = out.aquius.node[0][1];
        out.config.option.m = 12;
        out.aquius.option.c = out.config.option.c;
        out.aquius.option.k = out.config.option.k;
        out.aquius.option.m = out.config.option.m;
      }

      if ("x" in out.config.option === false ||
        "y" in out.config.option === false
      ) {
        out.config.option.x = out.aquius.node[0][0];
        out.config.option.y = out.aquius.node[0][1];
        out.config.option.z = 10;
        out.aquius.option.x = out.config.option.x;
        out.aquius.option.y = out.config.option.y;
        out.aquius.option.z = out.config.option.z;
      }

    }

    return out;
  }

  function inBoundary(out, x, y) {
    /**
     * Finds the place boundary node x,y are within
     * @param {object} out
     * @param {float} x - coordinate longitude
     * @param {float} y - coordinate latitude
     * @return {integer} index of out._.place if within boundary, else -1
     */

    var i, j;

    function isPointInPolygon(x, y, polygonArray) {

      var inside, intersect, xj, xk, yj, yk, i, j, k;

      if (Array.isArray(polygonArray)) {
        for (i = 0; i < polygonArray.length; i += 1) {
          if (Array.isArray(polygonArray[i])) {

            // Via https://github.com/substack/point-in-polygon
            // From http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
            inside = false;
            for (j = 0, k = polygonArray[i].length - 1;
              j < polygonArray[i].length; k = j++) {

              xj = polygonArray[i][j][0];
              yj = polygonArray[i][j][1];
              xk = polygonArray[i][k][0];
              yk = polygonArray[i][k][1];

              intersect = ((yj > y) != (yk > y)) && (x < (xk - xj) * (y - yj) / (yk - yj) + xj);
              if (intersect) {
                inside = !inside;
              }

            }
            if (inside) {
              return true;
            }
          }
        }
      }

      return false;
    }

    if (out._.placeLast !== -1) {
      // Last place often the next place, so speeds search to check first
      for (j = 0; j < out._.place[out._.placeLast][0].length; j += 1) {
        if (isPointInPolygon(x, y, out._.place[out._.placeLast][0][j])) {
          return out._.placeLast;
        }
      }
    }

    for (i = 0; i < out._.place.length; i += 1) {
      if (i !== out._.placeLast &&
        Array.isArray(out._.place[i][0])
      ) {
        for (j = 0; j < out._.place[i][0].length; j += 1) {
          if (isPointInPolygon(x, y, out._.place[i][0][j])) {
            return i;
          }
        }
      }
    }

    return -1;
  }

  function addNode(out, x, y) {
    /**
     * Adds new node and associated place to out.aquius
     * @param {object} out
     * @param {float} x - node coordinate longitude
     * @param {float} y - node coordinate latitude
     * @return {object} out
     */

    var bounds, inPlace, key, i;

    function getCentroidFromPolygon(polygonArray, bounds) {
      // Function from GTFS

      var i, j;

      if (Array.isArray(polygonArray)) {
          for (i = 0; i < polygonArray.length; i += 1) {
            if (Array.isArray(polygonArray[i])) {
              for (j = 0; j < polygonArray[i].length; j += 1) {
                if (Array.isArray(polygonArray[i][j]) &&
                  polygonArray[i][j].length === 2
                ) {

                  if ("maxX" in bounds === false) {
                    // First entry
                    bounds.maxX = polygonArray[i][j][0];
                    bounds.minX = polygonArray[i][j][0];
                    bounds.maxY = polygonArray[i][j][1];
                    bounds.minY = polygonArray[i][j][1];
                  } else {

                    if (polygonArray[i][j][0] > bounds.maxX) {
                      bounds.maxX = polygonArray[i][j][0];
                    } else {
                      if (polygonArray[i][j][0] < bounds.minX) {
                        bounds.minX = polygonArray[i][j][0];
                      }
                    }
                    if (polygonArray[i][j][1] > bounds.maxY) {
                      bounds.maxY = polygonArray[i][j][1];
                    } else {
                      if (polygonArray[i][j][1] < bounds.minY) {
                        bounds.minY = polygonArray[i][j][1];
                      }
                    }

                  }

                }
              }
            }
          }
        }

      return bounds;
    }

    inPlace = inBoundary(out, x, y);

    if (inPlace !== -1 &&
      inPlace in out._.placeLookup === false
    ) {
      // Add aquius.place
      bounds = {};
      for (i = 0; i < out._.place[inPlace][0].length; i += 1) {
        bounds = getCentroidFromPolygon(out._.place[inPlace][0][i], bounds);
      }
      if ("maxX" in bounds) {
        if ("place" in out.aquius === false) {
          out.aquius.place = [];
        }
        out.aquius.place.push([
          preciseCoordinate(out, (bounds.maxX + bounds.minX) / 2),
          preciseCoordinate(out, (bounds.maxY + bounds.minY) / 2),
          out._.place[inPlace][1]
        ]);
        out._.placeLookup[inPlace] = out.aquius.place.length - 1;
        out._.placeLast = inPlace;
      }
    }

    key = [x, y].join(":");

    if (out._.place.length === 0 ||
      inPlace !== -1 ||
      out.configinGeojson === false
    ) {
      // Add node
      if (inPlace !== -1) {
        out._.node[key][2].p = out._.placeLookup[inPlace];
      }
      if ("node" in out.aquius === false) {
        out.aquius.node = [];
      }
      if (key in out._.node) {
        out.aquius.node.push(out._.node[key]);
      } else {
        out.aquius.node.push([x, y, {}]);
          // Node may be defined only by line geometry, but has no associated data
      }
      out._.nodeLookup[key] = out.aquius.node.length - 1;
    } else {
      out._.nodeIgnore[key] = "";
    }

    return out;
  }

  function exitProcess(out, options) {
    /**
     * Called to exit
     * @param {object} out
     * @param {object} options
     */

    var error;

    delete out._;

    if (typeof options === "object" &&
      "callback" in options
    ) {
      if ("error" in out) {
        error = new Error(out.error.join(". "));
      }
      options.callback(error, out, options);
      return true;
    } else {
      return out;
    }
  }

  if (!Array.isArray(geojson)) {
    geojson = [geojson];
  }
  
  out = parseConfig(out, options);
  out = buildHead(out);
  out = parsePlace(out, geojson);
  out = parseNode(out, geojson);
  out = buildLink(out, geojson);

  return exitProcess(out, options);
}

};
// EoF
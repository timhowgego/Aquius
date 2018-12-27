/*eslint-env browser*/
/*global aquius*/

var mergeAquius = mergeAquius || {
/**
 * @namespace Merge Aquius
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
  
  function initialiseMerge(vars) {
    /**
     * Initiates JSON file import and Aquius creation
     * @param {object} vars - internal data references
     */

    var reader;
    var loaded = [];
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var options = {
      "_vars": vars,
      "callback": outputMerge
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

      var input, json, i;

      try {
        json = JSON.parse(result);
        if (typeof json === "object") {
          if (filename.toLowerCase() === "config.json") {
            options.config = json;
          } else {
            if ("meta" in json &&
              "schema" in json.meta &&
              "link" in json &&
              "node" in json
            ) {
              // Config may also have meta/schema. Link/node in practice required of datasets
              loaded.push([filename, json]);
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
        loaded.sort();
          // Sort by filename after load since load order unpredictable
        input = [];
        for (i = 0; i < loaded.length; i += 1) {
          input.push(loaded[i][1]);
        }
        vars.merge(input, options);
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

  function outputMerge(error, out, options) {
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
    "merge": this.merge
    },
    initialiseMerge,
    "Aquius files and optional config to process:");
},


"merge": function merge(input, options) {
  /**
   * Creates single Aquius dataObject from array of aquius JSON objects
   * @param {array} input - array of Aquius JSON objects
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

  function parseConfig(out, options) {
    /**
     * Parse options.config into valid out.config. Defines defaults
     * @param {object} out - internal data references
     * @param {object} options
     * @return {object} out
     */

    var i;
    var defaults = {
      "coordinatePrecision": 5,
        // Coordinate decimal places (smaller values tend to group clusters of stops)
      "meta": {},
        // As Data Structure meta key
      "option": {},
        // As Data Structure/Configuration option key
      "translation": {}
        // As Data Structure/Configuration translation key
    };
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

  function mergePropertyObject(original, addition, appendString) {
    /** Helper: Merge objects (in style {"en-US":"translation"})
     * @param {object} original
     * @param {object} addition
     * @param {boolean} appendString - join with | if duplicate string values differ
     * @return {object} original
     */

    var i;
    var keys = Object.keys(addition);
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in original) {
        if (original[keys[i]] !== addition[keys[i]] &&
          typeof appendString !== "undefined" &&
          appendString === true &&
          typeof original[keys[i]] === "string" &&
          typeof addition[keys[i]] === "string"
        ) {
          original[keys[i]] += " | " + addition[keys[i]];
        }
      } else {
        original[keys[i]] = addition[keys[i]];
      }
    }

    return original;
  }

  function coreLoop(out, input) {
    /**
     * Primary loop through Aquius dataObjects, adding to single out.aquius
     * @param {object} out
     * @param {array} input
     * @return {object} out
     */

    var i;

    out.aquius.meta = out.config.meta;
    out.aquius.meta.schema = "0";
      // Merged files are currently always forced "0"
    if (Object.keys(out.config.option).length > 0) {
      out.aquius.option = out.config.option;
    }
    if (Object.keys(out.config.translation).length > 0) {
      out.aquius.translation = out.config.translation;
    }

    out._.blockNext = 0;
      // Next unassigned block ID
    out._.blockSwitch = {};
      // InputIndex:{OldBlockID:NewBlockID} (link property)
    out._.colorSwitch = {};
      // InputIndex:{OldColorIndex:NewColorIndex} (reference color)
    out._.linkLookup = {};
      // key nodes:etc : link index
    out._.nodeLookup = {};
      // X:Y key: aquius.node index
    out._.nodeSwitch = {};
      // InputIndex:{OldNodeIndex:NewNodeIndex}
    out._.placeLookup = {};
      // X:Y key: aquius.place index
    out._.placeSwitch = {};
      // InputIndex:{OldPlaceIndex:NewPlaceIndex}
    out._.productNext = 0;
      // Next unassigned product ID
    out._.productSwitch = {};
      // InputIndex:{OldProductID:NewProductID}
    out._.serviceLookup = {};
      // Services:Indices key: aquius.service index
    out._.urlSwitch = {};
      // InputIndex:{OldUrlIndex:NewUrlIndex} (reference url)

    for (i = 0; i < input.length; i += 1) {
      // Core Loop
      if (typeof input[i] === "object") {
        out = buildMeta(out, input[i]);
        out = buildOption(out, input[i]);
        out = buildTranslation(out, input[i]);
        out = buildService(out, input[i]);
        out = buildLink(out, input[i], i);
      }
    }

    for (i = 0; i < input.length; i += 1) {
      // And Finally Loop
      if (typeof input[i] === "object") {
        out = buildNetwork(out, input[i], i);
      }
    }

    out.aquius.link.sort(function (a, b) {
      return b[1].reduce(function(c, d) {
        return c + d;
      }, 0) - a[1].reduce(function(c, d) {
        return c + d;
      }, 0);
    });
      // Descending service count, since busiest most likely to be queried and thus found faster
    out = optimiseNode(out);

    return out;
  }

  function buildMeta(out, dataObject) {
    /**
     * Creates aquius.meta
     * @param {object} out
     * @param {object} dataObject
     * @return {object} out
     */

    var keys, i;

    keys = ["attribution", "description", "name", "url"];
    for (i = 0; i < keys.length; i += 1) {
      if (("meta" in out.aquius === false ||
        keys[i] in out.aquius.meta === false) &&
        "meta" in dataObject &&
        typeof dataObject.meta === "object" &&
        keys[i] in dataObject.meta
      ) {
        if ("meta" in out.aquius === false) {
          out.aquius.meta = {};
        }
        // First found only: Resolve conflicts with config.meta...
        out.aquius.meta[keys[i]] = dataObject.meta[keys[i]];
      }
    }

    return out;
  }

  function buildOption(out, dataObject) {
    /**
     * Creates aquius.option
     * @param {object} out
     * @param {object} dataObject
     * @return {object} out
     */

    var keys, i;

    if ("option" in dataObject &&
      typeof dataObject.option === "object"
    ) {
      keys = Object.keys(dataObject.option);
      if (keys.length > 0) {
        if ("option" in out.aquius === false) {
          out.aquius.option = {};
        }
        for (i = 0; i < keys.length; i += 1) {
          if (keys[i] in out.aquius.option === false) {
            // First option found only since most cannot be sensibly merged: Resolve conflicts with config.option
            out.aquius.option[keys[i]] = dataObject.option[keys[i]];
          }
        }
      }
    }

    return out;
  }

  function buildTranslation(out, dataObject) {
    /**
     * Creates aquius.translation
     * @param {object} out
     * @param {object} dataObject
     * @return {object} out
     */

    var keys, i;

    if ("translation" in dataObject &&
      typeof dataObject.translation === "object"
    ) {
      keys = Object.keys(dataObject.translation);
      if (keys.length > 0) {
        if ("translation" in out.aquius === false) {
          out.aquius.translation = {};
        }
        for (i = 0; i < keys.length; i += 1) {
          if (keys[i] in out.aquius.translation) {
            out.aquius.translation[keys[i]] =
              mergePropertyObject(out.aquius.translation[keys[i]], dataObject.translation[keys[i]]);
          } else {
            out.aquius.translation[keys[i]] = dataObject.translation[keys[i]];
          }
        }
      }
    }

    return out;
  }

  function buildService(out, dataObject) {
    /**
     * Creates aquius.service. Cannot alter or understand actual service indices,
     *   thus supposes consistency of service indices within the files merged.
     *   Future: Same name check and extension/repositioning of link[1] data
     * @param {object} out
     * @param {object} dataObject
     * @return {object} out
     */

    var key, i;

    if ("service" in dataObject &&
      Array.isArray(dataObject.service) &&
      dataObject.service.length > 0
    ) {
      if ("service" in out.aquius === false) {
        out.aquius.service = [];
      }
      for (i = 0; i < dataObject.service.length; i += 1) {
        if (Array.isArray(dataObject.service[i]) &&
          dataObject.service[i].length >= 2 &&
          Array.isArray(dataObject.service[i][0]) &&
          typeof dataObject.service[i][1] === "object"
        ) {

          key = dataObject.service[i][0].join(":");
          if (key in out._.serviceLookup) {
            out.aquius.service[out._.serviceLookup[key]][1] =
              mergePropertyObject(out.aquius.service[out._.serviceLookup[key]][1],
              dataObject.service[i][1], true);
            if (dataObject.service[i].length > 2 &&
              typeof dataObject.service[i][2] === "object"
            ) {
              if (out.aquius.service[out._.serviceLookup[key]].length > 2) {
                out.aquius.service[out._.serviceLookup[key]][2] =
                  mergePropertyObject(out.aquius.service[out._.serviceLookup[key]][2],
                  dataObject.service[i][2]);
              } else {
                out.aquius.service[out._.serviceLookup[key]][2] = dataObject.service[i][2];
              }
            }
          } else {
            out.aquius.service.push(dataObject.service[i]);
            out._.serviceLookup[key] = out.aquius.service.length - 1;
          }

        }
      }
     }

     return out;
  }

  function buildLink(out, dataObject, iteration) {
    /**
     * Creates aquius.link, and indirectly place and node
     * @param {object} out
     * @param {object} dataObject
     * @param {interger} iteration - original dataset referenced by index
     * @return {object} out
     */

    var key, keys, match, node, product, property, reference, i, j, k, l, m;

    if ("link" in dataObject &&
      Array.isArray(dataObject.link) &&
      dataObject.link.length > 0
    ) {
      if ("link" in out.aquius === false) {
        out.aquius.link = [];
      }
      for (i = 0; i < dataObject.link.length; i += 1) {
        if (dataObject.link[i].length > 3 &&
          Array.isArray(dataObject.link[i][0]) &&
          Array.isArray(dataObject.link[i][1]) &&
          Array.isArray(dataObject.link[i][2]) &&
          typeof dataObject.link[i][3] === "object"
        ) {

          product = parseProduct(out, dataObject, dataObject.link[i][0], iteration);
          out = product.out;
          node = parseNode(out, dataObject, dataObject.link[i][2], iteration);
          out = node.out;
          property = parseLinkProperty(out, dataObject, dataObject.link[i][3], iteration);
          out = property.out;

          // Exact matches, including same product and direction, will merge
          // Further evaluation is marginal and may introduce unwanted aggregation
          key = "p" + product.product.join(":") + "n" + node.node.join(":");

          keys = ["b", "block", "d", "direction"];
            // Optional variables
          for (j = 0; j < keys.length; j += 1) {
            if (keys[j] in property.property) {
              key += j + property.property[keys[j]];
            }
          }

          keys = ["h", "shared", "pickup", "s", "setdown", "split", "t", "u"];
            // Optional arrays
          for (j = 0; j < keys.length; j += 1) {
            if (keys[j] in property.property) {
              key += j + property.property[keys[j]].join(":");
            }
          }

          if (key in out._.linkLookup) {

            for (j = 0; j < out.aquius.link[out._.linkLookup[key]][1].length; j += 1) {
              if (dataObject.link[i][1][j] !== undefined &&
                dataObject.link[i][1][j] > 0
              ) {
                // Update service
                out.aquius.link[out._.linkLookup[key]][1][j] =
                  out.aquius.link[out._.linkLookup[key]][1][j] + dataObject.link[i][1][j];
              }
            }

            keys = ["r", "reference"];
            for (j = 0; j < keys.length; j += 1) {
              if (keys[j] in property.property) {
                if ("r" in out.aquius.link[out._.linkLookup[key]][3] ||
                  "reference" in  out.aquius.link[out._.linkLookup[key]][3]
                ) {
                  for (k = 0; k < property.property[keys[j]].length; k += 1) {

                    // Merge each reference if missing
                    match = false;
                    reference = Object.keys(property.property[keys[j]][k]);
                    for (l = 0; l < out.aquius.link[out._.linkLookup[key]][3][keys[j]].length; l += 1) {
                      for (m = 0; m < reference.length; m += 1) {
                        if (reference[m] in out.aquius.link[out._.linkLookup[key]][3][keys[j]][l] &&
                          property.property[keys[j]][k][reference[m]] ===
                            out.aquius.link[out._.linkLookup[key]][3][keys[j]][l][reference[m]]
                        ) {
                          match = true;
                          break;
                        }
                      }
                      if (match) {
                        break;
                      }
                    }
                    if (match === false) {
                      out.aquius.link[out._.linkLookup[key]][3][keys[j]].push(property.property[keys[j]][k]);
                    }

                  }
                } else {
                  // New reference
                  out.aquius.link[out._.linkLookup[key]][3][keys[j]] = property.property[keys[j]];
                }

              }
            }

          } else {

            out.aquius.link.push([
              product.product,
              dataObject.link[i][1],
              node.node,
              property.property
            ]);
            out._.linkLookup[key] = out.aquius.link.length - 1;

          }

        }
      }
    }

    return out;
  }

  function parseProduct(out, dataObject, productArray, iteration) {
    /**
     * Reassigns product IDs
     * @param {object} out
     * @param {object} dataObject
     * @param {array} productArray
     * @param {interger} iteration - original dataset referenced by index
     * @return {object} {out, product}
     */

    var i;

    for (i = 0; i < productArray.length; i += 1) {
      
      if (iteration in out._.productSwitch === false) {
        out._.productSwitch[iteration] = {};
      }
      if (productArray[i] in out._.productSwitch[iteration] === false) {
        out = addProduct(out, dataObject, iteration, productArray[i]);
      }
      productArray[i] = out._.productSwitch[iteration][productArray[i]];
        // Each original dataset takes unique product IDs
    }

    return {
      "out": out,
      "product": productArray
    };
  }

  function parseNode(out, dataObject, nodeArray, iteration) {
    /**
     * Reassigns node IDs while building aquius.node and aquius.place
     * @param {object} out
     * @param {object} dataObject
     * @param {array} nodeArray
     * @param {interger} iteration - original dataset referenced by index
     * @return {object} {out, node}
     */

    var newNode, i;
    var node = [];

    for (i = 0; i < nodeArray.length; i += 1) {
      if (iteration in out._.nodeSwitch === false ||
        nodeArray[i] in out._.nodeSwitch[iteration] === false
      ) {
        out = addNode(out, dataObject, nodeArray[i], iteration);
      }
      if (iteration in out._.nodeSwitch &&
        nodeArray[i] in out._.nodeSwitch[iteration]
      ) {
        newNode = out._.nodeSwitch[iteration][nodeArray[i]];
        if (node.length === 0 ||
          node[node.length - 1] !== newNode
        ) {
          // Unwanted in-order duplicates may emerge from coordinatePrecision changes
          node.push(newNode);
        }
      }
    }

    return {
      "out": out,
      "node": node
    };
  }

  function addNode(out, dataObject, originalNode, iteration) {
    /**
     * Processes node and associated references into aquius.node, referenced in out._.nodeSwitch/Lookup
     * @param {object} out
     * @param {object} dataObject
     * @param {integer} originalNode
     * @param {interger} iteration - original dataset referenced by index
     * @return {object} out
     */

    // Functions shared with gtfsToAquius: withinKeys

    var index, key, keys, place, property, x, y, i, j;

    function withinKeys(properties, reference) {
      // Checks only properties are within reference - reference may contain other keys

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

    if ("node" in dataObject &&
      Array.isArray(dataObject.node) &&
      dataObject.node[originalNode] !== undefined &&
      dataObject.node[originalNode].length >= 3 &&
      typeof dataObject.node[originalNode][0] === "number" &&
      typeof dataObject.node[originalNode][1] === "number" &&
      typeof dataObject.node[originalNode][2] === "object"
    ) {

      x = preciseCoordinate(out, dataObject.node[originalNode][0]);
      y = preciseCoordinate(out, dataObject.node[originalNode][1]);
      key = [x,y].join(":");
      if (key in out._.nodeLookup) {
        index = out._.nodeLookup[key];
      } else {
        // Add node
        if ("node" in out.aquius === false) {
          out.aquius.node = [];
        }
        out.aquius.node.push([x, y, {}]);
        index = out.aquius.node.length - 1;
        out._.nodeLookup[key] = index;
      }
      if (iteration in out._.nodeSwitch === false) {
        out._.nodeSwitch[iteration] = {};
      }
      out._.nodeSwitch[iteration][originalNode] = index;

      property = dataObject.node[originalNode][2];
      keys = Object.keys(property);

      for (i = 0; i < keys.length; i += 1) {
        switch (keys[i]) {

          case "r":
          case "reference":
            if (Array.isArray(property[keys[i]]) &&
              property[keys[i]].length > 0
            ) {
              if (keys[i] in out.aquius.node[index][2] === false) {
                out.aquius.node[index][2][keys[i]] = [];
              }
              for (j = 0; j < property[keys[i]].length; j += 1) {
                if (typeof property[keys[i]][j] === "object" &&
                  "u" in property[keys[i]][j]
                ) {
                  // Only URL reassigned, other references copied blindly
                  if (iteration in out._.urlSwitch === false ||
                    property[keys[i]][j].u in out._.urlSwitch[iteration] === false
                  ) {
                    out = addReference(out, dataObject, property[keys[i]][j].u, iteration, "url");
                  }
                  if (iteration in out._.urlSwitch &&
                    property[keys[i]][j].u in out._.urlSwitch[iteration]
                  ) {
                    property[keys[i]][j].u = out._.urlSwitch[iteration][property[keys[i]][j].u];
                  }
                }
                if (!withinKeys(property[keys[i]][j], out.aquius.node[index][2][keys[i]])) {
                  out.aquius.node[index][2][keys[i]].push(property[keys[i]][j]);
                }
              }
            }
            break;

          case "p":
          case "place":
            if (keys[i] in out.aquius.node[index][2]) {
              // Node can only be in one place
              if ("place" in dataObject &&
                Array.isArray(dataObject.place) &&
                dataObject.place[property[keys[i]]] !== undefined &&
                Array.isArray(dataObject.place[place]) &&
                dataObject.place[property[keys[i]]].length >= 3 &&
                typeof dataObject.place[property[keys[i]]][2] === "object"
              ) {
                place = Object.keys(dataObject.place[property[keys[i]]][2]);
                for (j = 0; j < place.length; j += 1) {
                  if (place[j] in out.aquius.place[out.aquius.node[index][2][keys[i]]] === false) {
                    // Add extra property, else ignore
                    out.aquius.place[out.aquius.node[index][2][keys[i]]][place[j]] =
                      dataObject.place[property[keys[i]]][2][place[j]];
                  }
                }
              }
            } else {
              if (iteration in out._.placeSwitch === false ||
                property[keys[i]] in out._.placeSwitch[iteration] === false
              ) {
                out = addPlace(out, dataObject, property[keys[i]], iteration);
              }
              if (iteration in out._.placeSwitch &&
                property[keys[i]] in out._.placeSwitch[iteration]
              ) {
                out.aquius.node[index][2][keys[i]] =
                  out._.placeSwitch[iteration][property[keys[i]]];
              }
            }
            break;

          default:
            if (keys[i] in out.aquius.node[index][2] === false) {
              // Add mystery key if not present at node. Else ignore, with no understanding of how to handle
              out.aquius.node[index][2][keys[i]] = property[keys[i]];
            }
            break;

        }
      }

    }

    return out;
  }

  function preciseCoordinate(out, numeric) {
    /**
     * Helper: Standardise precision of x or y coordinate
     * @param {object} out
     * @param {number} numeric - x or y coordinate
     * @return {numver} numeric
     */

    var precision = Math.pow(10, out.config.coordinatePrecision);

    return Math.round(parseFloat(numeric) * precision) / precision;
  }

  function addPlace(out, dataObject, originalPlace, iteration) {
    /**
     * Processes places into aquius.place, referenced in out._.placeSwitch/Lookup
     * @param {object} out
     * @param {object} dataObject
     * @param {integer} originalPlace
     * @param {interger} iteration - original dataset referenced by index
     * @return {object} out
     */

    var index, key, keys, x, y, i;

    if ("place" in dataObject &&
      Array.isArray(dataObject.place) &&
      dataObject.place[originalPlace] !== undefined &&
      dataObject.place[originalPlace].length >= 3 &&
      typeof dataObject.place[originalPlace][0] === "number" &&
      typeof dataObject.place[originalPlace][1] === "number" &&
      typeof dataObject.place[originalPlace][2] === "object"
    ) {

      x = preciseCoordinate(out, dataObject.place[originalPlace][0]);
      y = preciseCoordinate(out, dataObject.place[originalPlace][1]);
      key = [x,y].join(":");
      if (key in out._.placeLookup) {
        index = out._.placeLookup[key];
      } else {
        // Add place
        if ("place" in out.aquius === false) {
          out.aquius.place = [];
        }
        out.aquius.place.push([x, y, {}]);
        index = out.aquius.place.length - 1;
        out._.placeLookup[key] = index;
      }
      if (iteration in out._.placeSwitch === false) {
        out._.placeSwitch[iteration] = {};
      }
      out._.placeSwitch[iteration][originalPlace] = index;

      keys = Object.keys(dataObject.place[originalPlace][2]);
      for (i = 0; i < keys.length; i += 1) {
        if (keys[i] in out.aquius.place[index][2] === false) {
          out.aquius.place[index][2][keys[i]] = dataObject.place[originalPlace][2][keys[i]];
        }
      }

    }

    return out;
  }

  function addReference(out, dataObject, originalIndex, iteration, type) {
    /**
     * Processes original color/url reference into aquius.reference.color/url, referenced in out._.color/urlSwitch
     * @param {object} out
     * @param {object} dataObject
     * @param {integer} originalIndex
     * @param {interger} iteration - original dataset referenced by index
     * @param {string} type - "color" or "url"
     * @return {object} out
     */

    var index;

    if ("reference" in dataObject &&
      typeof dataObject.reference === "object" &&
      type in dataObject.reference &&
      Array.isArray(dataObject.reference[type]) &&
      dataObject.reference[type][originalIndex] !== undefined
    ) {
      if ("reference" in out.aquius === false) {
        out.aquius.reference = {};
      }
      if (type in out.aquius.reference === false) {
        out.aquius.reference[type] = [];
      }
      index = out.aquius.reference[type].indexOf(dataObject.reference[type][originalIndex]);
      if (index === -1) {
        // Add new
        out.aquius.reference[type].push(dataObject.reference[type][originalIndex]);
        index = out.aquius.reference[type].length - 1;
      }
      if (iteration in out._[type + "Switch"] === false) {
        out._[type + "Switch"][iteration] = {};
      }
      out._[type + "Switch"][iteration][originalIndex] = index;

    }

    return out;
  }


  function parseLinkProperty(out, dataObject, propertyObject, iteration) {
    /**
     * Parses link properties
     * @param {object} out
     * @param {object} dataObject
     * @param {object} propertyObject
     * @param {interger} iteration - original dataset referenced by index
     * @return {object} {out, node}
     */

    var keys, node, nodeArray, reference, switchKeys, type, i, j, k;

    keys = ["b", "block"];
      // Integer block ID
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in propertyObject) {
        if (iteration in out._.blockSwitch === false) {
          out._.blockSwitch[iteration] = {};
        }
        if (propertyObject[keys[i]] in out._.blockSwitch[iteration] == false) {
          out._.blockSwitch[iteration][propertyObject[keys[i]]] = out._.blockNext;
          out._.blockNext += 1;
        }
        propertyObject[keys[i]] = out._.blockSwitch[iteration][propertyObject[keys[i]]];
          // Cannot fail, simply mirrors original dataset integrity
      }
    }

    keys = ["h", "shared"];
      // Arrays of Product ID
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in propertyObject &&
        Array.isArray(propertyObject[keys[i]])
      ) {
        for (j = 0; j < propertyObject[keys[i]].length; j += 1) {
          if (iteration in out._.productSwitch === false) {
            out._.productSwitch[iteration] = {};
          }
          if (propertyObject[keys[i]][j] === undefined ||
            propertyObject[keys[i]][j] === null
          ) {
            propertyObject[keys[i]][j] = 0;
          }
          if (propertyObject[keys[i]][j] in out._.productSwitch[iteration] === false) {
            out = addProduct(out, dataObject, iteration, propertyObject[keys[i]][j]);
          }
          propertyObject[keys[i]][j] = out._.productSwitch[iteration][propertyObject[keys[i]][j]];
            // Cannot fail, merely create a product ID unused by existing filter
        }
      }
    }

    keys = ["pickup", "s", "setdown", "split", "t", "u"];
      // Arrays of Node ID
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in propertyObject &&
        Array.isArray(propertyObject[keys[i]])
      ) {
        nodeArray = [];
        for (j = 0; j < propertyObject[keys[i]].length; j += 1) {
          if (iteration in out._.nodeSwitch === false ||
            propertyObject[keys[i]][j] in out._.nodeSwitch[iteration] === false
          ) {
            out = addNode(out, dataObject, propertyObject[keys[i]][j], iteration);
          }
          if (iteration in out._.nodeSwitch &&
            propertyObject[keys[i]][j] in out._.nodeSwitch[iteration]
          ) {
            node = out._.nodeSwitch[iteration][propertyObject[keys[i]][j]];
            if (propertyObject[keys[i]].indexOf(node) === -1) {
              // Unwanted duplicates may emerge from coordinatePrecision changes
              nodeArray.push(node);
            }
          }
        }
        if (nodeArray.length > 0) {
          propertyObject[keys[i]] = nodeArray;
        } else {
          // Failed because all nodes somehow missing
          delete propertyObject[keys[i]];
        }
      }
    }

    keys = ["r", "reference"];
      // Reference objects
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in propertyObject &&
        Array.isArray(propertyObject[keys[i]])
      ) {
        switchKeys = ["c", "t", "u"];
        for (j = 0; j < propertyObject[keys[i]].length; j += 1) {
          reference = propertyObject[keys[i]][j];
          for (k = 0; k < switchKeys.length; k += 1) {
            if (switchKeys[k] in reference) {

              if (switchKeys[k] === "u") {
                type = "url";
              } else {
                type = "color";
              }
              if (iteration in out._[type + "Switch"] === false ||
                reference[switchKeys[k]] in out._[type + "Switch"][iteration] === false
              ) {
                out = addReference(out, dataObject, reference[switchKeys[k]], iteration, type);
              }
              if (iteration in out._[type + "Switch"] &&
                reference[switchKeys[k]] in out._[type + "Switch"][iteration]
              ) {
                propertyObject[keys[i]][j][switchKeys[k]] =
                  out._[type + "Switch"][iteration][reference[switchKeys[k]]];
              } else {
                // Failed because reference missing in original dataset, so remove
                delete propertyObject[keys[i]][j][switchKeys[k]];
              }

            }
          }
        }
      }
    }

    return {
      "out": out,
      "property": propertyObject
    };
  }

  function buildNetwork(out, dataObject, iteration) {
    /**
     * Creates aquius.network
     * @param {object} out
     * @param {object} dataObject
     * @param {interger} iteration - original dataset referenced by index
     * @return {object} out
     */

    var index, network, product, i, j;

    function propertyCheck(network, match) {

      var i;

      function compareProperties(a, b) {

        var i;
        var keys = Object.keys(a)

        for (i = 0; i < keys.length; i += 1) {
          if (keys[i] in b === false) {
            return false;
          }
          if (a[keys[i]] !== b[keys[i]]) {
            return false;
          }
        }

        return true;
      }
      
      for (i = 0; i < network.length; i += 1) {
        if (compareProperties(network[i][1], match[1]) &&
          (network[i].length < 3 ||
          match.length < 3 ||
          compareProperties(network[i][2], match[2]))
        ) {
          return i;
        }
      }

      return -1;
    }

    if ("network" in dataObject &&
      Array.isArray(dataObject.network) &&
      dataObject.network.length > 0
    ) {
      if ("network" in out.aquius === false) {
        out.aquius.network = [];
      }

      for (i = 0; i < dataObject.network.length; i += 1) {
        if (Array.isArray(dataObject.network[i]) &&
          dataObject.network[i].length > 2 &&
          Array.isArray(dataObject.network[i][0]) &&
          typeof dataObject.network[i][1] === "object" &&
          typeof dataObject.network[i][2] === "object"
        ) {
          index = propertyCheck(out.aquius.network, dataObject.network[i]);
            // Checks names and extension objects, not filter indices
          if (index !== -1) {
            // Update filter at index
            for (j = 0; j < dataObject.network[i][0].length; j += 1) {
              if (iteration in out._.productSwitch &&
                dataObject.network[i][0][j] in out._.productSwitch[iteration]
              ) {
                product = out._.productSwitch[iteration][dataObject.network[i][0][j]];
                if (out.aquius.network[index][0].indexOf(product) === -1) {
                  out.aquius.network[index][0].push(product);
                }
              }
            }
          } else {
            // New filter
            network = [[], dataObject.network[i][1], dataObject.network[i][2]];
            for (j = 0; j < dataObject.network[i][0].length; j += 1) {
              if (iteration in out._.productSwitch &&
                dataObject.network[i][0][j] in out._.productSwitch[iteration]
              ) {
                network[0].push(out._.productSwitch[iteration][dataObject.network[i][0][j]]);
              }
            }
            out.aquius.network.push(network);
          }
        }
      }
    }

    return out;
  }

  function addProduct(out, dataObject, iteration, product) {
    /**
     * Parses original product into new product. Creates aquius.reference.product
     * @param {object} out
     * @param {object} dataObject
     * @param {interger} iteration - original dataset referenced by index
     * @param {interger} product - original product index
     * @return {object} out
     */

    var keys, match, i, j;
    var newProduct = true;
    var reference = {};

    if ("reference" in out.aquius === false) {
      out.aquius.reference = {};
    }
    if ("product" in out.aquius.reference === false) {
      out.aquius.reference.product = [];
    }

    if ("reference" in dataObject &&
      typeof dataObject.reference === "object" &&
      "product" in dataObject.reference &&
      Array.isArray(dataObject.reference.product) &&
      product >= 0 &&
      product < dataObject.reference.product.length &&
      typeof dataObject.reference.product[product] === "object"
    ) {
      reference = dataObject.reference.product[product];
      keys = Object.keys(dataObject.reference.product[product]);
      for (i = 0; i < out.aquius.reference.product.length; i += 1) {
        match = true;
        for (j = 0; j < keys.length; j += 1) {
          if (keys[j] in out.aquius.reference.product[i] === false ||
            dataObject.reference.product[product][keys[j]] !== out.aquius.reference.product[i][keys[j]]
          ) {
            match = false;
            break;
          }
        }
        if (match) {
          out._.productSwitch[iteration][product] = i;
          newProduct = false;
          break;
        }
      }
    }

    if (newProduct) {
      out._.productSwitch[iteration][product] = out._.productNext;
      out.aquius.reference.product[out._.productNext] = reference;
      out._.productNext += 1;
    }

    return out;
  }

  function optimiseNode(out) {
    /**
     * Assigns most frequently referenced nodes to lowest indices and removes unused nodes
     * @param {object} out
     * @return {object} out
     */

     // Function shared with GTFS

    var keys, newNode, newNodeLookup, nodeArray, i, j;
    var nodeOccurance = {};
      // OldNode: Count of references

    for (i = 0; i < out.aquius.link.length; i += 1) {
      nodeArray = out.aquius.link[i][2];
      if ("u" in out.aquius.link[i][3]) {
        nodeArray = nodeArray.concat(out.aquius.link[i][3].u);
      }
      if ("s" in out.aquius.link[i][3]) {
        nodeArray = nodeArray.concat(out.aquius.link[i][3].s);
      }
      if ("t" in out.aquius.link[i][3]) {
        nodeArray = nodeArray.concat(out.aquius.link[i][3].t);
      }
      for (j = 0; j < nodeArray.length; j += 1) {
        if (nodeArray[j] in nodeOccurance === false) {
          nodeOccurance[nodeArray[j]] = 1;
        } else {
          nodeOccurance[nodeArray[j]] += 1;
        }
      }
    }

    nodeArray = [];
      // Reused, now OldNode by count of occurance
    keys = Object.keys(nodeOccurance);
    for (i = 0; i < keys.length; i += 1) {
      nodeArray.push([keys[i], nodeOccurance[keys[i]]]);
    }
    nodeArray.sort(function(a, b) {
      return a[1] - b[1];
    });
    nodeArray.reverse();

    newNode = [];
      // As aquius.node
    newNodeLookup = {};
      // OldNodeIndex: NewNodeIndex
    for (i = 0; i < nodeArray.length; i += 1) {
      newNode.push(out.aquius.node[nodeArray[i][0]]);
      newNodeLookup[nodeArray[i][0]] = i;
    }
    out.aquius.node = newNode;

    for (i = 0; i < out.aquius.link.length; i += 1) {
      for (j = 0; j < out.aquius.link[i][2].length; j += 1) {
        out.aquius.link[i][2][j] = newNodeLookup[out.aquius.link[i][2][j]];
      }
      if ("u" in out.aquius.link[i][3]) {
        for (j = 0; j < out.aquius.link[i][3].u.length; j += 1) {
          out.aquius.link[i][3].u[j] = newNodeLookup[out.aquius.link[i][3].u[j]];
        }
      }
      if ("s" in out.aquius.link[i][3]) {
        for (j = 0; j < out.aquius.link[i][3].s.length; j += 1) {
          out.aquius.link[i][3].s[j] = newNodeLookup[out.aquius.link[i][3].s[j]];
        }
      }
      if ("t" in out.aquius.link[i][3]) {
        for (j = 0; j < out.aquius.link[i][3].t.length; j += 1) {
          out.aquius.link[i][3].t[j] = newNodeLookup[out.aquius.link[i][3].t[j]];
        }
      }
    }

    return out;
  }

  function exitMerge(out, options) {
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

  out = parseConfig(out, options);
  out = coreLoop(out, input);

  return exitMerge(out, options);
}

};
// EoF
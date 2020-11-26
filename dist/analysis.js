/*eslint-env browser*/
/*global aquius*/


var aquiusPlace = aquiusPlace || {
/**
 * @namespace Aquius Place
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

  function initialiseUI(vars, loadFunction, prompt, multiple) {
    /**
     * Creates user interface in its initial state
     * @param {object} vars - internal data references (including configId)
     * @param {object} loadFunction - function to load files
     * @param {string} prompt - label
     * @param {boolean} multiple - allow multiple files
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
      // Used in much later processing, so no callback

    form = createElement("form", {
      "className": vars.configId + "Input"
    });

    label = createElement("label", {
      "textContent": prompt
    });
    
    button = createElement("input", {
      "id": vars.configId + "ImportFiles",
      "name": vars.configId + "ImportFiles[]",
      "type": "file"
    });
    if (typeof multiple === "undefined" ||
      multiple === true
    ) {
      button.multiple = "multiple";
    }
    button.addEventListener("change", (function(){
      loadFunction(vars);
    }), false);
    label.appendChild(button);

    form.appendChild(label);

    form.appendChild(createElement("span", {
      "id": vars.configId + "Criteria"
    }));

    form.appendChild(createElement("span", {
      "id": vars.configId + "Progress"
    }));

    baseDOM.appendChild(form);

    baseDOM.appendChild(createElement("div", {
      "id": vars.configId + "Output"
    }));

    return true;
  }

  function outputError(error, vars) {
    /**
     * Output errors to user interface, destroying any prior Output
     * @param {object} error - error Object
     * @param {object} vars - internal data references
     */

    var message;
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var criteriaDOM = document.getElementById(vars.configId + "Criteria");
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
      if (criteriaDOM !== null) {
        while (criteriaDOM.firstChild) {
         criteriaDOM.removeChild(criteriaDOM.firstChild);
        }
      }
      if (fileDOM !== null) {
        fileDOM.disabled = false;
      }
    }
  }

  function initialisePlace(vars) {
    /**
     * Initiates JSON file import and Aquius creation
     * @param {object} vars - internal data references
     */

    var reader;
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");

    function loadFile(file) {

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
      })(file);
      reader.readAsText(file);
    }

    function onLoad(filename, result) {

      var criteria, element, keys, group, option, selected, i, j;
      var criteriaDOM = document.getElementById(vars.configId + "Criteria");
      var outputDOM = document.getElementById(vars.configId + "Output");
      var progressDOM = document.getElementById(vars.configId + "Progress");

      try {
        vars.dataObject = JSON.parse(result);

        if (typeof vars.dataObject !== "object" ||
          "meta" in vars.dataObject === false ||
          typeof vars.dataObject.meta !== "object" ||
          "schema" in vars.dataObject.meta === false ||
          vars.dataObject.meta.schema !== "0"
        ) {
          outputError(new Error(filename + " not a valid Aquius dataset"), vars);
        } else {
          if ("place" in vars.dataObject === false ||
            !Array.isArray(vars.dataObject.place) ||
            vars.dataObject.place.length === 0
          ) {
            outputError(new Error(filename + " contains no place data"), vars);
          } else {
            if (progressDOM !== null) {
              while (progressDOM.firstChild) {
                progressDOM.removeChild(progressDOM.firstChild);
              }
            }
            if (outputDOM !== null) {
              while (outputDOM.firstChild) {
                outputDOM.removeChild(outputDOM.firstChild);
              }
              outputDOM.className = "";
            }
            if (criteriaDOM !== null) {
              while (criteriaDOM.firstChild) {
                criteriaDOM.removeChild(criteriaDOM.firstChild);
              }

              criteria = ["network", "service"];
              for (i = 0; i < criteria.length; i += 1) {
                if (criteria[i] in vars.dataObject &&
                  Array.isArray(vars.dataObject[criteria[i]]) &&
                  vars.dataObject[criteria[i]].length > 1
                ) {
                  group = [];
                  selected = null;
                  for (j = 0; j < vars.dataObject[criteria[i]].length; j += 1) {
                    option = {};
                    option.value = j;
                    if (selected === null) {
                      selected = j;
                    }
                    if (vars.dataObject[criteria[i]][j].length > 1 &&
                      typeof vars.dataObject[criteria[i]][j][1] === "object"
                    ) {
                      if (vars.locale in vars.dataObject[criteria[i]][j][1]) {
                        option.label = vars.dataObject[criteria[i]][j][1][vars.locale];
                      } else {
                        keys = Object.keys(vars.dataObject[criteria[i]][j][1]);
                        if (keys.length > 0) {
                          option.label = vars.dataObject[criteria[i]][j][1][0];
                          // Default to first
                        }
                      }
                    }
                    group.push(option);
                  }
                  element = createSelectElement(group, selected);
                  element.id = vars.configId + criteria[i];
                  criteriaDOM.appendChild(element);
                }
              }

              selected = 0;
              group = [
                {"value": 0, "label": "All connectivity"},
                {"value": 2, "label": "Long distance"},
                {"value": 0.2, "label": "Local/interurban"},
                {"value": 0.02, "label": "Frequent/city"}
              ];
              element = createSelectElement(group, selected);
              element.id = vars.configId + "connectivity";
              criteriaDOM.appendChild(element);

              element = createElement("button", {
                "id": vars.configId + "process",
                "textContent": "Analyse " + vars.dataObject.place.length + " places",
                "type": "button"
              });
              element.addEventListener("click", (function(){
                processPlace(vars);
              }), false);
              criteriaDOM.appendChild(element);

            }
          }
        }
      } catch (err) {
        outputError(err, vars);
      }
    }

    if (fileDOM.files.length > 0) {
      loadFile(fileDOM.files[0]);
    }
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

  function processPlace(vars) {
    /**
     * Submit places to Aquius here, and handle callback
     * @param {object} vars - internal data references
     */

    var csv, criteria, options, output, theDom, i, j;
    var place = [];
    var service = [];
    var placeLength = vars.dataObject.place.length;
    var processed = 0;
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var processDOM = document.getElementById(vars.configId + "process");
    var progressDOM = document.getElementById(vars.configId + "Progress");

    function postPlace(error, here, options) {

      var name, population, to, i;
      var placeData = vars.dataObject.place[options.place[0]]

      function extractName(reference, defaultName) {

        var content, i;
        var nameArray = [];

        if (typeof reference !== "undefined" &&
          Array.isArray(reference)
        ) {
          for (i = 0; i < reference.length; i += 1) {
            if (typeof reference[i] === "object" &&
              "n" in reference[i]
            ) {
              content = reference[i].n.replace('"', "'").trim();
              if (content !== "") {
                nameArray.push(content)
              }
            }
          }
          return '"' + nameArray.join(", ") + '"';
        }
        if (typeof defaultName !== "undefined") {
          return defaultName;
        } else {
          return '""';
        }
      }

      if (typeof error !== "undefined") {
        processed = placeLength + 1;
          // Break subsequent processing
        outputError(error, vars);
      }

      if (placeData.length > 2) { 
        if ("r" in placeData[2]) {
          name = extractName(placeData[2].r);
        } else {
          if ("reference" in placeData[2]) {
            name = extractName(placeData[2].reference);
          } else {
            name = '""';
          }
        }

        // Place
        if ("summary" in here) {
          population = 0;
          if (typeof placeData[2] === "object") {
            if ("p" in placeData[2]) {
              population = placeData[2].p;
            } else {
              if ("population" in placeData[2]) {
                population = placeData[2].population;
              }
            }
          }
          place.push([name, placeData[0], placeData[1], here.summary.link,
            here.summary.node, here.summary.place, population]);
        }

        // Service
        if ("node" in here) {
          for (i = 0; i < here.node.length; i += 1) {
            if ("node" in here.node[i] &&
              "value" in here.node[i]
            ) {
              to = extractName(here.node[i].node);
              if (name !== to) {
                // Here from = to is a total, irrelevant to the matrix
                service.push([name, to, here.node[i].value]);
              }
            }
          }
        }

        // Future: More here manipulation
      }

      processed += 1;

      if (processed === placeLength) {

        if (progressDOM !== null) {
          while (progressDOM.firstChild) {
            progressDOM.removeChild(progressDOM.firstChild);
          }
        }

        output = [
          {
          "data": place,
          "file": "place.csv",
          "head": ["name","x","y","services","places","connectivity","population"]
          },
          {
          "data": service,
          "file": "service.csv",
          "head": ["from","to","services"]
          }
        ];
        // Future: Extendable for other CSV outputs

        csv = [];

        for (i = 0; i < output.length; i += 1) {
          csv.push({
            "data": [],
            "file": output[i].file
          });
          csv[csv.length - 1].data.push(output[i].head.join(",") + "\n");
          for (j = 0; j < output[i].data.length; j += 1) {
            csv[csv.length - 1].data.push(output[i].data[j].join(",") + "\n");
          }
        }

        for (i = 0; i < csv.length; i += 1) {
          progressDOM.appendChild(createElement("a", {
            "className": vars.configId + "Download",
            "href": window.URL.createObjectURL(
              new Blob(csv[i].data,
              {type: "text/csv;charset=utf-8"})
            ),
            "download": csv[i].file,
            "textContent": "Save " + csv[i].file,
            "role": "button"
          }));
        }

        if (fileDOM !== null) {
          fileDOM.disabled = false;
        }
        if (processDOM !== null) {
          processDOM.disabled = false;
        }
      }

    }

    if (fileDOM !== null) {
      fileDOM.disabled = true;
    }
    if (processDOM !== null) {
      processDOM.disabled = true;
    }

    options = {
      "callback": postPlace,
      "sanitize": false
        // Skip for speed. Failure acceptable in a tool
    };

    criteria = ["network", "service", "connectivity"];
    for (i = 0; i < criteria.length; i += 1) {
      theDom = document.getElementById(vars.configId + criteria[i]);
      if (theDom !== null) {
        options[criteria[i]] = parseFloat(theDom.value, 10);
      }
    }

    for (i = 0; i < vars.dataObject.place.length; i += 1) {
      options.place = [i];
        // Processes places singularly. If extended, modify postPlace
      aquius.here(vars.dataObject, options);
    }
  }

  return initialiseUI({
    "configId": configId,
    "locale": "en-US"
      // Future: Translation?
    },
    initialisePlace,
    "Aquius dataset:",
    false);
}

};
// EoF
/*eslint-env browser*/
/*global aquius*/

var gtfsToAquius = gtfsToAquius || {
/**
 * @namespace GTFS to Aquius
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

  function createTabulation(tableData, tableHeader, tableDataStyle, caption) {
    /**
     * Helper: Creates table DOM
     * @param {object} tableData - array (rows) of arrays (cell content - text or DOM)
     * @param {object} tableHeader - array of header cell names
     * @param {object} tableDataStyle - optional array of data cell styles
     * @param {string} caption - optional
     * @return {object} DOM element
     */

    var td, th, tr, i, j;
    var table = createElement("table");

    if (typeof caption !== "undefined") {
      table.appendChild(createElement("caption", {
         "textContent": caption
      }));
    }

    if (tableHeader.length > 0) {
      tr = createElement("tr");
      for (i = 0; i < tableHeader.length; i += 1) {
        if (typeof tableHeader[i] === "object") {
          th = createElement("th");
          th.appendChild(tableHeader[i]);
          tr.appendChild(th);
        } else {
          tr.appendChild(createElement("th", {
            "textContent": tableHeader[i].toString()
          }));
        }
      }
      table.appendChild(tr);
    }

    for (i = 0; i < tableData.length; i += 1) {
      tr = createElement("tr");
      for (j = 0; j < tableData[i].length; j += 1) {
        if (typeof tableData[i][j] === "object") {
          td = createElement("td");
          td.appendChild(tableData[i][j]);
        } else {
          td = createElement("td", {
            "textContent": tableData[i][j].toString()
          });
        }
        if (typeof tableDataStyle !== "undefined" &&
          tableDataStyle.length > j
        ) {
          td.className = tableDataStyle[j];
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    return table;
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

  function initialiseProcess(vars) {
    /**
     * Initiates file import and Aquius creation
     * @param {object} vars - internal data references
     */

    var reader;
    var gtfs = {};
    var nonText = {};
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var options = {
      "_vars": vars,
      "callback": outputProcess
    };
    var processedFiles = 0;
    var progressDOM = document.getElementById(vars.configId + "Progress");
    var totalFiles = 0;

    function loadFiles(files) {

      var theChunk, chunkedSize, i;
      var maxFilesize = 1e8;
        // In bytes, just under 100MB, beyond which source files will be loaded in parts
      var fileList = [];
        // [file, part index]

      for (i = 0; i < files.length; i += 1) {
        chunkedSize = 0
        while (files[i].size >= chunkedSize) {
          fileList.push([files[i], parseInt(chunkedSize / maxFilesize, 10)]);
          chunkedSize += maxFilesize;
        }
      }

      totalFiles = fileList.length;

      for (i = 0; i < totalFiles; i += 1) {
        reader = new FileReader();
        reader.onerror = (function(evt, theFile) {
          outputError(new Error("Could not read " + theFile[0].name), vars);
          reader.abort();
        });
        reader.onload = (function(theFile) {
          return function() {
            try {
              onLoad(theFile[0].name, theFile[1], this.result);
            } catch (err) {
              outputError(err, vars);
            }
          };
        })(fileList[i]);
        theChunk = fileList[i][0].slice(fileList[i][1] * maxFilesize,
          (fileList[i][1] * maxFilesize) + maxFilesize);
        reader.readAsText(theChunk);
      }
    }

    function onLoad(filename, position, result) {

      var filenameParts, json, key, keys, i;

      filenameParts = filename.toLowerCase().split(".");

      if (filenameParts.length > 1 &&
        filenameParts[filenameParts.length - 1] === "txt"
      ) {

        key = filenameParts.slice(0, filenameParts.length - 1).join(".");
        if (key in gtfs === false) {
          gtfs[key] = [];
        }
        gtfs[key][position] = result;

      } else {

        key = filenameParts.join(".");
        if (key in nonText === false) {
          nonText[key] = [];
        }
        nonText[key][position] = result;

      }

      processedFiles += 1;

      if (processedFiles === totalFiles) {

        keys = Object.keys(nonText);
        for (i = 0; i < keys.length; i += 1) {
          try {
            json = JSON.parse(nonText[keys[i]].join(""));
            if ("type" in json &&
              json.type === "FeatureCollection"
            ) {
              options.geojson = json;
            } else {
              options.config = json;
            }
          } catch (err) {
            if (err instanceof SyntaxError === false) {
              outputError(err, vars);
            }
              // Else it not JSON
          }
        }

        vars.process(gtfs, options);
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

  function outputProcess(error, out, options) {
    /**
     * Called after Aquius creation
     * @param {object} error - Error object or undefined 
     * @param {object} out - output, including keys aquius and config
     * @param {object} options - as sent, including _vars
     */

    var caption, keys, tableData, tableFormat, tableHeader, tableRow, zeroCoord, i, j;
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

    if ("aquius" in out &&
      "translation" in out.aquius &&
      "en-US" in out.aquius.translation &&
      "link" in out.aquius.translation["en-US"]
    ) {
      caption = out.aquius.translation["en-US"].link;
    } else {
      caption = "Services";
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

    if ("config" in out &&
      "stopOverride" in out.config
    ) {
      keys = Object.keys(out.config.stopOverride);
      zeroCoord = [];
      for (i = 0; i < keys.length; i += 1) {
        if ("x" in out.config.stopOverride[keys[i]] &&
          out.config.stopOverride[keys[i]].x === 0 &&
          "y" in out.config.stopOverride[keys[i]] &&
          out.config.stopOverride[keys[i]].y === 0 
        ) {
          zeroCoord.push(keys[i]);
        }
      }
      if (zeroCoord.length > 0) {
        outputDOM.appendChild(createElement("p", {
          "textContent": "Caution: Contains " + zeroCoord.length.toString() +
            " stop_id with coordinates 0,0, which can be corrected in config.stopOverride," +
            " or ignored by setting config.allowZeroCoordinate to false."
        }));
      }
    }

    if ("aquius" in out &&
      "network" in out.aquius &&
      "summary" in out &&
      "network" in out.summary
    ) {

      tableHeader = ["Network"];
      tableFormat = [vars.configId + "Text"];

      if ("service" in out.aquius === false ||
        out.aquius.service.length === 0
      ) {
        tableHeader.push("Service");
        tableFormat.push(vars.configId + "Number");
      } else {
        for (i = 0; i < out.aquius.service.length; i += 1) {
          if ("en-US" in out.aquius.service[i][1]) {
            tableHeader.push(out.aquius.service[i][1]["en-US"]);
          } else {
            tableHeader.push(JSON.stringify(out.aquius.service[i][1]));
          }
          tableFormat.push(vars.configId + "Number");
        }
      }

      tableData = [];
      for (i = 0; i < out.summary.network.length; i += 1) {
        if ("en-US" in out.aquius.network[i][1]) {
          tableData.push([out.aquius.network[i][1]["en-US"]].concat(out.summary.network[i]));
        } else {
          tableData.push([JSON.stringify(out.aquius.network[i][1])].concat(out.summary.network[i]));
        }
      }

      outputDOM.appendChild(createTabulation(tableData, tableHeader,
        tableFormat, caption + " by Network"));
    }

    if ("summary" in out &&
      "service" in out.summary &&
      out.summary.service.length > 0
    ) {

      tableHeader = ["Hour"];
      tableFormat = [vars.configId + "Text"];

      if ("service" in out.aquius === false ||
        out.aquius.service.length === 0
      ) {
        tableHeader.push("All")
        tableFormat.push(vars.configId + "Number");
      } else {
        for (i = 0; i < out.aquius.service.length; i += 1) {
          if ("en-US" in out.aquius.service[i][1]) {
            tableHeader.push(out.aquius.service[i][1]["en-US"]);
          } else {
            tableHeader.push(JSON.stringify(out.aquius.service[i][1]));
          }
          tableFormat.push(vars.configId + "Number");
        }
      }

      tableData = [];
      for (i = 0; i < out.summary.service.length; i += 1) {
        tableRow = [i];
        if (out.summary.service[i] === undefined) {
          if ("service" in out.aquius === false ||
            out.aquius.service.length === 0
          ) {
            tableRow.push("-");
          } else {
            for (j = 0; j < out.aquius.service.length; j += 1) {
              tableRow.push("-");
            }
          }
        } else {
          for (j = 0; j < out.summary.service[i].length; j += 1) {
            if (out.summary.service[i][j] > 0) {
              tableRow.push((out.summary.service[i][j] * 100).toFixed(2));
            } else {
              tableRow.push("-");
            }
          }
        }
        tableData.push(tableRow);
      }

      outputDOM.appendChild(createTabulation(tableData, tableHeader,
        tableFormat, caption + " % by Hour (scheduled only)"));

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
    "process": this.process
    },
    initialiseProcess,
    "GTFS as .txt, optional config, and optional GeoJSON to process:");
},


"process": function process(gtfs, options) {
  /**
   * Creates Aquius dataObject. May be called independently
   * @param {object} gtfs - key per GTFS file slug, value array of raw text content of GTFS file
   * @param {object} options - geojson, config, callback
   * @return {object} without callback: possible keys aquius, config, error
   * with callback: callback(error, out, options)
   */
  "use strict";

  var out = {
    "_": {},
      // Internal objects
    "aquius": {},
      // Output file
    "config": {},
      // Output config
    "summary": {}
      // Output quality analysis
  };

  function formatGtfsDate(dateMS) {
    /**
     * Helper: Converts millisecond date to GTFS date
     * @param {integer} dateMS - milliseconds from epoch
     * @return {string} date in GTFS (YYYYMMDD) format
     */

    var dateDate = new Date(dateMS);
    var dateString = dateDate.getFullYear().toString();
    if (dateDate.getMonth() < 9) {
      dateString += "0";
    }
    dateString += (dateDate.getMonth() + 1).toString();
    if (dateDate.getDate() < 10) {
      dateString += "0";
    }
    dateString += dateDate.getDate().toString();

    return dateString;
  }

  function unformatGtfsDate(dateString) {
    /**
     * Helper: Converts GTFS date to millisecond date
     * @param{string} dateString - date in GTFS (YYYYMMDD) format
     * @return {integer} milliseconds from epoch
     */

    if (dateString.length < 8) {
      return 0;
        // Fallback to 1970
    }

    return Date.UTC(
      dateString.slice(0, 4),
      dateString.slice(4, 6) - 1,
      dateString.slice(6, 8)
    );
  }

  function parseConfig(out, options) {
    /**
     * Parse options.config into valid out.config. Defines defaults
     * @param {object} out
     * @param {object} options
     * @return {object} out
     */

    var i;
    var defaults = {
      "allowCabotage": false,
        // Process duplicate vehicle trips with varying pickup/setdown restrictions as cabotage (see docs)
      "allowCode": true,
        // Include public stop codes in node references
      "allowColor": true,
        // Include route-specific colors if available
      "allowDuplication": false,
        // Count duplicate vehicle trips
      "allowHeadsign": false,
        // Include trip-specific headsigns within link references
      "allowName": true,
        // Include stop names (increases file size)
      "allowRoute": true,
        // Include route-specific short names
      "allowRouteLong": false,
        // Include route-specific long names
      "allowRouteUrl": true,
        // Include service URLs (increases file size)
      "allowSplit": false,
        // Count trips on the same route which share at least two, but not all, stop times as "split" at their unique stops
      "allowStopUrl": true,
        // Include stop URLs (increases file size)
      "allowZeroCoordinate": true,
        // Include stops with 0,0 coordinates, else stops are skipped
      "coordinatePrecision": 5,
        // Coordinate decimal places (smaller values tend to group clusters of stops)
      "duplicationRouteOnly": true,
        // Restrict duplications check to services on the same route
      "fromDate": formatGtfsDate(Date.now()),
        // Start date for service pattern analysis (inclusive)
      "inGeojson": true,
        // If geojson boundaries are provided, only services at stops within a boundary will be analysed
      "isCircular": [],
        // GTFS "route_id" (strings) to be referenced as circular. If empty, GTFS to Aquius follows own logic (see docs)
      "meta": {
        "schema": "0"
      },
        // As Data Structure meta key
      "mirrorLink": true,
        // Services mirrored in reverse are combined into the same link. Reduces filesize, but can distort service averages
      "networkFilter": {
        "type": "agency"
      },
        // Group services by, using network definitions (see docs)
      "option": {},
        // As Data Structure/Configuration option key
      "populationProperty": "population",
        // Field name in GeoJSON properties containing the number of people
      "placeNameProperty": "name",
        // Field name in GeoJSON properties containing the name or identifier of the place
      "productOverride": {},
        // Properties applied to all links with the same product ID (see docs)
      "routeExclude": [],
        // GTFS "route_id" (strings) to be excluded from analysis
      "routeInclude": [],
        // GTFS "route_id" (strings) to be included in analysis, all if empty
      "routeOverride": {},
        // Properties applied to routes, by GTFS "route_id" key (see docs)
      "serviceFilter": {},
        // Group services by, using service definitions (see docs)
      "servicePer": 1,
        // Service average per period in days (1 gives daily totals, 7 gives weekly totals)
      "splitMinimumJoin": 2,
        // Minimum number of concurrent nodes that split services must share
      "stopExclude": [],
        // GTFS "stop_id" (strings) to be excluded from analysis
      "stopInclude": [],
        // GTFS "stop_id" (strings) to be included in analysis, all if empty
      "stopOverride": {},
        // Properties applied to stops, by GTFS "stop_id" key (see docs)
      "toDate": formatGtfsDate(Date.now() + 5184e5),
        // End date for service pattern analysis (inclusive), thus +6 days for 1 week
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

    out._.circular = {};
    for (i = 0; i < out.config.isCircular.length; i += 1) {
       out._.circular[out.config.isCircular[i]] = out.config.isCircular[i];
       // Indexed for speed
    }

    return out;
  }

  function parseCsv(out, slug, csv) {
    /**
     * Helper: Parses array of strings into line-by-line-array based on CSV structure
     * Base logic via Jezternz. Runtime about 1 second per 20MB of data
     * @param {object} out
     * @param {string} slug - GTFS name slug
     * @param {array} csv
     * @return {object} out
     */

    var firstLine, lastIndex, match, matches, residual, i, j;
    var columns = -1;
    var pattern = new RegExp(("(\\,|\\r?\\n|\\r|^)(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\\,\\r\\n]*))"),"gi");
    var indexColumn = -1;
    var line = [];

    function processLine(out, line, slug, columns, indexColumn) {

      if (line.length === columns) {
        if (indexColumn !== -1) {
          if (line[indexColumn] in out.gtfs[slug] === false) {
            out.gtfs[slug][line[indexColumn]] = [];
          }
          out.gtfs[slug][line[indexColumn]].push(line);
        } else {
          out.gtfs[slug].push(line);
        }
      }

      return out;
    }

    if (!Array.isArray(csv)) {
      csv = [csv];
    }

    for (i = 0; i < csv.length; i += 1) {

      matches = pattern.exec(csv[i]);
      lastIndex = line.length - 1;
      firstLine = true;

      while (matches !== null) {

        if (matches[1].length &&
          matches[1] !== ","
        ) {

          if (i > 0 &&
            firstLine === true
          ) {
            if (line.length > columns &&
              lastIndex < line.length - 1
            ) {
              // File split mid-value, so merge lastIndex value and the following index value
              // Header must be wholly in first chunk - logic breaks with ridiculously small file chunks
              residual = line.slice(0, lastIndex);
              residual.push(line[lastIndex] + line[lastIndex + 1]);
              line = residual.concat(line.slice(lastIndex + 2));
            }
            firstLine = false;
          }

          if (columns === -1) {
            // Header
            columns = line.length;
            for (j = 0; j < line.length; j += 1) {
              if (line[j] in out.gtfsHead[slug]) {
                out.gtfsHead[slug][line[j]] = j;
              }
            }
            if (slug in out.gtfsRequired) {
              for (j = 0; j < out.gtfsRequired[slug].length; j += 1) {
                if (out.gtfsHead[slug][out.gtfsRequired[slug][j]] === -1) {
                  if ("error" in out === false) {
                    out.error = [];
                  }
                  out.error.push("Missing value " + out.gtfsRequired[slug][j]  + " in GTFS "+ slug + ".txt");
                  return out;
                }
              }
            }
            if (slug in out.gtfsIndex) {
              indexColumn = out.gtfsHead[slug][out.gtfsIndex[slug]];
              if (indexColumn === -1) {
                if ("error" in out === false) {
                  out.error = [];
                }
                out.error.push("Missing index value " + out.gtfsIndex[slug] + " in GTFS "+ slug + ".txt");
                return out;
              }
              out.gtfs[slug] = {};
            } else {
              out.gtfs[slug] = [];
            }
          } else {
            // Content
            out = processLine(out, line, slug, columns, indexColumn);
          }

          line = [];
        }

        if (matches[2]) {
          match = matches[2].replace(new RegExp("\"\"", "g"), "\"");
        } else {
          match = matches[3];
        }

        if (match === undefined) {
          // Quoted but empty
          match = "";
        }

        line.push(match.trim());
        matches = pattern.exec(csv[i]);
      }

    }

    // Finally
    out = processLine(out, line, slug, columns, indexColumn);

    return out;
  }

  function parseGtfs(out, gtfs) {
    /**
     * Parse gtfs strings into out.gtfs, columns defined in out.gtfsHead
     * @param {object} out
     * @param {object} gtfs
     * @return {object} out
     */

    var keys, i;

    out.gtfsIndex = {
      // Group data by index
      "stop_times": "trip_id"
    };

    out.gtfsHead = {
      // Numbers record column position, true if index, -1 if missing
      "agency": {
        "agency_id": -1,
        "agency_name": -1
      },
      "calendar": {
        "service_id": -1,
        "monday": -1,
        "tuesday": -1,
        "wednesday": -1,
        "thursday": -1,
        "friday": -1,
        "saturday": -1,
        "sunday": -1,
        "start_date": -1,
        "end_date": -1
      },
      "calendar_dates": {
        "service_id": -1,
        "date": -1,
        "exception_type": -1
      },
      "frequencies": {
        "trip_id": -1,
        "start_time": -1,
        "end_time": -1,
        "headway_secs": -1
      },
      "routes": {
        "agency_id": -1,
        "route_color": -1,
        "route_id": -1,
        "route_long_name": -1,
        "route_short_name": -1,
        "route_text_color": -1,
        "route_url": -1
      },
      "stop_times": {
        "arrival_time": -1,
        "departure_time": -1,
        "trip_id": -1,
        "stop_id": -1,
        "stop_sequence": -1,
        "pickup_type": -1,
        "drop_off_type": -1
      },
      "stops": {
        "stop_code": -1,
        "stop_id": -1,
        "stop_lat": -1,
        "stop_lon": -1,
        "stop_name": -1,
        "stop_url": -1,
        "location_type": -1,
        "parent_station": -1
      },
      "transfers": {
        "from_stop_id": -1,
        "to_stop_id": -1,
        "transfer_type": -1
      },
      "trips": {
        "block_id": -1,
        "direction_id": -1,
        "route_id": -1,
        "service_id": -1,
        "trip_headsign": -1,
        "trip_id": -1,
        "trip_short_name": -1
      }
    };

    out.gtfsRequired = {
      "routes": ["route_id"],
      "stops": ["stop_id", "stop_lat", "stop_lon"],
      "trips": ["route_id", "service_id", "trip_id"],
      "stop_times": ["trip_id", "stop_id", "stop_sequence"]
    };

    if ("type" in out.config.networkFilter &&
      out.config.networkFilter.type === "mode"
    ) {
      out.gtfsHead.routes.route_type = -1;
    }
    if ("name" in out.config.meta === false ||
      "en-US" in out.config.meta.name === false
    ) {
      if ("feed_info" in out.gtfsHead === false) {
        out.gtfsHead.feed_info = {};
      }
      out.gtfsHead.feed_info.feed_publisher_name = -1;
    }
    if ("url" in out.config.meta === false) {
      if ("feed_info" in out.gtfsHead === false) {
        out.gtfsHead.feed_info = {};
      }
      out.gtfsHead.feed_info.feed_publisher_url = -1;
    }
      // Extendable for further product filters

    keys = Object.keys(out.gtfsRequired);
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in gtfs === false) {
        if ("error" in out === false) {
          out.error = [];
        }
        out.error.push("Missing GTFS "+ keys[i] + ".txt");
        return out;
      }
    }

    out.gtfs = {};

    keys = Object.keys(out.gtfsHead);
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in gtfs) {
        out = parseCsv(out, keys[i], gtfs[keys[i]]);
       }
    }

    return out;
  }

  function buildHeader(out) {
    /**
     * Creates out.aquius header keys - meta, option, translation
     * @param {object} out
     * @return {object} out
     */

    if ("schema" in out.config.meta === false ||
      out.config.meta.schema !== "0"
    ) {
      out.config.meta.schema = "0";
    }

    if ("name" in out.config.meta === false) {
      out.config.meta.name = {};
    }

    if ("en-US" in out.config.meta.name === false) {
      if ("feed_info" in out.gtfs &&
        out.gtfsHead.feed_info.feed_publisher_name !== -1 &&
        out.gtfs.feed_info.length > 0
      ) {
        out.config.meta.name["en-US"] = out.gtfs.feed_info[0][out.gtfsHead.feed_info.feed_publisher_name] + " ";
      } else {
        out.config.meta.name["en-US"] = "";
      }
      out.config.meta.name["en-US"] += "(" + out.config.fromDate;
      if (out.config.fromDate !== out.config.toDate) {
        out.config.meta.name["en-US"] += "-" + out.config.toDate;
      }
      out.config.meta.name["en-US"] += ")";
    }

    if ("url" in out.config.meta === false &&
      "feed_info" in out.gtfs &&
      out.gtfsHead.feed_info.feed_publisher_url !== -1 &&
      out.gtfs.feed_info.length > 0
    ) {
      out.config.meta.url = out.gtfs.feed_info[0][out.gtfsHead.feed_info.feed_publisher_url];
    }

    out.aquius.meta = out.config.meta;

    if ("en-US" in out.config.translation === false) {
      out.config.translation["en-US"] = {};
    }

    if ("link" in out.config.translation["en-US"] === false) {
      switch (out.config.servicePer) {

        case 1:
          out.config.translation["en-US"].link = "Daily Services";
          break;

        case 7:
          out.config.translation["en-US"].link = "Weekly Services";
          break;

        default:
          out.config.translation["en-US"].link = "Services per " + out.config.servicePer + " Days";
          break;
      }
    }

    out.aquius.translation = out.config.translation;

    if ("c" in out.config.option === false ||
      "k" in out.config.option === false
    ) {
      // Focus on first stop - often arbitrary, but should render something
      out.config.option.c = parseFloat(out.gtfs.stops[0][out.gtfsHead.stops.stop_lon]);
      out.config.option.k = parseFloat(out.gtfs.stops[0][out.gtfsHead.stops.stop_lat]);
      out.config.option.m = 12;
    }

    if ("x" in out.config.option === false ||
      "y" in out.config.option === false
    ) {
      out.config.option.x = parseFloat(out.gtfs.stops[0][out.gtfsHead.stops.stop_lon]);
      out.config.option.y = parseFloat(out.gtfs.stops[0][out.gtfsHead.stops.stop_lat]);
      out.config.option.z = 10;
    }

    out.aquius.option = out.config.option;

    return out;
  }

  function buildNetwork(out) {
    /**
     * Creates out.aquius.network from config.networkFilter
     * @param {object} out
     * @return {object} out
     */

    var agencyColumn, index, keys, product, i, j;
    var modeLookup = {
      "0": {"en-US": "Tram"},
      "1": {"en-US": "Metro"},
      "2": {"en-US": "Rail"},
      "3": {"en-US": "Bus"},
      "4": {"en-US": "Ferry"},
      "5": {"en-US": "Cable car"},
      "6": {"en-US": "Cable car"},
      "7": {"en-US": "Funicular"},
      "100": {"en-US": "Rail"},
      "101": {"en-US": "High speed rail"},
      "102": {"en-US": "Long distance rail"},
      "103": {"en-US": "Inter-regional rail"},
      "105": {"en-US": "Sleeper rail"},
      "106": {"en-US": "Regional rail"},
      "107": {"en-US": "Tourist rail"},
      "108": {"en-US": "Rail shuttle"},
      "109": {"en-US": "Suburban rail"},
      "200": {"en-US": "Coach"},
      "201": {"en-US": "International coach"},
      "202": {"en-US": "National coach"},
      "204": {"en-US": "Regional coach"},
      "208": {"en-US": "Commuter coach"},
      "400": {"en-US": "Urban rail"},
      "401": {"en-US": "Metro"},
      "402": {"en-US": "Underground"},
      "405": {"en-US": "Monorail"},
      "700": {"en-US": "Bus"},
      "701": {"en-US": "Regional bus"},
      "702": {"en-US": "Express bus"},
      "704": {"en-US": "Local bus"},
      "800": {"en-US": "Trolleybus"},
      "900": {"en-US": "Tram"},
      "1000": {"en-US": "Water"},
      "1300": {"en-US": "Telecabin"},
      "1400": {"en-US": "Funicular"},
      "1501": {"en-US": "Shared taxi"},
      "1700": {"en-US": "Other"},
      "1701": {"en-US": "Cable car"},
      "1702": {"en-US": "Horse-drawn"}
    };
      // Future extended GTFS Route Types will render as "Mode #n", pending manual editing in config

    if ("type" in out.config.networkFilter === false) {
      out.config.networkFilter.type = "agency";
    }
    if ("reference" in out.config.networkFilter === false) {
      out.config.networkFilter.reference = {};
    }

    out._.productIndex = {};
    if ("reference" in out.aquius === false) {
      out.aquius.reference = {};
    }
    out.aquius.reference.product = [];

    switch (out.config.networkFilter.type) {
      // Extendable for more product filters. Add complementary code to wanderRoutes()

      case "mode":
        if ("route_type" in out.gtfsHead.routes &&
          out.gtfsHead.routes.route_type !== -1 &&
          out.gtfs.routes.length > 0
        ) {
          index = 0;
          for (i = 0; i < out.gtfs.routes.length; i += 1) {
            if (out.gtfs.routes[i][out.gtfsHead.routes.route_type] in out._.productIndex === false) {
              out._.productIndex[out.gtfs.routes[i][out.gtfsHead.routes.route_type]] = index;
              if (out.gtfs.routes[i][out.gtfsHead.routes.route_type] in out.config.networkFilter.reference === false) {
                if (out.gtfs.routes[i][out.gtfsHead.routes.route_type] in modeLookup) {
                  out.config.networkFilter.reference[out.gtfs.routes[i][out.gtfsHead.routes.route_type]] = 
                    modeLookup[out.gtfs.routes[i][out.gtfsHead.routes.route_type]];
                } else {
                  out.config.networkFilter.reference[out.gtfs.routes[i][out.gtfsHead.routes.route_type]] = {};
                }
              }
              out.aquius.reference.product[index] =
                out.config.networkFilter.reference[out.gtfs.routes[i][out.gtfsHead.routes.route_type]];
              index += 1;
            }
          }
        }
        break;

      case "agency":
      default:
        out.config.networkFilter.type = "agency";
          // Defaults to agency
        if ("agency" in out.gtfs &&
          (("agency_id" in out.gtfsHead.agency &&
          out.gtfsHead.agency.agency_id !== -1) ||
          ("agency_name" in out.gtfsHead.agency &&
          out.gtfsHead.agency.agency_name !== -1)) &&
          out.gtfs.agency.length > 0
        ) {
          index = 0;
          if ("agency_id" in out.gtfsHead.agency &&
            out.gtfsHead.agency.agency_id !== -1
          ) {
            agencyColumn = out.gtfsHead.agency.agency_id;
          } else {
            agencyColumn = out.gtfsHead.agency.agency_name;
          }
          for (i = 0; i < out.gtfs.agency.length; i += 1) {
            if (out.gtfs.agency[i][agencyColumn] !== undefined &&
              out.gtfs.agency[i][agencyColumn] !== "" &&
              out.gtfs.agency[i][agencyColumn] in out._.productIndex === false
            ) {
              out._.productIndex[out.gtfs.agency[i][agencyColumn]] = index;
              if (out.gtfs.agency[i][agencyColumn] in out.config.networkFilter.reference === false) {
                if (out.gtfsHead.agency.agency_name !== -1) {
                  out.config.networkFilter.reference[out.gtfs.agency[i][agencyColumn]] = 
                    {"en-US": out.gtfs.agency[i][out.gtfsHead.agency.agency_name]};
                } else {
                  out.config.networkFilter.reference[out.gtfs.agency[i][agencyColumn]] = 
                    {"en-US": out.gtfs.agency[i][out.gtfsHead.agency.agency_id]};
                }
              }
              out.aquius.reference.product[index] = out.config.networkFilter.reference[out.gtfs.agency[i][agencyColumn]];
              index += 1;
            }
          }
        }
        if (Object.keys(out._.productIndex).length === 0) {
          // Fallback
          out._.productIndex["agency"] = 0;
          out.config.networkFilter.reference["agency"] = {};
          out.aquius.reference.product[0] = {};
        }
        break;

    }

    // Future: Logic should also check that bespoke networkFilter is valid
    if ("network" in out.config.networkFilter === false ||
      !Array.isArray(out.config.networkFilter.network)
    ) {
      out.config.networkFilter.network = [];
      keys = Object.keys(out._.productIndex);

      switch (out.config.networkFilter.type) {
        // Extendable for more product filters

        case "mode":
          out.config.networkFilter.network.push([
            keys,
              // Config references GTFS Ids
            {"en-US": "All modes"}
          ]);
          if (keys.length > 1) {
            for (i = 0; i < keys.length; i += 1) {
              if (keys[i] in modeLookup) {
                out.config.networkFilter.network.push([
                  [keys[i]],
                  modeLookup[keys[i]]
                ]);
              } else {
                out.config.networkFilter.network.push([
                  [keys[i]],
                  {"en-US": "Mode #"+ keys[i]}
                ]);
              }
            }
          }
          break;

        case "agency":
          out.config.networkFilter.network.push([
            keys,
            {"en-US": "All operators"}
          ]);
          if (keys.length > 1) {
            for (i = 0; i < keys.length; i += 1) {
              if ("agency" in out.gtfs &&
                out.gtfsHead.agency.agency_id !== -1 &&
                out.gtfsHead.agency.agency_name !== -1
              ) {
                for (j = 0; j < out.gtfs.agency.length; j += 1) {
                  if (out.gtfs.agency[j][out.gtfsHead.agency.agency_id] === keys[i]) {
                    out.config.networkFilter.network.push([
                      [keys[i]],
                      {"en-US": out.gtfs.agency[j][out.gtfsHead.agency.agency_name]}
                    ]);
                    break;
                  }
                }
              } else {
                out.config.networkFilter.network.push([
                  [keys[i]],
                  {"en-US": keys[i]}
                ]);
              }
            }
          }
          break;

        default:
          // Fallback only
          out.config.networkFilter.network.push([
            keys,
            {"en-US": "All"}
          ]);
          break;

      }

    }

    out.aquius.network = [];

    for (i = 0; i < out.config.networkFilter.network.length; i += 1) {
      if (out.config.networkFilter.network[i].length > 1 &&
        Array.isArray(out.config.networkFilter.network[i][0]) &&
        typeof out.config.networkFilter.network[i][1] === "object"
      ) {
        product = [];
        for (j = 0; j < out.config.networkFilter.network[i][0].length; j += 1) {
          if (out.config.networkFilter.network[i][0][j] in out._.productIndex) {
            product.push(out._.productIndex[out.config.networkFilter.network[i][0][j]]);
          }
        }
        out.aquius.network.push([product, out.config.networkFilter.network[i][1], {}]);
      }
    }

    return out;
  }

  function buildService(out) {
    /**
     * Creates out.aquius.service from config.serviceFilter
     * @param {object} out
     * @return {object} out
     */

    var weekdays, i;

    if ("serviceFilter" in out.config &&
      "type" in out.config.serviceFilter &&
      out.config.serviceFilter.type === "period"
    ) {

      if ("period" in out.config.serviceFilter === false ||
        !Array.isArray(out.config.serviceFilter.period) ||
        out.config.serviceFilter.period.length === 0
      ) {
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
        out.config.serviceFilter.period = [
          {"name": {"en-US": "Typical day"}},
          {"day": weekdays, "name": {"en-US": "Typical weekday"}},
          {"day": weekdays, "name": {"en-US": "Weekday early"}, "time": [{"end": "10:00:00"}]},
          {"day": weekdays, "name": {"en-US": "Weekday 10:00-17:00"}, "time": [{"start": "10:00:00", "end": "17:00:00"}]},
          {"day": weekdays, "name": {"en-US": "Weekday evening"}, "time": [{"start": "17:00:00"}]},
          {"day": ["saturday"], "name": {"en-US": "Saturday"}},
          {"day": ["sunday"], "name": {"en-US": "Sunday"}}
        ];
          // Sample defaults
      }

      out.aquius.service = [];

      for (i = 0; i < out.config.serviceFilter.period.length; i += 1) {
        if ("name" in out.config.serviceFilter.period[i] === false) {
          out.config.serviceFilter.period[i].name = {"en-US": "Period " + i};
          // Fallback
        }
        out.aquius.service.push([[i], out.config.serviceFilter.period[i].name, {}]);
      }

    }

    return out; 
   }

  function addToReference(out, key, value) {
    /**
     * Helper: Adds value to out.aquius.reference[key] and out._[key] if not already present
     * @param {object} out
     * @param {string} key - reference key (color, url)
     * @param {string} value - reference content
     * @return {object} out
     */

    if ("reference" in out.aquius === false) {
      out.aquius.reference = {};
    }

    if (key in out.aquius.reference === false) {
      out.aquius.reference[key] = [];
      out._[key] = {};
    }

    if (value in out._[key] === false) {
      out.aquius.reference[key].push(value);
      out._[key][value] = out.aquius.reference[key].length - 1;
    }

    return out;
  }

  function createNodeProperties(out, stopObject, index) {
    /**
     * Helper: Adds node properties r key to out.aquius.node[index], if relevant contents in stopObject
     * @param {object} out
     * @param {object} stopObject - gtfs.stops array (line)
     * @param {integer} index - out.aquius.node index for output
     * @return {object} out
     */

    var codeString, contentString, position, wildcard;
    var properties = {};

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

    if (out.config.allowName === true) {
      contentString = "";
      if (stopObject[out.gtfsHead.stops.stop_id] in out.config.stopOverride &&
        "stop_name" in out.config.stopOverride[stopObject[out.gtfsHead.stops.stop_id]]
      ) {
        contentString = out.config.stopOverride[stopObject[out.gtfsHead.stops.stop_id]].stop_name;
      } else {
        if (out.gtfsHead.stops.stop_name !== -1) {
          contentString = stopObject[out.gtfsHead.stops.stop_name].trim();
        }
      }
      if (contentString !== "") {
        properties.n = contentString;
      }
    }

    if (out.config.allowStopUrl === true) {
      contentString = "";
      if (stopObject[out.gtfsHead.stops.stop_id] in out.config.stopOverride &&
        "stop_url" in out.config.stopOverride[stopObject[out.gtfsHead.stops.stop_id]]
      ) {
        contentString = out.config.stopOverride[stopObject[out.gtfsHead.stops.stop_id]].stop_url;
      } else {
        if (out.gtfsHead.stops.stop_url !== -1) {
          contentString = stopObject[out.gtfsHead.stops.stop_url].trim();
        }
      }
      if (contentString !== "") {

        wildcard = "[*]";
        position = contentString.lastIndexOf(wildcard);
          // Cannot use wildcard if already contains it (unlikely)

        if (position === -1 &&
          out.gtfsHead.stops.stop_code !== -1
        ) {
          codeString = stopObject[out.gtfsHead.stops.stop_code].trim();
          position = contentString.lastIndexOf(codeString);
            // Human logic: Stop code within URL format
          if (position !== -1) {
            contentString = contentString.substring(0, position) + wildcard +
              contentString.substring(position + codeString.length);
            properties.i = codeString;
          }
        }

        if (position === -1 &&
          out.gtfsHead.stops.stop_id !== -1
        ) {
          codeString = stopObject[out.gtfsHead.stops.stop_id].trim();
          position = contentString.lastIndexOf(codeString);
            // Operator logic: Internal ID within format
          if (position !== -1) {
            contentString = contentString.substring(0, position) + wildcard +
              contentString.substring(position + codeString.length);
            properties.i = codeString;
          }
        }

        out = addToReference(out, "url", contentString);
        properties.u = out._.url[contentString];

      }
    }

    if (Object.keys(properties).length > 0) {
      if ("r" in out.aquius.node[index][2]) {
        if (withinKeys(properties, out.aquius.node[index][2].r) === false) {
          out.aquius.node[index][2].r.push(properties);
        }
      } else {
        out.aquius.node[index][2].r = [properties];
      }
    }

    if (out.config.allowCode === true) {
      // Add stop code as a separate reference object
      properties = {};
      if (stopObject[out.gtfsHead.stops.stop_id] in out.config.stopOverride &&
        "stop_code" in out.config.stopOverride[stopObject[out.gtfsHead.stops.stop_id]]
      ) {
        properties.n = out.config.stopOverride[stopObject[out.gtfsHead.stops.stop_id]].stop_code;
      } else {
        if (out.gtfsHead.stops.stop_code !== -1) {
          properties.n = stopObject[out.gtfsHead.stops.stop_code].trim();
        }
      }
      if ("n" in properties &&
        properties.n !== ""
      ) {
        if ("r" in out.aquius.node[index][2]) {
          if (withinKeys(properties, out.aquius.node[index][2].r) === false) {
            out.aquius.node[index][2].r.push(properties);
          }
        } else {
          out.aquius.node[index][2].r = [properties];
        }
      }
    }

    return out;
  }

  function stopCoordinates(out, stopsObject) {
    /**
     * Helper: Raw coordinate rounded to 
     * @param {string} value - coordinate number as string
     * @param {Object} stopsObject - gtfs.stops line
     * @return {array} coordinate [x,y]
     */

    var precision = Math.pow(10, out.config.coordinatePrecision);

    function parseCoord(value, precision) {
      
      var numericValue = parseFloat(value);

      if (Number.isNaN(numericValue)) {
        return 0;
      }

      return Math.round(numericValue * precision) / precision;
    }

    if (out.gtfsHead.stops.stop_id !== -1 &&
      stopsObject[out.gtfsHead.stops.stop_id] in out.config.stopOverride &&
      "x" in out.config.stopOverride[stopsObject[out.gtfsHead.stops.stop_id]] &&
      "y" in out.config.stopOverride[stopsObject[out.gtfsHead.stops.stop_id]]
    ) {
      return [
        parseCoord(out.config.stopOverride[stopsObject[out.gtfsHead.stops.stop_id]].x, precision),
        parseCoord(out.config.stopOverride[stopsObject[out.gtfsHead.stops.stop_id]].y, precision)
      ];
    }

    if (out.gtfsHead.stops.stop_lat !== -1 &&
      out.gtfsHead.stops.stop_lon !== -1
    ) {
      return [
        parseCoord(stopsObject[out.gtfsHead.stops.stop_lon], precision),
        parseCoord(stopsObject[out.gtfsHead.stops.stop_lat], precision)
      ];
    }

    return [0, 0];
  }
  
  function checkStopCoordinates(out, coords, stopId) {
    /**
     * Helper: Adds 0,0 copordinates to out.config.stopOverride
     * @param {object} out
     * @param {array} coord - [x, y]
     * @param {string} stopId - gtfs stop_id
     * @return {object} out 
     */

    if (coords[0] === 0 &&
      coords[1] === 0
    ) {
      if (stopId in out.config.stopOverride === false) {
        out.config.stopOverride[stopId] = {};
      }
      out.config.stopOverride[stopId].x = 0;
      out.config.stopOverride[stopId].y = 0;
    }

    return out;
  }

  function stopFilter(out) {
    /**
     * Adds stopInclude and stopExclude to out
     * @param {object} out
     * @return {object} out
     */

    var i;

    if (out.config.stopExclude.length > 0) {
      out._.stopExclude = {};
      for (i = 0; i < out.config.stopExclude.length; i += 1) {
        out._.stopExclude[out.config.stopExclude[i]] = "";
      }
    }

    if (out.config.stopInclude.length > 0) {
      out._.stopInclude = {};
      for (i = 0; i < out.config.stopInclude.length; i += 1) {
        out._.stopInclude[out.config.stopInclude[i]] = "";
      }
    }

    return out;
  }
  
  function parentStopsToNode(out) {
    /**
     * Parses gtfs.stops parent stations and groups nodes within together
     * @param {object} out
     * @return {object} out
     */

    var coords, index, key, i;
    var childStops = [];
      // stop_id, parent_id

    if (out.gtfsHead.stops.location_type !== -1 &&
      out.gtfsHead.stops.parent_station !== -1
    ) {

      if ("nodeLookup" in out._ === false) {
        out._.nodeLookup = {};
        // Lookup of GTFS stop_id: out.aquius.node index
      }
      if ("nodeCoord" in out._ === false) {
        out._.nodeCoord = {};
        // Lookup of "x,y": out.aquius.node index
      }
      if ("node" in out.aquius === false) {
        out.aquius.node = [];
      }

      for (i = 0; i < out.gtfs.stops.length; i += 1) {

        if (("stopExclude" in out._ === false ||
          out.gtfs.stops[i][out.gtfsHead.stops.stop_id] in out._.stopExclude === false) &&
          ("stopInclude" in out._ === false ||
          out.gtfs.stops[i][out.gtfsHead.stops.stop_id] in out._.stopInclude)
        ) {

          if (out.gtfs.stops[i][out.gtfsHead.stops.location_type] === "1") {
            // Is parent

            coords = stopCoordinates(out, out.gtfs.stops[i]);

            if (out.config.allowZeroCoordinate ||
              (coords[0] !== 0 ||
              coords[1] !== 0)
            ) {

              out = checkStopCoordinates(out, coords, out.gtfs.stops[i][out.gtfsHead.stops.stop_id]);
              key = coords[0].toString() + "," + coords[1].toString();

              if (key in out._.nodeCoord) {
                index = out._.nodeCoord[key];
              } else {
                index = out.aquius.node.length;
                out.aquius.node.push([coords[0], coords[1], {}]);
                out._.nodeCoord[key] = index;
              }

              out._.nodeLookup[out.gtfs.stops[i][out.gtfsHead.stops.stop_id]] = index;
              out = createNodeProperties(out, out.gtfs.stops[i], index);
            }

          } else {

            if (out.gtfs.stops[i][out.gtfsHead.stops.parent_station] !== "") {
              // Is child
              childStops.push([
                out.gtfs.stops[i][out.gtfsHead.stops.stop_id],
                out.gtfs.stops[i][out.gtfsHead.stops.parent_station]
              ]);
            }

          }
        }
      }

      for (i = 0; i < childStops.length; i += 1) {
        if (childStops[i][1] in out._.nodeLookup) {
          // Else no parent, so stop should be processed elsewhere
          out._.nodeLookup[childStops[i][0]] = out._.nodeLookup[childStops[i][1]];
        }
      }

    }

    return out;
  }

  function transferStopsToNode(out) {
    /**
     * Parses gtfs.stops transfer stations and groups nodes within together
     * @param {object} out
     * @return {object} out
     */

    var coords, index, key, fromStop, toStop, i, j;

    if ("transfers" in out.gtfs &&
      out.gtfsHead.transfers.from_stop_id !== -1 &&
      out.gtfsHead.transfers.to_stop_id !== -1 &&
      out.gtfsHead.transfers.transfer_type !== 1
    ) {
      // Transfer pairs are logically grouped together, even where actual transfer is forbidden

      if ("nodeLookup" in out._ === false) {
        out._.nodeLookup = {};
      }
      if ("nodeCoord" in out._ === false) {
        out._.nodeCoord = {};
      }
      if ("node" in out.aquius === false) {
        out.aquius.node = [];
      }

      for (i = 0; i < out.gtfs.transfers.length; i += 1) {
        if (out.gtfs.transfers[i][out.gtfsHead.transfers.from_stop_id] !== "" &&
          ("stopExclude" in out._ === false ||
          (out.gtfs.transfers[i][out.gtfsHead.transfers.from_stop_id] in out._.stopExclude === false &&
          out.gtfs.transfers[i][out.gtfsHead.transfers.to_stop_id] in out._.stopExclude === false)) &&
          ("stopInclude" in out._ === false ||
          (out.gtfs.transfers[i][out.gtfsHead.transfers.from_stop_id] in out._.stopInclude &&
          out.gtfs.transfers[i][out.gtfsHead.transfers.to_stop_id] in out._.stopInclude))
        ) {
          fromStop = out._.nodeLookup[out.gtfs.transfers[i][out.gtfsHead.transfers.from_stop_id]];
          toStop = out._.nodeLookup[out.gtfs.transfers[i][out.gtfsHead.transfers.to_stop_id]];

          if (fromStop !== toStop) {
            if (fromStop !== undefined &&
              toStop !== undefined) {
              // Could merge stops, but already clearly assigned as stations, so leave as separate
            } else {
              if (fromStop !== undefined) {
                // Add toStop to fromStop
                out._.nodeLookup[toStop] = fromStop;
              } else {
                if (toStop !== undefined) {
                  // Add fromStop to toStop
                  out._.nodeLookup[fromStop] = toStop;
                } else {
                  if (fromStop === undefined &&
                    toStop === undefined) {
                    // Add new stop
                    for (j = 0; j < out.gtfs.stops.length; j += 1) {

                      if (out.gtfs.stops[j][out.gtfsHead.stops.stop_id] === fromStop) {

                        coords = stopCoordinates(out, out.gtfs.stops[j]);

                        if (out.config.allowZeroCoordinate ||
                          (coords[0] !== 0 ||
                          coords[1] !== 0)
                        ) {

                          out = checkStopCoordinates(out, coords, out.gtfs.stops[j][out.gtfsHead.stops.stop_id]);
                          key = coords[0].toString() + "," + coords[1].toString();

                          if (key in out._.nodeCoord) {
                            index = out._.nodeCoord[key];
                          } else {
                            index = out.aquius.node.length;
                            out.aquius.node.push([coords[0], coords[1], {}]);
                            out._.nodeCoord[key] = index;
                          }

                          out._.nodeLookup[fromStop] = index;
                          out._.nodeLookup[toStop] = index;
                          out = createNodeProperties(out, out.gtfs.stops[j], index);
                          break;
                        }
                      }

                    }
                  }
                }
              }
            }
          }

        }
      }
    }

    return out;
  }

  function regularStopsToNode(out) {
    /**
     * Parses gtfs.stops for unprocessed nodes (call after parentStops and transferStops)
     * @param {object} out
     * @return {object} out
     */

    var coords, index, key, i;

    if ("nodeLookup" in out._ === false) {
      out._.nodeLookup = {};
    }
    if ("nodeCoord" in out._ === false) {
        out._.nodeCoord = {};
      }
    if ("node" in out.aquius === false) {
      out.aquius.node = [];
    }

    for (i = 0; i < out.gtfs.stops.length; i += 1) {
      if (out.gtfs.stops[i].stop_id in out._.nodeLookup === false &&
        out.gtfs.stops[i][out.gtfsHead.stops.stop_id] !== "" &&
        ("stopExclude" in out._ === false ||
        out.gtfs.stops[i][out.gtfsHead.stops.stop_id] in out._.stopExclude === false) &&
        ("stopInclude" in out._ === false ||
        out.gtfs.stops[i][out.gtfsHead.stops.stop_id] in out._.stopInclude)
      ) {
        coords = stopCoordinates(out, out.gtfs.stops[i]);

        if (out.config.allowZeroCoordinate ||
          (coords[0] !== 0 ||
          coords[1] !== 0)
        ) {

        out = checkStopCoordinates(out, coords, out.gtfs.stops[i][out.gtfsHead.stops.stop_id]);
        key = coords[0].toString() + "," + coords[1].toString();

          if (key in out._.nodeCoord) {
            index = out._.nodeCoord[key];
          } else {
            index = out.aquius.node.length;
            out.aquius.node.push([coords[0], coords[1], {}]);
            out._.nodeCoord[key] = index;
          }

          out._.nodeLookup[out.gtfs.stops[i][out.gtfsHead.stops.stop_id]] = index;
          out = createNodeProperties(out, out.gtfs.stops[i], index);
        }
      }
    }

    delete out._.nodeCoord;

    return out;
  }

  function getGtfsTimeSeconds(timeString) {
    /**
     * Helper: Get time in seconds after midnight for GTFS-formatted (nn:nn:nn) time
     * @param {string} timeString
     * @return {integer} seconds
     */

    var conversion,i;
    var timeArray = timeString.split(":");

    if (timeArray.length !== 3) {
      return 0;
        // Erroneous format
    }

    for (i = 0; i < timeArray.length; i += 1) {
      conversion = parseInt(timeArray[i], 10);
      if (Number.isNaN(conversion)) {
        return 0;
      }
      timeArray[i] = conversion;
    }

    return (timeArray[0] * 3600) + (timeArray[1] * 60) + timeArray[2];
  }

  function getGtfsDay(dateMS) {
    /**
     * Helper: Returns GTFS header day corresponding to date
     * @param {number} dateMS - milliseconds since epoch
     * @return {string} day name
     */

    var dateDate = new Date(dateMS);
    var days = ["sunday", "monday", "tuesday",
      "wednesday", "thursday", "friday", "saturday"];

    return days[dateDate.getDay()];
  }

  function createCalendar(out) {
    /**
     * Adds calendar lookups to out
     * @param {object} out
     * @return {object} out
     */ 

    var fromDateMS = unformatGtfsDate(out.config.fromDate);
    var toDateMS = unformatGtfsDate(out.config.toDate);

    out._.calendar = {};
      // MS date: GTFS date for all days analysed
    out._.calendarDay = {};
      // MS date: header day for all days analysed
    out._.calendarGtfs = {};
      // GTFS date: MS date for all days analysed

    while (toDateMS >= fromDateMS) {

      out._.calendar[fromDateMS] = formatGtfsDate(fromDateMS);
      out._.calendarDay[fromDateMS] = getGtfsDay(fromDateMS);
      out._.calendarGtfs[formatGtfsDate(fromDateMS)] = fromDateMS;

      fromDateMS += 864e5;
        // +1 day

    }

    return out;
  }

  function serviceCalendar(out) {
    /**
     * Returns service calendar, via GTFS calendar and/or calendar_dates
     * @param {object} out
     * @return {object} calendar - Service_id: {dateMS}
     */ 

    var datesMS, endDateMS, serviceId, startDateMS, i, j;
    var calendar = {};
      // Service_id: {dateMS: 1}

    if ("calendar" in out.gtfs) {
      // Some hacked GTFS archives skip calendar and use only calendar_dates

      datesMS = Object.keys(out._.calendarDay);

      for (i = 0; i < out.gtfs.calendar.length; i += 1) {

        serviceId = out.gtfs.calendar[i][out.gtfsHead.calendar.service_id];
        startDateMS = unformatGtfsDate(out.gtfs.calendar[i][out.gtfsHead.calendar.start_date]);
        endDateMS = unformatGtfsDate(out.gtfs.calendar[i][out.gtfsHead.calendar.end_date]);

        for (j = 0; j < datesMS.length; j += 1) {
          if (datesMS[j] >= startDateMS &&
            datesMS[j] <= endDateMS &&
            out.gtfs.calendar[i][out.gtfsHead.calendar[out._.calendarDay[datesMS[j]]]] === "1"
          ) {
            if (serviceId in calendar === false) {
              calendar[serviceId] = {};
            }
            calendar[serviceId][datesMS[j]] = "";
          }
        }

      }
    }

    if ("calendar_dates" in out.gtfs &&
     out.gtfsHead.calendar_dates.service_id !== -1 &&
     out.gtfsHead.calendar_dates.date !== -1 &&
     out.gtfsHead.calendar_dates.exception_type !== -1
    ) {

      for (i = 0; i < out.gtfs.calendar_dates.length; i += 1) {
        if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.date] in out._.calendarGtfs) {

          serviceId = out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id];

          if (serviceId in calendar === false) {
            calendar[serviceId] = {};
          }

          if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "1") {
            calendar[serviceId][out._.calendarGtfs[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.date]]] = "";
              // Add. Multiple same-date & same-service erroneous
          }

          if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "2" &&
            out._.calendarGtfs[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.date]]
              in calendar[serviceId]
          ) {
            delete calendar[serviceId][out._.calendarGtfs[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.date]]]
              // Remove
            if (Object.keys(calendar[serviceId]).length === 0) {
              delete calendar[serviceId];
                // Remove serviceId if empty
            }
          }

        }
      }

    }

    return calendar;
  }

  function frequentTrip(out) {
    /**
     * Returns frequent lookup. Allows duplicate checks to be skipped on frequent trips
     * @param {object} out
     * @return {object} frequent
     */ 

    var i;
    var frequent = {};
      // trip_id index

    if ("frequencies" in out.gtfs &&
      out.gtfsHead.frequencies.trip_id !== -1
    ) {
      for (i = 0; i < out.gtfs.frequencies.length; i += 1) {
        frequent[out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id]] = "";
          // Service/headway analysis will repeat loop later, once trips within analysis period are known
          // Generally GTFS frequencies is a short list, so little extra overhead in this first loop
      }
    }

    return frequent;
  }

  function baseTrip(out) {
    /**
     * Adds trip to out, prior to duplicate checks and service assignment
     * @param {object} out
     * @return {object} out
     */ 

    var headsign, tripId, tripObject, i;
    var block = {};
      // block_id: array of trips blocked
    var calendar = serviceCalendar(out);
    var frequent = frequentTrip(out);
    var tripBlock = [];
      // List of trip_id with blocks
    var routeExclude = {};
    var routeInclude = {};

    if (out.config.routeExclude.length > 0) {
      for (i = 0; i < out.config.routeExclude.length; i += 1) {
        routeExclude[out.config.routeExclude[i]] = "";
      }
    }

    if (out.config.routeInclude.length > 0) {
      for (i = 0; i < out.config.routeInclude.length; i += 1) {
        routeInclude[out.config.routeInclude[i]] = "";
      }
    }

    out._.trip = {};
      // trip_id: {service [numbers], stops [sequence, node], pickup [], setdown [], reference [], frequent, block}
    out._.routes = {};
      // route_id: {product, reference{n, c, u}}

    for (i = 0; i < out.gtfs.trips.length; i += 1) {

      tripObject = out.gtfs.trips[i];

      if (tripObject[out.gtfsHead.trips.service_id] in calendar &&
        (out.config.routeExclude.length === 0 ||
        tripObject[out.gtfsHead.trips.route_id] in routeExclude === false) &&
        (out.config.routeInclude.length === 0 ||
        tripObject[out.gtfsHead.trips.route_id] in routeInclude === true)
      ) {

        tripId = tripObject[out.gtfsHead.trips.trip_id];

        if (tripObject[out.gtfsHead.trips.route_id] in out._.routes === false) {
          out._.routes[tripObject[out.gtfsHead.trips.route_id]] = {};
            // Expanded by later function. Here serves to filter only required routes
        }

        out._.trip[tripId] = {
          "calendar": calendar[tripObject[out.gtfsHead.trips.service_id]],
          "route_id": tripObject[out.gtfsHead.trips.route_id],
          "service": [],
          "stops": []
        };
        
        if (out.gtfsHead.trips.direction_id !== -1) {
          out._.trip[tripId].direction_id = tripObject[out.gtfsHead.trips.direction_id];
        } else {
          out._.trip[tripId].direction_id = "";
        }

        if (tripId in frequent) {
          out._.trip[tripId].frequent = "";
        }

        if (out.gtfsHead.stop_times.pickup_type !== -1) {
          out._.trip[tripId].setdown = [];
            // Pickup_type tested for none, thus setdown only
        }

        if (out.gtfsHead.stop_times.drop_off_type !== -1) {
          out._.trip[tripId].pickup = [];
            // Drop_off_type tested for none, thus pickup only
        }

        if (out.gtfsHead.trips.block_id !== -1 &&
          tripObject[out.gtfsHead.trips.block_id] !== ""
        ) {
          // Block_id used later for evaluation of circular
          out._.trip[tripId].block = {
            "id": tripObject[out.gtfsHead.trips.block_id]
          };
            // Also "trips" key as array of all trip_id using this block, added later
          tripBlock.push(tripId);
          if (tripObject[out.gtfsHead.trips.block_id] in block) {
            block[tripObject[out.gtfsHead.trips.block_id]].push(tripId);
          } else {
            block[tripObject[out.gtfsHead.trips.block_id]] = [tripId];
          }
        }

        if (out.config.allowHeadsign === true &&
          out.gtfsHead.trips.trip_headsign !== -1
        ) {
          headsign = tripObject[out.gtfsHead.trips.trip_headsign].trim();
          if (headsign === "" &&
            out.gtfsHead.trips.trip_short_name !== -1
          ) {
            headsign = tripObject[out.gtfsHead.trips.trip_short_name].trim();
          }
          if (headsign !== "" ) {
            out._.trip[tripId].reference = {
              "n": headsign,
              "slug": headsign
            };
          }
        }

      }
    }

    for (i = 0; i < tripBlock.length; i += 1) {
      out._.trip[tripBlock[i]].block.trips = block[out._.trip[tripBlock[i]].block.id];
    }

    return out;
  }

  function timeTrip(out) {
    /**
     * Adds stops and timing to trips
     * @param {object} out
     * @return {object} out
     */ 

    var arrive, dates, depart, duplicate, key, lastDepart, node, stopObject, times, i, j, k, l;
    var timeCache = {};
      // TimeStrings cached temporarily for speed - times tend to be reused
    var trips = Object.keys(out.gtfs.stop_times);

    if (out.config.allowDuplicate === false ||
      out.config.allowSplit ||
      out.config.allowCabotage
    ) {
      duplicate = {};
        // dateMS: Unique key = node:time:dateMS:direction(:route): trip_id
    }

    for (i = 0; i < trips.length; i += 1) {
      if (trips[i] in out._.trip) {

        dates = Object.keys(out._.trip[trips[i]].calendar);
        lastDepart = null;

        for (j = 0; j < out.gtfs.stop_times[trips[i]].length; j += 1) {

          stopObject = out.gtfs.stop_times[trips[i]][j];

          if (stopObject[out.gtfsHead.stop_times.stop_id] in out._.nodeLookup &&
            (out._.trip[trips[i]].stops.length === 0 ||
            out._.trip[trips[i]].stops[out._.trip[trips[i]].stops.length - 1][1] !==
              out._.nodeLookup[stopObject[out.gtfsHead.stop_times.stop_id]])
            ) {
            // Excludes concurrent stops

            node = out._.nodeLookup[stopObject[out.gtfsHead.stop_times.stop_id]];
            arrive = 0;
            depart = 0;

            out._.trip[trips[i]].stops.push([
              stopObject[out.gtfsHead.stop_times.stop_sequence],
              node
            ]);

            if (out.gtfsHead.stop_times.pickup_type !== -1 &&
              stopObject[out.gtfsHead.stop_times.pickup_type] === "1"
            ) {
              out._.trip[trips[i]].setdown.push(out._.nodeLookup[stopObject[out.gtfsHead.stop_times.stop_id]]);
            }
            if (out.gtfsHead.stop_times.drop_off_type !== -1 &&
              stopObject[out.gtfsHead.stop_times.drop_off_type] === "1"
            ) {
              out._.trip[trips[i]
              ].pickup.push(out._.nodeLookup[stopObject[out.gtfsHead.stop_times.stop_id]]);
            }

            if ("frequent" in out._.trip[trips[i]] === false) {
              // Frequent trips initially untimed, and cannot be part of any duplication

              if (out.gtfsHead.stop_times.departure_time !== -1 &&
                stopObject[out.gtfsHead.stop_times.departure_time] !== ""
              ) {
                if (stopObject[out.gtfsHead.stop_times.departure_time] in timeCache === false) {
                  timeCache[stopObject[out.gtfsHead.stop_times.departure_time]] =
                    getGtfsTimeSeconds(stopObject[out.gtfsHead.stop_times.departure_time]);
                }
                depart = timeCache[stopObject[out.gtfsHead.stop_times.departure_time]];
                if ("start" in out._.trip[trips[i]] === false ||
                  depart < out._.trip[trips[i]].start
                ) {
                  out._.trip[trips[i]].start = depart;
                }
              }

              if (out.gtfsHead.stop_times.arrival_time !== -1 &&
                stopObject[out.gtfsHead.stop_times.arrival_time] !== ""
              ) {
                if (stopObject[out.gtfsHead.stop_times.arrival_time] in timeCache === false) {
                  timeCache[stopObject[out.gtfsHead.stop_times.arrival_time]] =
                    getGtfsTimeSeconds(stopObject[out.gtfsHead.stop_times.arrival_time]);
                }
                arrive = timeCache[stopObject[out.gtfsHead.stop_times.arrival_time]];
                if ("end" in out._.trip[trips[i]] === false ||
                  arrive > out._.trip[trips[i]].end
                ) {
                  out._.trip[trips[i]].end = arrive;
                }
              }

              if (typeof duplicate !== "undefined") {

                times = [];

                if (arrive !== 0 ||
                  depart !== 0
                ) {
                  times.push({
                    "key": [node, arrive, depart].join(":"),
                    "node": node
                  });
                }

                // Also keys for each time, since at nodes where joins occurs, only one time is shared
                // with second value = previous (for arrive) or next (for depart) node
                if (out.config.allowSplit === true &&
                  arrive !== 0 &&
                  out._.trip[trips[i]].stops.length > 1
                ) {
                  times.push({
                    "key": [node, arrive, out._.trip[trips[i]].stops[out._.trip[trips[i]].stops.length - 1]].join(":"),
                    "node": node
                  });
                }

                // Departure needs next node, so offset by 1 position in stop_times loop
                if (lastDepart !== null) {
                  // This position in loop evalulates previous
                  times.push({
                    "key": [node, lastDepart.key].join(":"),
                    "node": lastDepart.node
                  });
                }

                for (k = 0; k < times.length; k += 1) {

                  key = [times[k].key, out._.trip[trips[i]].direction_id];
                  if (out.config.duplicationRouteOnly) {
                    key.push(out._.trip[trips[i]].route_id);
                  }
                  key = key.join(":");

                  for (l = 0; l < dates.length; l += 1) {

                    if (dates[l] in duplicate === false) {
                      duplicate[dates[l]] = {};
                    }

                    if (key in duplicate[dates[l]]) {
                      if ("dup" in out._.trip[trips[i]] === false) {
                        out._.trip[trips[i]].dup = {
                          "stops": [],
                          "trip_id": duplicate[dates[l]][key]
                        };
                        // Each duplicate currently reference sole parent trip. Assumption could fail with mixed calendars
                      }
                      if (out._.trip[trips[i]].dup.stops.length === 0 ||
                        out._.trip[trips[i]].dup.stops.indexOf(times[k].node) === -1
                      ) {
                        // Infrequently called
                        out._.trip[trips[i]].dup.stops.push(times[k].node);
                      }
                      
                    } else {
                      duplicate[dates[l]][key] = trips[i];
                    }

                  }

                }

                if (out.config.allowSplit === true) {
                  if (depart !== 0) {
                    // Setup next in loop
                    lastDepart = {
                      "key": [depart, node].join(":"),
                      "node": node
                    };
                  } else {
                    lastDepart = null;
                  }
                }

              }
            }

          }

        }
      }
    }

    return out;
  }

  function duplicateTrip(out) {
    /**
     * Resolves trip duplication
     * @param {object} out
     * @return {object} out
     */ 

    var concurrentCount, dupCalendar, joinOk, keys, lastConcurrentIndex, parentCalendar, tripId, i, j;
    var nextB = 0;
    var trips = Object.keys(out._.trip);

    function equalArrays(a, b) {

      var i;

      if (a.length !== b.length) {
        return false;
      }

      for (i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
          return false;
        }
      }

      return true;
    }

    for (i = 0; i < trips.length; i += 1) {
      if ("dup" in out._.trip[trips[i]]) {

        tripId = out._.trip[trips[i]].dup.trip_id;
          // Original trip

        if (out._.trip[trips[i]].dup.stops.length > 1 &&
          tripId in out._.trip
        ) {
          // At least 2 stops duplicated

          parentCalendar = [];
            // Unique dates for parent
          keys = Object.keys(out._.trip[tripId].calendar);
          for (j = 0; j < keys.length; j += 1) {
            if (keys[j] in out._.trip[trips[i]].calendar === false) {
              parentCalendar.push(keys[j]);
            }
          }

          dupCalendar = [];
            // Unique dates for duplicate
          keys = Object.keys(out._.trip[trips[i]].calendar);
          for (j = 0; j < keys.length; j += 1) {
            if (keys[j] in out._.trip[tripId].calendar === false) {
              dupCalendar.push(keys[j]);
            }
          }

          if (out.config.allowCabotage &&
            parentCalendar.length === 0 &&
            dupCalendar.length === 0 &&
            (out.gtfsHead.stop_times.pickup_type !== -1 ||
            out.gtfsHead.drop_off_type !== -1) &&
            (("setdown" in out._.trip[trips[i]] &&
            out._.trip[trips[i]].setdown.length > 0 &&
            "setdown" in out._.trip[tripId] &&
            equalArrays(out._.trip[tripId].setdown, out._.trip[trips[i]].setdown) === false) ||
            ("pickup" in out._.trip[trips[i]] &&
            out._.trip[trips[i]].pickup.length > 0 &&
            "pickup" in out._.trip[tripId] &&
            equalArrays(out._.trip[tripId].pickup, out._.trip[trips[i]].pickup) === false))
          ) {
            // Same calendar (no unique dates in either) to process as Aquius block

            if ("b" in out._.trip[tripId]) {
              out._.trip[trips[i]].b = out._.trip[tripId].b;
            } else {
              out._.trip[tripId].b = nextB;
              out._.trip[trips[i]].b = nextB;
              nextB += 1;
            }

          } else {

            if (out.config.allowSplit &&
              out._.trip[trips[i]].dup.stops.length >= out.config.splitMinimumJoin &&
              out._.trip[trips[i]].dup.stops.length < out._.trip[trips[i]].stops.length
            ) {

              if (dupCalendar.length === 0) {
                // Commonly: Dup calendar entirely within parent, so apply split to dup 
                out._.trip[trips[i]].t = [];
                lastConcurrentIndex = -1;
                concurrentCount = 0;
                joinOk = false;
                for (j = 0; j < out._.trip[trips[i]].stops.length; j += 1) {
                  if (out._.trip[trips[i]].dup.stops.indexOf(out._.trip[trips[i]].stops[j][1]) === -1) {
                    // IndexOf unlikely to be used frequently or on long arrays
                    out._.trip[trips[i]].t.push(out._.trip[trips[i]].stops[j][1]);
                  } else {
                    if (j - 1 === lastConcurrentIndex) {
                      concurrentCount += 1;
                      if (concurrentCount === out.config.splitMinimumJoin) {
                        joinOk = true;
                      }
                    } else {
                      concurrentCount = 0
                    }
                    lastConcurrentIndex = j;
                  }
                }
                if (joinOk === false) {
                  delete out._.trip[trips[i]].t;
                }
              } else {
                if (parentCalendar.length === 0) {
                  // Unlikely: Parent calendar entirely within dup, so apply split to parent
                  out._.trip[tripId].t = [];
                  lastConcurrentIndex = -1;
                  concurrentCount = 0;
                  joinOk = false;
                  keys = {};
                    // Index of all duplicate trip's nodes. Rarely called, so built as required
                  for (j = 0; j < out._.trip[trips[i]].stops.length; j += 1) {
                    keys[out._.trip[trips[i]].stops[j][1]] = "";
                  }
                  for (j = 0; j < out._.trip[tripId].stops.length; j += 1) {
                    if (out._.trip[tripId].stops[j][1] in keys === false) {
                      out._.trip[tripId].t.push(out._.trip[tripId].stops[j][1]);
                    } else {
                      if (j - 1 === lastConcurrentIndex) {
                        concurrentCount += 1;
                        if (concurrentCount === out.config.splitMinimumJoin) {
                          joinOk = true;
                        }
                      } else {
                        concurrentCount = 0
                      }
                      lastConcurrentIndex = j;
                    }
                  }
                  if (joinOk === false) {
                    delete out._.trip[trips[i]].t;
                  }
                }
                // Else excessively complex split: Neither entirely in other's calendar, so fallback to retain full trip
              }

            } else {

              if (out.config.allowDuplication === false) {
                // Future: Logically should be treated as shared, but pointless if same product, which GTFS extraction presumes
                if (dupCalendar.length === 0) {
                  // Entire calendar within parent, so full trip redundant
                  delete out._.trip[trips[i]];
                } else {
                  // Retain duplicate only on its unique dates
                  out._.trip[trips[i]].calendar = {};
                  for (j = 0; j < dupCalendar.length; j += 1) {
                    out._.trip[trips[i]].calendar[dupCalendar[j]] = "";
                  }
                }
              }

            }

          }

        }
          // Else single stop duplication is not a valid link duplicate, so retain full trip
      }

    }

    return out;
  }

  function createDayFactor(out) {
    /**
     * Returns arrays of dates analysed by serviceFilter index position
     * @param {object} out
     * @return {array} dayFactor
     */

    var dayFactor, i, j, k;
    var allDays = Object.keys(out._.calendarDay);

    if ("serviceFilter" in out.config &&
      "period" in out.config.serviceFilter
    ) {
      dayFactor = [];
        // Arrays of dates analysed by serviceFilter index position
      for (i = 0; i < out.config.serviceFilter.period.length; i += 1) {

        if ("day" in out.config.serviceFilter.period[i]) {
          dayFactor.push([]);
          for (j = 0; j < out.config.serviceFilter.period[i].day.length; j += 1) {
            for (k = 0; k < allDays.length; k += 1) {
              if (out._.calendarDay[allDays[k]] === out.config.serviceFilter.period[i].day[j]) {
                dayFactor[i].push(allDays[k]);
              }
            }
          }
        } else {
          dayFactor.push(allDays);
        }

      }
      return dayFactor;
    } else {
      return [allDays];
    }
  }

  function createTimeFactor(out) {
    /**
     * Returns arrays of start, optional-end, one array of arrays per serviceFilter index position
     * @param {object} out
     * @return {array} timeFactor
     */

    var timeFactor, i, j;

    if ("serviceFilter" in out.config &&
      "period" in out.config.serviceFilter
    ) {
      timeFactor = [];
        // Arrays of start, optional-end, one array of arrays per serviceFilter index position
      for (i = 0; i < out.config.serviceFilter.period.length; i += 1) {

        if ("time" in out.config.serviceFilter.period[i]) {
          timeFactor.push([]);
          for (j = 0; j < out.config.serviceFilter.period[i].time.length; j += 1) {
            if ("start" in out.config.serviceFilter.period[i].time[j]){
              timeFactor[i].push([getGtfsTimeSeconds(out.config.serviceFilter.period[i].time[j].start)]);
            } else {
              timeFactor[i].push([0]);
                // All times (00:00:00 and after)
            }
            if ("end" in out.config.serviceFilter.period[i].time[j]){
              timeFactor[i][j].push(getGtfsTimeSeconds(out.config.serviceFilter.period[i].time[j].end));
            }
          }
        } else {
          timeFactor.push([[0]]);
        }

      }
      return timeFactor;
    } else {
      return [[[0]]];
    }
  }

  function serviceFrequencies(out, timeFactor) {
    /**
     * Applies service period calculation to frequent trips
     * @param {object} out
     * @param {object} timeFactor - as returned by createTimeFactor()
     * @return {object} out
     */

    var end, frequencies, frequenciesObject, keys, proportion, start, timeCache, tripId, i, j, k;

    if ("frequencies" in out.gtfs &&
      out.gtfsHead.frequencies.trip_id !== -1 &&
      out.gtfsHead.frequencies.start_time !== -1 &&
      out.gtfsHead.frequencies.end_time !== -1 &&
      out.gtfsHead.frequencies.headway_secs !== -1
    ) {

      frequencies = {};
        // trip_id: service array as time periods regardless of calendar
      timeCache = {};
        // GTFS time: MS time

      for (i = 0; i < out.gtfs.frequencies.length; i += 1) {

        frequenciesObject = out.gtfs.frequencies[i];
        tripId = frequenciesObject[out.gtfsHead.frequencies.trip_id];

        if (tripId in out._.trip &&
          "frequent" in out._.trip[tripId]
        ) {

          if (tripId in frequencies === false) {
            frequencies[tripId] = [];
            for (j = 0; j < timeFactor.length; j += 1) {
              frequencies[tripId].push(0);
            }
          }

          if (frequenciesObject[out.gtfsHead.frequencies.start_time] in timeCache === false) {
            timeCache[frequenciesObject[out.gtfsHead.frequencies.start_time]] =
              getGtfsTimeSeconds(frequenciesObject[out.gtfsHead.frequencies.start_time]);
              // TimeStrings cached for speed - times tend to be reused
          }
          start = timeCache[frequenciesObject[out.gtfsHead.frequencies.start_time]];
          if (frequenciesObject[out.gtfsHead.frequencies.end_time] in timeCache === false) {
            timeCache[frequenciesObject[out.gtfsHead.frequencies.end_time]] =
              getGtfsTimeSeconds(frequenciesObject[out.gtfsHead.frequencies.end_time]);
          }
          end = timeCache[frequenciesObject[out.gtfsHead.frequencies.end_time]];

          if (end < start) {
            end += 86400;
              // Spans midnight, add day of seconds.
          }

          for (j = 0; j < timeFactor.length; j += 1) {
            if (j < out._.trip[tripId].service.length &&
              out._.trip[tripId].service[j] !== 0
            ) {

              if (timeFactor[j].length === 1 &&
                timeFactor[j][0].length === 1 &&
                timeFactor[j][0][0] === 0
              ) {

                frequencies[tripId][j] +=
                  (end - start) / parseInt(frequenciesObject[out.gtfsHead.frequencies.headway_secs], 10);
                  // Whole day, add all

              } else {

                for (k = 0; k < timeFactor[j].length; k += 1) {
                  if (timeFactor[j][k][0] < end &&
                    (timeFactor[j][k].length === 1 ||
                    start < timeFactor[j][k][1])
                  ) {
                    // Frequency wholly or partly within Period. Else skip
                    proportion = 1;
                    if (timeFactor[j][k][0] > start) {
                      proportion = proportion - ((timeFactor[j][k][0] - start) / (end - start));
                    }
                    if (timeFactor[j][k][1] < end) {
                      proportion = proportion - ((end - timeFactor[j][k][1]) / (end - start));
                    }
                    frequencies[tripId][j] += (end - start) *
                      proportion / parseInt(frequenciesObject[out.gtfsHead.frequencies.headway_secs], 10);
                  }
                }

              }
            }
          }
        }
      }

      keys = Object.keys(frequencies);
      for (i = 0; i < keys.length; i += 1) {
        for (j = 0; j < frequencies[keys[i]].length; j += 1) {
          out._.trip[keys[i]].service[j] = out._.trip[keys[i]].service[j] * frequencies[keys[i]][j];
            // Assignment in secondary loop avoids confusing calendar during frequencies loop
        }
      }
    }

    return out;
  }

  function serviceTrip(out) {
    /**
     * Applies service total to trips
     * @param {object} out
     * @return {object} out
     */

    var dayCount, hour, inPeriod, time, i, j, k;
    var dayFactor = createDayFactor(out);
    var timeFactor = createTimeFactor(out);
    var trips = Object.keys(out._.trip);
    var scheduled = [];

    for (i = 0; i < timeFactor.length; i += 1) {
      scheduled.push(0);
    }

    out.summary.service = [];
      // Hour index position, service total by service array position

    for (i = 0; i < trips.length; i += 1) {

      if (out._.trip[trips[i]].stops.length < 2 ||
        Object.keys(out._.trip[trips[i]].calendar).length === 0
      ) {
        delete out._.trip[trips[i]];
          // Cleanup after duplicate checks best fits this loop
      } else {

        // calendar to service
        for (j = 0; j < dayFactor.length; j += 1) {
          dayCount = 0;
          for (k = 0; k < dayFactor[j].length; k += 1) {
            if (dayFactor[j][k] in out._.trip[trips[i]].calendar) {
              dayCount += 1;
            }
          }
          out._.trip[trips[i]].service.push((dayCount / dayFactor[j].length) * out.config.servicePer);
        }

        if ("frequent" in out._.trip[trips[i]] === false) {
          // Frequent adjusted 

          if ("start" in out._.trip[trips[i]] &&
            "end" in out._.trip[trips[i]]
          ) {
            time = ((out._.trip[trips[i]].end - out._.trip[trips[i]].start) / 2 ) + out._.trip[trips[i]].start;
              // Mid-journey time
          } else {
            time = null;
          }

          for (j = 0; j < timeFactor.length; j += 1) {
            if (j < out._.trip[trips[i]].service.length &&
              out._.trip[trips[i]].service[j] !== 0
            ) {
              // Else no service, so leave unchanged
            
              if ((timeFactor[j].length > 1 ||
                timeFactor[j][0].length > 1 ||
                timeFactor[j][0][0] !== 0)
              ) {
                // Else all time periods so leave unchanged but count in summary
                inPeriod = false;

                if (time !== null) {
                  // Else no time data, thus inPeriod remains false
                  for (k = 0; k < timeFactor[j].length; k += 1) {
                    if (time > timeFactor[j][k][0] &&
                      (timeFactor[j][k].length === 1 ||
                      time < timeFactor[j][k][1])
                    ) {
                      inPeriod = true;
                      break;
                    }
                  }
                }

                if (inPeriod == false) {
                out._.trip[trips[i]].service[j] = 0;
                }

              } else {
                inPeriod = true;
              }

              if (inPeriod) {
                scheduled[j] = scheduled[j] + 1;
                hour = Math.floor(time / 3600);
                if (out.summary.service[hour] === undefined) {
                  out.summary.service[hour] = [];
                  for (k = 0; k < timeFactor.length; k += 1) {
                    out.summary.service[hour].push(0);
                  }
                }
                out.summary.service[hour][j] = out.summary.service[hour][j] + 1;
              }
            }
          }
        }
      }

    }

    for (i = 0; i < out.summary.service.length; i += 1) {
      if (out.summary.service[i] !== undefined) {
        for (j = 0; j < out.summary.service[i].length; j += 1) {
          if (scheduled[j] > 0) {
            out.summary.service[i][j] = out.summary.service[i][j] / scheduled[j];
          }
        }
      }
    }

    out = serviceFrequencies(out, timeFactor);
      // Finally apply frequencies

    return out;
  }

  function createRoutes(out) {
    /**
     * Describes out._.routes GTFS route_id: complex Object describing route
     * @param {object} out
     * @return {object} out
     */

    var contentString, color, position, override, reference, route, routeId, wildcard, i, j;

    for (i = 0; i < out.gtfs.routes.length; i += 1) {

      route = out.gtfs.routes[i];
      routeId = route[out.gtfsHead.routes.route_id];

      if (routeId in out._.routes) {

        reference = {"slug": ""};
          // Slug is a temporary indexable unique reference

        if (out.config.networkFilter.type === "agency" &&
          out.gtfsHead.routes.agency_id !== -1 &&
          route[out.gtfsHead.routes.agency_id] in out.config.productOverride
        ) {
          override = out.config.productOverride[route[out.gtfsHead.routes.agency_id]];
        } else {
          if (out.config.networkFilter.type === "mode" &&
            out.gtfsHead.routes.route_type !== -1 &&
            route[out.gtfsHead.routes.route_type] in out.config.productOverride
          ) {
            override = out.config.productOverride[route[out.gtfsHead.routes.route_type]];
          } else {
            override = {};
          }
        }

        if (out.config.allowRoute ||
          out.config.allowRouteLong
        ) {

          contentString = "";

          if (out.config.allowRoute &&
            routeId in out.config.routeOverride &&
            "route_short_name" in out.config.routeOverride[routeId]
          ) {
            contentString = out.config.routeOverride[routeId].route_short_name;
          } else {
            if (out.config.allowRoute &&
              out.gtfsHead.routes.route_short_name !== -1
            ) {
              contentString = route[out.gtfsHead.routes.route_short_name].trim();
            }
          }
          if (out.config.allowRouteLong &&
            routeId in out.config.routeOverride &&
            "route_long_name" in out.config.routeOverride[routeId]
          ) {
            if (contentString !== "") {
              contentString += ": ";
            }
            contentString += out.config.routeOverride[routeId].route_long_name;
          } else {
            if (out.config.allowRouteLong &&
              out.gtfsHead.routes.route_long_name !== -1
            ) {
              if (contentString !== "") {
                contentString += ": ";
              }
              contentString += route[out.gtfsHead.routes.route_long_name].trim();
            }
          }

          if (contentString !== "") {
            reference.n = contentString;
            reference.slug += contentString;
          }

        }

        if (out.config.allowColor) {

          color = [["route_color", "c"], ["route_text_color", "t"]];
          for (j = 0; j < color.length; j += 1) {

            contentString = "";

            if (routeId in out.config.routeOverride &&
              color[j][0] in out.config.routeOverride[routeId]
            ) {
              contentString = out.config.routeOverride[routeId][color[j][0]];
            } else {
              if (color[j][0] in override) {
               contentString = override[color[j][0]];
              } else {
                if (out.gtfsHead.routes[color[j][0]] !== -1) {
                  contentString = route[out.gtfsHead.routes[color[j][0]]].trim();
                }
              }
            }

            if (contentString.length === 6) {

              contentString = "#" + contentString;
              out = addToReference(out, "color", contentString);

              if (color[j][1] === "t" &&
               "c" in reference &&
               reference.c === out._.color[contentString]
              ) {
                if (contentString.toLowerCase() === "#ffffff") {
                  contentString = "#000000";
                } else {
                  contentString = "#ffffff";
                }
                out = addToReference(out, "color", contentString);
              }

              reference[color[j][1]] = out._.color[contentString];
              reference.slug += contentString;

            }
          }

        }

        if (out.config.allowRouteUrl) {

          contentString = "";

          if (routeId in out.config.routeOverride &&
            "route_url" in out.config.routeOverride[routeId]
          ) {
            contentString = out.config.routeOverride[routeId].route_url;
          } else {
            if(out.gtfsHead.routes.route_url !== -1 ) {
              contentString = route[out.gtfsHead.routes.route_url].trim();
            }
          }

          if (contentString !== "") {

            wildcard = "[*]";
            position = contentString.lastIndexOf(wildcard);
              // Cannot use wildcard if already contains it (unlikely)

            if (position === -1 &&
              "n" in reference
            ) {
              position = contentString.lastIndexOf(
                reference.n);
                // Human logic: Name within URL format
              if (position !== -1) {
                contentString = contentString.substring(0, position) + wildcard +
                  contentString.substring(position + reference.n.length);
              }
            }

            if (position === -1) {
              position = contentString.lastIndexOf(routeId);
                // Operator logic: Internal ID within format
              if (position !== -1) {
                contentString = contentString.substring(0, position) + wildcard +
                  contentString.substring(position + routeId.length);
                reference.i =
                  routeId;
              }
            }

            out = addToReference(out, "url", contentString);
            reference.u = out._.url[contentString];
            reference.slug += contentString;

          }
        }

        if (out.config.networkFilter.type === "agency") {
          if("agency_id" in out.gtfsHead.routes &&
            out.gtfsHead.routes.agency_id !== -1
          ) {
            out._.routes[routeId].product =
              out._.productIndex[route[out.gtfsHead.routes.agency_id]];
          } else {
            out._.routes[routeId].product = 0;
          }

        } else {
          if (out.config.networkFilter.type === "mode" &&
            "route_type" in out.gtfsHead.routes &&
            out.gtfsHead.routes.route_type !== -1
          ) {
            out._.routes[routeId].product =
              out._.productIndex[route[out.gtfsHead.routes.route_type]];
          } else {
            out._.routes[routeId].product =
              out._.productIndex[Object.keys(out._.productIndex)[0]];
              // Fallback
          }
        }

        if (Object.keys(reference).length > 1) {
          // Contains more than lookup slug
          out._.routes[routeId].reference = reference;
        }

      }

    }

    delete out._.productIndex;

    return out;
  }

  function buildLink(out) {
    /**
     * Creates and populates aquius.link
     * @param {object} out
     * @return {object} out
     */

    var add, backward, blockNodes, check, forward, isBackward, keys, line, merge, nodeCount, nodes,
      nodeStack, reference, routeId, stops, thisLink, trips, i, j, k, l;
    var link = {};
      // linkUniqueId: {route array, product id, service count,
      // direction unless both, pickup array, setdown array, reference array}
    var skipTrip = {};
      // Trip_id index of trips to skip (since already processed via block group)

    function isCircular(out, routeId, trip, nodes) {

      var check, stops, target, i, j;

      function haversineDistance(lat1, lng1, lat2, lng2) {
        // Earth distance. Modified from Leaflet CRS.Earth.js

        var rad = Math.PI / 180;
        var sinDLat = Math.sin((lat2 - lat1) * rad / 2);
        var sinDLon = Math.sin((lng2 - lng1) * rad / 2);
        var a = sinDLat * sinDLat + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * sinDLon * sinDLon;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return 6371000 * c;
      }

      if (out.config.isCircular.length > 0) {
        if (routeId in out._.circular) {
          // Predefined circular, come what may
          return true;
        } else {
          // Circulars are defined and this is not one
          return false;
        }
      }

      if (nodes.length < 3 ||
        nodes[0] !== nodes[nodes.length -1]
      ) {
        // Start/end stops differ, or no intermediate stops
        return false;
      }

      if ("block" in trip &&
        trip.block.trips.length > 1
      ) {
        // Block had multiple trips. Circular if nodes are the same on all trips
        target = nodes.join(":");
        check = null;
        for (i = 0; i < trip.block.trips.length; i += 1) {
          if (trip.block.trips[i] in out._.trip) {
            stops = out._.trip[trip.block.trips[i]].stops.slice().sort(function(a, b) {
              return a[0] - b[0];
            });
            check = [];
            for (j = 0; j < stops.length; j += 1) {
              check.push(stops[j][1]);
            }
            if (check.join(":") !== target) {
              check = null;
              break;
            }
          }
        }
        if (check !== null) {
          return true;
        }
      }

      if (nodes.length < 5) {
        // Insufficient intermediate stops
        return false;
      }

      if (haversineDistance(out.aquius.node[nodes[1]][1], out.aquius.node[nodes[1]][0],
        out.aquius.node[nodes[nodes.length - 2]][1], out.aquius.node[nodes.length - 2][0]) > 200
      ) {
        // Stop after start and stop prior to end > 200 metres from each other
        return true;
      }

      return false;
    }

    function mergeService(serviceA, serviceB) {

      var service, i;

      if (serviceA.length === 1 &&
        serviceA.length === serviceB.length
      ) {
        // Fasters as saves looping
        return [serviceA[0] + serviceB[0]];
      }

      service = [];
      for (i = 0; i < serviceA.length; i += 1) {
        if (i < serviceB.length) {
          service.push(serviceA[i] + serviceB[i]);
        }
      }

      return service;
    }

    trips = Object.keys(out._.trip);
    for (i = 0; i < trips.length; i += 1) {

      routeId = out._.trip[trips[i]].route_id;

      if (trips[i] in skipTrip === false &&
        routeId in out._.routes &&
        "product" in out._.routes[routeId]
      ) {
        // Product check only fails if route_id was missing from GTFS routes

        isBackward = false;
        nodes = [];
        nodeCount = {};
          // Node:Count. Prevents inclusion in p/u/split where node occurs >1
        out._.trip[trips[i]].stops.sort(function(a, b) {
          return a[0] - b[0];
        });

        reference = {};
          // slug:reference
        if ("reference" in out._.routes[routeId] &&
          out._.routes[routeId].reference.slug in reference === false
        ) {
          reference[out._.routes[routeId].reference.slug] = out._.routes[routeId].reference;
        }
        if ("reference" in out._.trip[trips[i]] &&
          out._.trip[trips[i]].reference.slug in reference === false
        ) {
          reference[out._.trip[trips[i]].reference.slug] = out._.trip[trips[i]].reference;
        }

        if ("block" in out._.trip[trips[i]] &&
          out._.trip[trips[i]].block.trips.length > 1
        ) {
          /**
           * Blocked trips require same service and stop differences to be merged here
           * Trips with identical stop sequence will be evalulated later as circulars
           * Blocked trips with different calendars could break this logic,
           * but since service is the same, such a break should not impact on the final link totals
           * Note blocks rarely used, while imperfect block processing tends to fail gracefully,
           * since failed trips are retained separately (only the through-journey is lost)
           */
          merge = [];
            // TimeMS, nodes, tripId

          for (j = 0; j < out._.trip[trips[i]].block.trips.length; j += 1) {
            if (out._.trip[trips[i]].block.trips[j] in skipTrip === false &&
              out._.trip[trips[i]].block.trips[j] in out._.trip &&
              out._.trip[out._.trip[trips[i]].block.trips[j]].service.join(":")
                === out._.trip[trips[i]].service.join(":") &&
              out._.trip[out._.trip[trips[i]].block.trips[j]].route_id in out._.routes &&
              out._.routes[out._.trip[out._.trip[trips[i]].block.trips[j]].route_id].product
                === out._.routes[routeId].product &&
              "start" in out._.trip[out._.trip[trips[i]].block.trips[j]] &&
              "end" in out._.trip[out._.trip[trips[i]].block.trips[j]]
            ) {
              // Block.trips includes parent trip
              stops = out._.trip[out._.trip[trips[i]].block.trips[j]].stops.sort(function(a, b) {
                return a[0] - b[0];
              });
              blockNodes = [];
              for (k = 0; k < stops.length; k += 1) {
                blockNodes.push(stops[k][1]);
              }
              merge.push([(out._.trip[out._.trip[trips[i]].block.trips[j]].start +
                out._.trip[out._.trip[trips[i]].block.trips[j]].end) / 2,
                blockNodes, out._.trip[trips[i]].block.trips[j]]);
            }
          }

          if (merge.length > 1) {
            // Else only parent trip
            merge.sort(function(a, b) {
              return a[0] - b[0];
            });

            for (j = 0; j < merge.length; j += 1) {
              if (merge[j][1].length > 0) {
                if (nodes.length > 0 &&
                  merge[j][1][0] === nodes[nodes.length - 1]
                ) {
                  merge[j][1] = merge[j][1].slice(1);
                }
                nodes = nodes.concat(merge[j][1]);
                if (merge[j][2] !== trips[i]) {

                  skipTrip[merge[j][2]] = "";

                  check = ["t", "setdown", "pickup"];
                  for (k = 0; k < check.length; k += 1) {
                    if (check[k] in out._.trip[merge[j][2]]) {
                      if (check[k] in out._.trip[trips[i]] === false) {
                        out._.trip[trips[i]][check[k]] = [];
                      }
                      for (l = 0; l < out._.trip[merge[j][2]][check[k]].length; l += 1) {
                        if (out._.trip[trips[i]][check[k]].indexOf(out._.trip[merge[j][2]][check[k]][l]) === -1) {
                          // Likely never called. Block with splits or pickup/setdowns may be messy, but try
                          out._.trip[trips[i]][check[k]].push(out._.trip[merge[j][2]][check[k]][l]);
                        }
                      }
                    }
                  }

                  if (out._.trip[merge[j][2]].route_id in out._.routes &&
                    "reference" in out._.routes[out._.trip[merge[j][2]].route_id] &&
                    out._.routes[out._.trip[merge[j][2]].route_id].reference.slug in reference === false
                  ) {
                    reference[out._.routes[out._.trip[merge[j][2]].route_id].reference.slug] =
                      out._.routes[out._.trip[merge[j][2]].route_id].reference;
                  }
                  if ("reference" in out._.trip[merge[j][2]] &&
                    out._.trip[merge[j][2]].reference.slug in reference === false
                  ) {
                    reference[out._.trip[merge[j][2]].reference.slug] = out._.trip[merge[j][2]].reference;
                  }

                  // Service/product remains as parent. Ignores any b (unlikely scenario)
                }
              }
            }
          }
        }

        forward = "f" + out._.routes[routeId].product;
        if (out.config.mirrorLink) {
          backward = "f" + out._.routes[routeId].product;
        }

        if ("setdown" in out._.trip[trips[i]] &&
          out._.trip[trips[i]].setdown.length > 0
        ) {
          out._.trip[trips[i]].setdown.sort();
          forward += "s" + out._.trip[trips[i]].setdown.join(":");
        }

        if ("pickup" in out._.trip[trips[i]] &&
          out._.trip[trips[i]].pickup.length > 0
        ) {
          out._.trip[trips[i]].pickup.sort();
          forward += "u" + out._.trip[trips[i]].pickup.join(":");
          if (out.config.mirrorLink) {
            backward += "s" + out._.trip[trips[i]].pickup.join(":");
            // Pickup processed as setdown in reverse
          }
        }

        if (out.config.mirrorLink &&
          "setdown" in out._.trip[trips[i]] &&
          out._.trip[trips[i]].setdown.length > 0
        ) {
          backward += "u" + out._.trip[trips[i]].setdown.join(":");
          // Setdown processed as pickup in reverse
        }

        if ("t" in out._.trip[trips[i]]) {
          forward += "t" + out._.trip[trips[i]].t.join(":");
          if (out.config.mirrorLink) {
            backward += "t" + out._.trip[trips[i]].t.join(":");
          }
        }

        if (nodes.length === 0) {
          add = true;
        } else {
          add = false;
        }
        for (j = 0; j < out._.trip[trips[i]].stops.length; j += 1) {
          if (add) {
            nodes.push(out._.trip[trips[i]].stops[j][1]);
          }
          if (out._.trip[trips[i]].stops[j][1] in nodeCount) {
            nodeCount[out._.trip[trips[i]].stops[j][1]] += 1; 
          } else {
            nodeCount[out._.trip[trips[i]].stops[j][1]] = 1;
          }
        }

        if (out.config.mirrorLink) {
          backward = nodes.slice().reverse().join(":") + backward;
        }
        forward = nodes.join(":") + forward;

        if (forward in link &&
          "b" in out._.trip[trips[i]] === false
        ) {

          link[forward].service = mergeService(link[forward].service, out._.trip[trips[i]].service);

        } else {

          if (out.config.mirrorLink &&
            backward in link &&
            "b" in out._.trip[trips[i]] === false
          ) {

            isBackward = true;
            link[backward].service = mergeService(link[backward].service, out._.trip[trips[i]].service);

            if ("direction" in link[backward]) {
              delete link[backward].direction;
            }

          } else {

            link[forward] = {
              "direction": 1,
              "product": out._.routes[routeId].product,
              "route": nodes,
              "service": out._.trip[trips[i]].service
            };

            if ("setdown" in out._.trip[trips[i]]) {
              nodeStack = [];
              for (j = 0; j < out._.trip[trips[i]].setdown.length; j += 1) {
                if (out._.trip[trips[i]].setdown[j] in nodeCount &&
                  nodeCount[out._.trip[trips[i]].setdown[j]] === 1
                ) {
                  nodeStack.push(out._.trip[trips[i]].setdown[j]);
                }
              }
              if (nodeStack.length > 0) {
                link[forward].setdown = nodeStack;
              }
            }
            if ("pickup" in out._.trip[trips[i]]) {
              nodeStack = [];
              for (j = 0; j < out._.trip[trips[i]].pickup.length; j += 1) {
                if (out._.trip[trips[i]].pickup[j] in nodeCount &&
                  nodeCount[out._.trip[trips[i]].pickup[j]] === 1
                ) {
                  nodeStack.push(out._.trip[trips[i]].pickup[j]);
                }
              }
              if (nodeStack.length > 0) {
                link[forward].pickup = nodeStack;
              }
            }
            if (isCircular(out, routeId, out._.trip[trips[i]], nodes)) {
              link[forward].circular = 1;
            }
            if ("b" in out._.trip[trips[i]]) {
              link[forward].b = out._.trip[trips[i]].b;
                // Currently .b are always unique links
            }
            if ("t" in out._.trip[trips[i]]) {
              nodeStack = [];
              for (j = 0; j < out._.trip[trips[i]].t.length; j += 1) {
                if (out._.trip[trips[i]].t[j] in nodeCount &&
                  nodeCount[out._.trip[trips[i]].t[j]] === 1
                ) {
                  nodeStack.push(out._.trip[trips[i]].t[j]);
                }
              }
              if (nodeStack.length > 0) {
                link[forward].t = nodeStack;
              }
            }
          }
        }

        keys = Object.keys(reference);
        if (keys.length > 0) {

          if (isBackward &&
            "reference" in link[backward] === false
          ) {
            link[backward].reference = [];
            link[backward].referenceLookup = {};
          }
          if (isBackward == false &&
            "reference" in link[forward] === false
          ) {
            link[forward].reference = [];
            link[forward].referenceLookup = {};
          }

          for (j = 0; j < keys.length; j += 1) {
            if (isBackward &&
              keys[j] in link[backward].referenceLookup === false
            ) {
              link[backward].reference.push(reference[keys[j]]);
              link[backward].referenceLookup[keys[j]] = "";
            }
            if (isBackward === false &&
              keys[j] in link[forward].referenceLookup === false
            ) {
              link[forward].reference.push(reference[keys[j]]);
              link[forward].referenceLookup[keys[j]] = "";
            }
          }
        }

      }
    }

    delete out._.nodeLookup;
    delete out._.routes;
    delete out._.trip;

    out.aquius.link = [];
    out.summary.network = [];
      // Indexed by networkFilter, content array of service by serviceFilter index

    for (i = 0; i < out.aquius.network.length; i += 1) {
      if ("service" in out.aquius) {
        out.summary.network.push([]);
        for (j = 0; j < out.aquius.service.length; j += 1) {
          out.summary.network[i].push(0);
        }
      } else {
        out.summary.network.push([0]);
      }
    }

    keys = Object.keys(link);

    for (i = 0; i < keys.length; i += 1) {

      thisLink = link[keys[i]];

      for (j = 0; j < thisLink.service.length; j += 1) {

        for (k = 0; k < out.aquius.network.length; k += 1) {
          if (out.aquius.network[k][0].indexOf(thisLink.product) !== -1) {
            out.summary.network[k][j] += thisLink.service[j];
          }
        }
        
        if (thisLink.service[j] < 10) {
          thisLink.service[j] = parseFloat(thisLink.service[j].toPrecision(1));
        } else {
          thisLink.service[j] = parseInt(thisLink.service[j], 10);
        }
      }

      line = [
        [thisLink.product],
        thisLink.service,
        thisLink.route,
        {}
      ];

      if ("reference" in thisLink) {
        for (j = 0; j < thisLink.reference.length; j += 1) {
          delete thisLink.reference[j].slug;
        }
        line[3].r = thisLink.reference;
      }
      if ("color" in thisLink) {
        line[3].o = thisLink.color;
      }
      if ("circular" in thisLink) {
        line[3].c = 1;
      }
      if ("direction" in thisLink) {
        line[3].d = 1;
      }
      if ("pickup" in thisLink) {
        line[3].u = thisLink.pickup;
      }
      if ("setdown" in thisLink) {
        line[3].s = thisLink.setdown;
      }
      if ("t" in thisLink) {
        line[3].t = thisLink.t;
      }
      if ("b" in thisLink) {
        line[3].b = thisLink.b;
      }

      out.aquius.link.push(line);

    }

    out.aquius.link.sort(function (a, b) {
      return b[1].reduce(function(c, d) {
        return c + d;
      }, 0) - a[1].reduce(function(c, d) {
        return c + d;
      }, 0);
    });
      // Descending service count, since busiest most likely to be queried and thus found faster

    for (i = 0; i < out.summary.network.length; i += 1) {
      for (j = 0; j < out.summary.network[i].length; j += 1) {
        out.summary.network[i][j] = Math.round(out.summary.network[i][j]);
      }
    }

    delete out._.dayFactor;

    return out;
  }

  function optimiseNode(out) {
    /**
     * Assigns most frequently referenced nodes to lowest indices and removes unused nodes
     * @param {object} out
     * @return {object} out
     */

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
      nodeArray.push([nodeOccurance[keys[i]], keys[i]]);
    }
    nodeArray.sort(function(a, b) {
      return a[0] - b[0];
    });
    nodeArray.reverse();

    newNode = [];
      // As aquius.node
    newNodeLookup = {};
      // OldNodeIndex: NewNodeIndex
    for (i = 0; i < nodeArray.length; i += 1) {
      newNode.push(out.aquius.node[nodeArray[i][1]]);
      newNodeLookup[nodeArray[i][1]] = i;
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

  function isPointInFeature(x, y, feature) {
    /**
     * Helper: Check if x,y point is in GeoJSON feature. Supports Polygon, MultiPolygon
     * @param {float} x - x (longitude) coordinate
     * @param {float} y - y (latitude) coordinate
     * @param {object} feature - single GeoJSON feature array
     * @return {boolean}
     */

    var i;

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

    if ("geometry" in feature === false ||
      "type" in feature.geometry === false ||
      "coordinates" in feature.geometry === false ||
      !Array.isArray(feature.geometry.coordinates)
    ) {
      return false;
    }

    if (feature.geometry.type === "MultiPolygon") {
      for (i = 0; i < feature.geometry.coordinates.length; i += 1) {
        if (isPointInPolygon(x, y, feature.geometry.coordinates[i])) {
          return true;
        }
      }
    }

    if (feature.geometry.type === "Polygon") {
      return isPointInPolygon(x, y, feature.geometry.coordinates);
    }
      // Future: Extendable for other geometries, such as nearest point
    return false;
  }

  function getCentroidFromFeature(feature) {
    /**
     * Helper: Calculate centroid of GeoJSON feature. Supports Polygon, MultiPolygon
     * @param {object} feature - single GeoJSON feature array
     * @return {array} [x,y], or null if geometry not supported
     */

    var i;
    var bounds = {};

    function getCentroidFromPolygon(polygonArray, bounds) {

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

    if ("geometry" in feature &&
      "type" in feature.geometry &&
      "coordinates" in feature.geometry &&
      Array.isArray(feature.geometry.coordinates)
    ) {

      if (feature.geometry.type === "MultiPolygon") {
         for (i = 0; i < feature.geometry.coordinates.length; i += 1) {
           bounds = getCentroidFromPolygon(feature.geometry.coordinates[i], bounds);
         }
      }

      if (feature.geometry.type === "Polygon") {
         bounds = getCentroidFromPolygon(feature.geometry.coordinates, bounds);
      }
        // Future: Extendable for other geometry types
    }

    if ("maxX" in bounds) {
      return [(bounds.maxX + bounds.minX) / 2, (bounds.maxY + bounds.minY) / 2];
        // Unweighted centroids
    } else {
      return null;
    }
  }

  function buildPlace(out, options) {
    /**
     * Creates and populates aquius.place
     * @param {object} out
     * @param {object} options
     * @return {object} out
     */

    var centroid, checked, content, index, key, keys, lastDiff, node, population, xyDiff, i, j;
    var centroidStack = {};
      // For efficient searching = GeojsonLine: {x, y}
    var centroidKeys = [];
      // Names of centroidStack. Saves repeat Object.keys
    var nodeStack = [];
      // For efficient searching = x+y, nodeIndex
    var thisPlace = -1;
      // GeojsonLine
    var precision = Math.pow(10, out.config.coordinatePrecision);
    var previousPlace = 0;
      // GeojsonLine
    var placeCoordStack = {};
      // "x:y": aquius.place index, prevents duplication of coordinates
    var placeStack = {};
      // aquius.place: GeojsonLine:aquius.place index
    var maxPopulation = 0;
    var removeNode = {};
      // Index of node indices to be removed from lookup, making them invisible for links

    out.aquius.place = [];
      // x, y, {p: population}

    if (typeof options === "object" &&
      "geojson" in options &&
      "type" in options.geojson &&
      options.geojson.type === "FeatureCollection" &&
      "features" in options.geojson &&
      Array.isArray(options.geojson.features) &&
      options.geojson.features.length > 0
    ) {

      for (i = 0; i < options.geojson.features.length; i += 1) {
        centroid = getCentroidFromFeature(options.geojson.features[i]);
        if (centroid !== null) {
          centroidKeys.push(i);
          centroidStack[i] = {
            "x": Math.round(centroid[0] * precision) / precision,
            "y": Math.round(centroid[1] * precision) / precision
          };
        }
      }

      for (i = 0; i < out.aquius.node.length; i += 1) {
        nodeStack.push([
          out.aquius.node[i][0] + out.aquius.node[i][1],
          i
        ])
      }
      nodeStack.sort();
        // Tends to group neighbours, improving chance of thisPlace = previousPlace below

      for (i = 0; i < nodeStack.length; i += 1) {

        thisPlace = -1;
        node = out.aquius.node[nodeStack[i][1]];

        if (isPointInFeature(node[0], node[1], options.geojson.features[previousPlace])) {
          // Often the next node is near the last, so check the last result first
          thisPlace = previousPlace;

        } else {

          checked = {};
          checked[previousPlace] = previousPlace;

          for (j = 0; j < centroidKeys.length; j += 1) {

            xyDiff = Math.abs((node[0] + node[1]) -
              (centroidStack[centroidKeys[j]].x + centroidStack[centroidKeys[j]].y));
            if (j === 0) {
              lastDiff = xyDiff;
            }

            if (lastDiff >= xyDiff &&
              centroidKeys[j] in checked === false
            ) {
              // Only consider closer centroids than the prior failures. PreviousPlace already checked
              if (isPointInFeature(node[0], node[1], options.geojson.features[centroidKeys[j]])
              ) {
                thisPlace = centroidKeys[j];
                break;
              }
              checked[centroidKeys[j]] = centroidKeys[j];
              if (Object.keys(checked).length < 5) {
                // First 5 iterations tend to give an optimal search radius
                lastDiff = xyDiff;
              }
            }

          }

          if (thisPlace === -1) {
            // Low proportion will default to this inefficient loop
            for (j = 0; j < options.geojson.features.length; j += 1) {

              if (j in checked === false &&
                isPointInFeature(node[0], node[1], options.geojson.features[j])
              ) {
                thisPlace = j;
                break;
              }

            }
          }

        }

        if (thisPlace !== -1) {
          previousPlace = thisPlace;
          if (thisPlace in placeStack) {
            // Existing place
            out.aquius.node[nodeStack[i][1]][2].p = placeStack[thisPlace];
          } else {

            // New place
            if (thisPlace in centroidStack) {
              key = [centroidStack[thisPlace].x, centroidStack[thisPlace].y].join(":");
              if (key in placeCoordStack) {
                index = placeCoordStack[key];
              } else {
                out.aquius.place.push([
                  centroidStack[thisPlace].x,
                  centroidStack[thisPlace].y,
                  {}
                ]);
                index = out.aquius.place.length - 1;
                placeCoordStack[key] = index;
              }
              out.aquius.node[nodeStack[i][1]][2].p = index;
              placeStack[thisPlace] = index;

              if ("properties" in options.geojson.features[thisPlace] &&
                out.config.populationProperty in options.geojson.features[thisPlace].properties
              ) {
                population = parseFloat(options.geojson.features[thisPlace].properties[out.config.populationProperty]);
                if (!Number.isNaN(population)) {
                  if ("p" in out.aquius.place[index][2] === false) {
                    out.aquius.place[index][2].p = 0;
                  }
                  out.aquius.place[index][2].p += population;
                  if (out.aquius.place[index][2].p > maxPopulation) {
                    maxPopulation = out.aquius.place[index][2].p;
                  }
                }
              }

              if ("properties" in options.geojson.features[thisPlace] &&
                out.config.placeNameProperty in options.geojson.features[thisPlace].properties &&
                options.geojson.features[thisPlace].properties[out.config.placeNameProperty] !== null
              ) {
                content = {};
                content.n = options.geojson.features[thisPlace].properties[out.config.placeNameProperty].trim();
                if (content.n !== "") {
                  if ("r" in out.aquius.place[index][2] === false) {
                    out.aquius.place[index][2].r = [];
                  }
                  out.aquius.place[index][2].r.push(content);
                }
                
              }

            }

          }
        } else {

          if (out.config.inGeojson === true) {
            removeNode[nodeStack[i][1]] = "";
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
      
      if (Object.keys(removeNode).length > 0) {
        keys = Object.keys(out._.nodeLookup);
        for (i = 0; i < keys.length; i += 1) {
          if (out._.nodeLookup[keys[i]] in removeNode) {
            delete out._.nodeLookup[keys[i]];
          }
        }
      }

    }

    return out;
  }

  function exitProcess(out, options) {
    /**
     * Called to exit
     * @param {object} out - internal data references
     * @param {object} options
     */

    var error;

    delete out._;
    delete out.gtfs;
    delete out.gtfsHead;

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
  out = parseGtfs(out, gtfs);
  gtfs = null;
    // Allow memory to be freed?

  if ("error" in out) {
    return exitProcess(out, options);
  }

  out = buildHeader(out);
  out = buildNetwork(out);
  out = buildService(out);

  out = stopFilter(out);
  out = parentStopsToNode(out);
  out = transferStopsToNode(out);
  out = regularStopsToNode(out);

  out = buildPlace(out, options);

  out = createCalendar(out);
  out = baseTrip(out);
  out = timeTrip(out);
  out = duplicateTrip(out);
  out = serviceTrip(out);
  out = createRoutes(out);
  out = buildLink(out);

  out = optimiseNode(out);

  return exitProcess(out, options);
}


};
// EoF
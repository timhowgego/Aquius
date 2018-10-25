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

  function createTabulation(tableData, tableHeader, tableDataStyle) {
    /**
     * Helper: Creates table DOM
     * @param {object} tableData - array (rows) of arrays (cell content)
     * @param {object} tableHeader - array of header cell names
     * @param {object} tableDataStyle - optional array of data cell styles
     * @return {object} DOM element
     */

    var td, tr, i, j;
    var table = createElement("table");

    if (tableHeader.length > 0) {
      tr = createElement("tr");
      for (i = 0; i < tableHeader.length; i += 1) {
        tr.appendChild(createElement("th", {
          "textContent": tableHeader[i].toString()
        }));
      }
      table.appendChild(tr);
    }

    for (i = 0; i < tableData.length; i += 1) {
      tr = createElement("tr");
      for (j = 0; j < tableData[i].length; j += 1) {
        td = createElement("td", {
          "textContent": tableData[i][j].toString()
        });
        if (tableDataStyle !== undefined &&
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

  function initialiseUI(vars) {
    /**
     * Creates user interface in its initial state
     * @param {object} vars - internal data references (including configId)
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
      "textContent": "GTFS as .txt, optional config, and optional GeoJSON to process:"
    });
    
    button = createElement("input", {
      "id": vars.configId + "ImportFiles",
      "multiple": "multiple",
      "name": vars.configId + "ImportFiles[]",
      "type": "file"
    });
    button.addEventListener("change", (function(){
      initialiseProcess(vars);
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

    var error, reader, i;
    var gtfs = {};
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var options = {
      "_vars": vars,
      "callback": outputProcess
    };
    var processedFiles = 0;
    var progressDOM = document.getElementById(vars.configId + "Progress");
    var totalFiles = 0;

    function loadFiles(files) {

      totalFiles = files.length;

      for (i = 0; i < totalFiles; i += 1) {
        reader = new FileReader();
        reader.onerror = (function(theFile) {
          error = new Error("Could not read " + theFile.name);
          reader.abort();
        });
        reader.onload = (function(theFile) {
          return function() {
            onLoad(theFile.name, this.result);
            onLoadEnd();
          };
        })(files[i]);
        reader.readAsText(files[i]);
      }
    }

    function onLoad(filename, result) {

      var extension, json;
      var filenameParts = filename.toLowerCase().split(".");
      
      if (filenameParts.length > 1) {
        extension = filenameParts.pop();
      } else {
        extension = "txt";
          // Fallback
      }
      
      try {

        switch (extension) {

          case "csv":
          case "txt":
            gtfs[filenameParts.join("")] = result;
            break;

          case "geojson":
          case "js":
          case "json":
            json = JSON.parse(result);
            if ("type" in json &&
              json.type === "FeatureCollection"
            ) {
              options.geojson = json;
            } else {
              options.config = json;
            }
            break;

          default:
            break;

        }

      } catch(err) {
        error = err;
      }
    }

    function onLoadEnd() {
      processedFiles += 1;
      if (processedFiles === totalFiles) {
        if (error !== undefined) {
          outputError(error, vars);
        } else {
          vars.process(gtfs, options);
        }
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

    var keys, tableData, tableDataRow, i, j;
    var vars = options._vars;
    var fileDOM = document.getElementById(vars.configId + "ImportFiles");
    var outputDOM = document.getElementById(vars.configId + "Output");
    var progressDOM = document.getElementById(vars.configId + "Progress");

    if (error !== undefined) {
      outputError(error, vars);
      return false;
    }

    if (!outputDOM ||
      !progressDOM)
    {
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

    if (typeof aquius !== "undefined") {
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

    if ("aquius" in out &&
      "network" in out.aquius &&
      "link" in out.aquius
    ) {

      tableData = [];
      for (i = 0; i < out.aquius.network.length; i += 1) {

        tableDataRow = [];

        if ("en-US" in out.aquius.network[i][1]) {
          tableDataRow.push(out.aquius.network[i][1]["en-US"]);
        } else {
          tableDataRow.push(JSON.stringify(out.aquius.network[i][1]));
        }

        tableDataRow.push(0, 0);
        for (j = 0; j < out.aquius.link.length; j += 1) {
          if (out.aquius.network[i][0].indexOf(out.aquius.link[j][0][0]) !== -1) {
            // Code only outputs one product per link, thus always index 0
            tableDataRow[1] += 1;
            tableDataRow[2] += out.aquius.link[j][1].reduce(function(a, b) {
              return a + b;
            }, 0);
          }
        }
        tableDataRow[1] = Math.round(tableDataRow[1]);
        tableDataRow[2] = Math.round(tableDataRow[2]);

        tableData.push(tableDataRow);
      }

      outputDOM.appendChild(createTabulation(tableData, ["Network", "Routes", "Services"],
        [vars.configId + "Text", vars.configId + "Number", vars.configId + "Number"]));
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
  });
},


"process": function process(gtfs, options) {
  /**
   * Creates Aquius dataObject. May be called independently
   * @param {object} gtfs - key per GTFS file slug, value raw text content of GTFS file
   * @param {object} options - geojson, config, callback
   * @return {object} without callback: possible keys aquius, config, error, gtfs, gtfsHead
   * with callback: callback(error, out, options)
   */
  "use strict";

  var out = {};

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
      "allowColor": true,
        // Include route-specific colors if available
      "allowName": true,
        // Include stop names (increases file size)
      "allowRoute": true,
        // Include route-specific short names
      "allowURL": true,
        // Include stop and service URLs (increases file size)
      "fromDate": formatGtfsDate(Date.now()),
        // Start date for service pattern analysis (inclusive)
      "meta": {
        "schema": "0"
      },
        // As Data Structure meta key
      "option": {},
        // As Data Structure/Configuration option key
      "populationProperty": "population",
        // Field name in GeoJSON properties containing the number of people
      "productFilter": {
        "type": "agency"
      },
        // Group services by, including network definitions (see docs)
      "servicePer": 1,
        // Service average per period in days (1 gives daily totals, 7 gives weekly totals)
      "toDate": formatGtfsDate(Date.now() + 5184e5),
        // End date for service pattern analysis (inclusive), thus +6 days for 1 week
      "translation": {}
        // As Data Structure/Configuration translation key
    };
    var keys = Object.keys(defaults);

    out.config = {};

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

  function parseCsv(csv) {
    /**
     * Helper: Parses CSV string into multi-array
     * Modified from Jezternz. Runtime about 1 second per 20MB of data
     * @param {string} csv
     * @return {object} multi-array of lines[columns]
     */

    var pattern = new RegExp(("(\\,|\\r?\\n|\\r|^)(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\\,\\r\\n]*))"),"gi");
    var matches = pattern.exec(csv);
    var output = [[]];

    csv = csv.trim();

    while (matches !== null) {
      if (matches[1].length && matches[1] !== ",") {
        output.push([]);
      }
      output[output.length - 1].push(matches[2] ?
        matches[2].replace(new RegExp( "\"\"", "g" ), "\"") :
        matches[3]);
      matches = pattern.exec(csv);
    }

    return output;
  }

  function parseGtfs(out, gtfs) {
    /**
     * Parse gtfs strings into out.gtfs, columns defined in out.gtfsHead
     * @param {object} out
     * @param {object} gtfs
     * @return {object} out
     */

    var content, keys, required, i, j;

    out.gtfsHead = {
      // Numbers record column position, or -1 if missing
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
        "route_color": -1,
        "route_id": -1,
        "route_long_name": -1,
        "route_short_name": -1,
        "route_text_color": -1,
        "route_url": -1
      },
      "stop_times": {
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
        "route_id": -1,
        "service_id": -1,
        "trip_id": -1
      }
    };

    required = {
      // Files and fields that MUST be present
      "routes": ["route_id"],
      "stops": ["stop_id", "stop_lat", "stop_lon"],
      "trips": ["route_id", "service_id", "trip_id"],
      "stop_times": ["trip_id", "stop_id", "stop_sequence"]
    };

    if ("type" in out.config.productFilter &&
      out.config.productFilter.type === "agency"
    ) {
      out.gtfsHead.agency = {
        "agency_id": -1,
        "agency_name": -1
      };
      out.gtfsHead.routes.agency_id = -1;
    }
    if ("type" in out.config.productFilter &&
      out.config.productFilter.type === "mode"
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

    out.gtfs = {};

    keys = Object.keys(out.gtfsHead);
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in gtfs) {
        content = parseCsv(gtfs[keys[i]]);
        if (content.length > 1) {
          // Header plus a data line
          for (j = 0; j < content[0].length; j += 1) {
            if (content[0][j] in out.gtfsHead[keys[i]]) {
              out.gtfsHead[keys[i]][content[0][j]] = j;
            }
          }
          out.gtfs[keys[i]] = content.splice(1);
        }
      }
    }

    keys = Object.keys(required);
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in out.gtfs === false) {
        if ("error" in out === false) {
          out.error = [];
        }
        out.error.push("Missing GTFS "+ keys[i] + ".txt");
      } else {
        if (keys[i] in out.gtfsHead) {
          for (j = 0; j < required[keys[i]].length; j += 1) {
            if (required[keys[i]][j] in out.gtfsHead[keys[i]] === false ||
              out.gtfsHead[keys[i]][required[keys[i]][j]] === -1
            ) {
              if ("error" in out === false) {
                out.error = [];
              }
              out.error.push("Missing value " + required[keys[i]][j]  + " in GTFS "+ keys[i] + ".txt");
            }
          }
        }
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

    if ("aquius" in out === false) {
      out.aquius = {};
    }

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
        out.gtfsHead.feed_info.feed_publisher_name !== -1
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
      out.gtfsHead.feed_info.feed_publisher_url !== -1
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
     * Creates out.aquius.network from config.productFilter
     * @param {object} out
     * @return {object} out
     */

    var route, i, j;
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

    if ("type" in out.config.productFilter === false) {
      out.config.productFilter.type = "agency";
    }
    if ("index" in out.config.productFilter === false ||
      typeof out.config.productFilter.index !== "object"
    ) {
      out.config.productFilter.index = [];
    }

    switch (out.config.productFilter.type) {
      // Extendable for more product filters. Add complementary code to wanderRoutes()

      case "mode":
        if ("route_type" in out.gtfsHead.routes &&
          out.gtfsHead.routes.route_type !== -1
        ) {
          for (i = 0; i < out.gtfs.routes.length; i += 1) {
            if (out.config.productFilter.index.indexOf(out.gtfs.routes[i][out.gtfsHead.routes.route_type]) === -1) {
              out.config.productFilter.index.push(out.gtfs.routes[i][out.gtfsHead.routes.route_type]);
            }
          }
        }
        break;

      case "agency":
      default:
        out.config.productFilter.type = "agency";
          // Defaults to agency
        if ("agency" in out.gtfs &&
          "agency_id" in out.gtfsHead.agency &&
          out.gtfsHead.agency.agency_id !== 1
        ) {
          for (i = 0; i < out.gtfs.agency.length; i += 1) {
            if (out.config.productFilter.index.indexOf(out.gtfs.agency[i][out.gtfsHead.agency.agency_id]) === -1) {
              out.config.productFilter.index.push(out.gtfs.agency[i][out.gtfsHead.agency.agency_id]);
            }
          }
        } else {
          out.config.productFilter.index.push("agency");
            // Uncoded single agency GTFS
        }
        break;

    }

    if ("network" in out.config.productFilter === false ||
      !Array.isArray(out.config.productFilter.network)
    ) {
      out.config.productFilter.network = [];

      switch (out.config.productFilter.type) {
        // Extendable for more product filters

        case "mode":
          out.config.productFilter.network.push([
            out.config.productFilter.index,
              // Config references GTFS Ids
            {"en-US": "All modes"}
          ]);
          if (out.config.productFilter.index.length > 1) {
            for (i = 0; i < out.config.productFilter.index.length; i += 1) {
              if (out.config.productFilter.index[i] in modeLookup) {
                out.config.productFilter.network.push([
                  [out.config.productFilter.index[i]],
                  modeLookup[out.config.productFilter.index[i]]
                ]);
              } else {
                out.config.productFilter.network.push([
                  [out.config.productFilter.index[i]],
                  {"en-US": "Mode #"+ out.config.productFilter.index[i]}
                ]);
              }
            }
          }
          break;

        case "agency":
          out.config.productFilter.network.push([
            out.config.productFilter.index,
            {"en-US": "All operators"}
          ]);
          if (out.config.productFilter.index.length > 1) {
            for (i = 0; i < out.config.productFilter.index.length; i += 1) {
              if ("agency" in out.gtfs &&
                out.gtfsHead.agency.agency_id !== -1 &&
                out.gtfsHead.agency.agency_name !== -1
              ) {
                for (j = 0; j < out.gtfs.agency.length; j += 1) {
                  if (out.gtfs.agency[j][out.gtfsHead.agency.agency_id] === out.config.productFilter.index[i]) {
                    out.config.productFilter.network.push([
                      [out.config.productFilter.index[i]],
                      {"en-US": out.gtfs.agency[j][out.gtfsHead.agency.agency_name]}
                    ]);
                    break;
                  }
                }
              } else {
                out.config.productFilter.network.push([
                  [out.config.productFilter.index[i]],
                  {"en-US": out.config.productFilter.index[i]}
                ]);
              }
            }
          }
          break;

        default:
          // Fallback only
          out.config.productFilter.network.push([
            out.config.productFilter.index,
            {"en-US": "All"}
          ]);
          break;

      }

    }

    if ("aquius" in out === false) {
      out.aquius = {};
    }
    out.aquius.network = [];

    for (i = 0; i < out.config.productFilter.network.length; i += 1) {
      if (out.config.productFilter.network[i].length > 1 &&
        Array.isArray(out.config.productFilter.network[i][0]) &&
        typeof out.config.productFilter.network[i][1] === "object"
      ) {
        route = [];
        for (j = 0; j < out.config.productFilter.network[i][0].length; j += 1) {
          route.push(out.config.productFilter.index.indexOf(
            out.config.productFilter.network[i][0][j]));
        }
        out.aquius.network.push([route, out.config.productFilter.network[i][1], {}]);
      }
    }

    return out;
  }

  function createNodeProperties(out, stopObject) {
    /**
     * Helper: Create node property key, with key "r" if relevant contents in stopObject
     * @param {object} out
     * @param {object} stopObject - gtfs.stops array (line)
     * @return {object} "r" key
     */

    var properties = {};

    if (out.config.allowName === true &&
      out.gtfsHead.stops.stop_name !== -1 &&
      stopObject[out.gtfsHead.stops.stop_name].trim() !== ""
    ) {
      properties.n = stopObject[out.gtfsHead.stops.stop_name].trim();
      if (out.gtfsHead.stops.stop_code !== -1 &&
        stopObject[out.gtfsHead.stops.stop_code].trim() !== ""
      ) {
        properties.n += " (" + stopObject[out.gtfsHead.stops.stop_code].trim() +")";
      }
    }

    if (out.config.allowURL === true &&
      out.gtfsHead.stops.stop_url !== -1 &&
      stopObject[out.gtfsHead.stops.stop_url].trim() !== ""
    ) {
      properties.u = stopObject[out.gtfsHead.stops.stop_url].trim();
    }

    if (Object.keys(properties).length > 0) {
      return {"r": [properties]};
    }
    return {};
  }

  function forceCoordinate(coord) {
    /**
     * Helper: Forces value into a number rounded to 5 decimal places
     * @param {string} coord - raw number as string
     * @return {float} coordinate
     */

    coord = parseFloat(coord);
    if (Number.isNaN(coord)) {
      return 0;
    }

    return Math.round(coord * 1e5) / 1e5;
      // Round to 5 decimal places
  }

  function parentStopsToNode(out) {
    /**
     * Parses gtfs.stops parent stations and groups nodes within together
     * @param {object} out
     * @return {object} out
     */

    var i;
    var childStops = [];
      // stop_id, parent_id

    if (out.gtfsHead.stops.location_type !== -1 &&
      out.gtfsHead.stops.parent_station !== -1
    ) {

      if ("nodeLookup" in out === false) {
        out.nodeLookup = {};
        // Lookup of GTFS stop_id: out.aquius.node index
      }
      if ("aquius" in out === false) {
        out.aquius = {};
      }
      if ("node" in out.aquius === false) {
        out.aquius.node = [];
      }

      for (i = 0; i < out.gtfs.stops.length; i += 1) {
        if (out.gtfs.stops[i][out.gtfsHead.stops.location_type] === "1") {
          // Is parent
          out.nodeLookup[out.gtfs.stops[i][out.gtfsHead.stops.stop_id]] = out.aquius.node.length;
          out.aquius.node.push([
            forceCoordinate(out.gtfs.stops[i][out.gtfsHead.stops.stop_lon]),
            forceCoordinate(out.gtfs.stops[i][out.gtfsHead.stops.stop_lat]),
            createNodeProperties(out, out.gtfs.stops[i])
          ]);
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

      for (i = 0; i < childStops.length; i += 1) {
        if (childStops[i][1] in out.nodeLookup) {
          // Else no parent, so stop should be processed elsewhere
          out.nodeLookup[childStops[i][0]] = out.nodeLookup[childStops[i][1]];
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

    var fromStop, toStop, i, j;

    if ("transfers" in out.gtfs &&
      out.gtfsHead.transfers.from_stop_id !== -1 &&
      out.gtfsHead.transfers.to_stop_id !== -1 &&
      out.gtfsHead.transfers.transfer_type !== 1
    ) {
      // Transfer pairs are logically grouped together, even where actual transfer is forbidden

      if ("nodeLookup" in out === false) {
        out.nodeLookup = {};
        // Lookup of GTFS stop_id: out.aquius.node index
      }
      if ("aquius" in out === false) {
        out.aquius = {};
      }
      if ("node" in out.aquius === false) {
        out.aquius.node = [];
      }

      for (i = 0; i < out.gtfs.transfers.length; i += 1) {
        if (out.gtfs.transfers[i][out.gtfsHead.transfers.from_stop_id] !== "") {
          fromStop = out.nodeLookup[out.gtfs.transfers[i][out.gtfsHead.transfers.from_stop_id]];
          toStop = out.nodeLookup[out.gtfs.transfers[i][out.gtfsHead.transfers.to_stop_id]];

          if (fromStop !== toStop) {
            if (fromStop !== undefined &&
              toStop !== undefined) {
              // Could merge stops, but already clearly assigned as stations, so leave as separate
            } else {
              if (fromStop !== undefined) {
                // Add toStop to fromStop
                out.nodeLookup[toStop] = fromStop;
              } else {
                if (toStop !== undefined) {
                  // Add fromStop to toStop
                  out.nodeLookup[fromStop] = toStop;
                } else {
                  if (fromStop === undefined &&
                    toStop === undefined) {
                    // Add new stop
                    for (j = 0; j < out.gtfs.stops.length; j += 1) {

                      if (out.gtfs.stops[j][out.gtfsHead.stops.stop_id] === fromStop) {
                        out.nodeLookup[fromStop] = out.aquius.node.length;
                        out.nodeLookup[toStop] = out.aquius.node.length;
                        out.aquius.node.push([
                          forceCoordinate(out.gtfs.stops[j][out.gtfsHead.stops.stop_lon]),
                          forceCoordinate(out.gtfs.stops[j][out.gtfsHead.stops.stop_lat]),
                          createNodeProperties(out, out.gtfs.stops[j])
                        ]);
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

    return out;
  }

  function regularStopsToNode(out) {
    /**
     * Parses gtfs.stops for unprocessed nodes (call after parentStops and transferStops)
     * @param {object} out
     * @return {object} out
     */

    var i;

    if ("nodeLookup" in out === false) {
      out.nodeLookup = {};
      // Lookup of GTFS stop_id: out.aquius.node index
    }
    if ("aquius" in out === false) {
      out.aquius = {};
    }
    if ("node" in out.aquius === false) {
      out.aquius.node = [];
    }

    for (i = 0; i < out.gtfs.stops.length; i += 1) {
      if (out.gtfs.stops[i].stop_id in out.nodeLookup === false &&
        out.gtfs.stops[i][out.gtfsHead.stops.stop_id] !== "") {
        out.nodeLookup[out.gtfs.stops[i][out.gtfsHead.stops.stop_id]] = out.aquius.node.length;
        out.aquius.node.push([
          forceCoordinate(out.gtfs.stops[i][out.gtfsHead.stops.stop_lon]),
          forceCoordinate(out.gtfs.stops[i][out.gtfsHead.stops.stop_lat]),
          createNodeProperties(out, out.gtfs.stops[i])
        ]);
      }
    }

    return out;
  }

  function createServiceDays(out) {
    /**
     * Creates lookup of GTFS service_id: total days operated in analysed period
     * @param {object} out
     * @return {object} service_id: total days
     */

    var dates, dayCount, endToDateMS, startDateMS, today, i, j;
    var serviceDays = {};
    var calendarDates = {};
      // All formatted days to be sampled date:millseconds
    var fromDateMS = unformatGtfsDate(out.config.fromDate);
    var toDateMS = unformatGtfsDate(out.config.toDate);

    function getGtfsDay(dateMS) {
      // Returns GTFS header day corresponding to milliseconds since epoch

      var days = ["sunday", "monday", "tuesday",
        "wednesday", "thursday", "friday", "saturday"];
      var dateDate = new Date(dateMS);

      return days[dateDate.getDay()];
    }

    while (toDateMS >= fromDateMS) {
      calendarDates[formatGtfsDate(fromDateMS)] = fromDateMS;
      fromDateMS += 864e5;
    }

    if ("calendar" in out.gtfs) {
      // Some hacked GTFS archives skip calendar and use only calendar_dates

      for (i = 0; i < out.gtfs.calendar.length; i += 1) {

        dayCount = 0;
        startDateMS = unformatGtfsDate(out.gtfs.calendar[i][out.gtfsHead.calendar.start_date]);
        endToDateMS = unformatGtfsDate(out.gtfs.calendar[i][out.gtfsHead.calendar.end_date]);

        dates = Object.keys(calendarDates);
        for (j = 0; j < dates.length; j += 1) {
          if (calendarDates[dates[j]] >= startDateMS &&
            calendarDates[dates[j]] <= endToDateMS
          ) {
            today = parseInt(out.gtfs.calendar[i][out.gtfsHead.calendar[getGtfsDay(calendarDates[dates[j]])]], 10);
            if (!Number.isNaN(today)) {
              dayCount += today;
            }
          }
        }

        if (dayCount > 0) {
          serviceDays[out.gtfs.calendar[i][out.gtfsHead.calendar.service_id]] = dayCount;
        }

      }

    }

    if ("calendar_dates" in out.gtfs &&
     out.gtfsHead.calendar_dates.service_id !== -1 &&
     out.gtfsHead.calendar_dates.date !== -1 &&
     out.gtfsHead.calendar_dates.exception_type !== -1
    ) {

      for (i = 0; i < out.gtfs.calendar_dates.length; i += 1) {
        if (calendarDates[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.date]] !== undefined) {

          if (serviceDays[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] === undefined) {
            // New service
            if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "1") {
              serviceDays[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] = 1;
            }
            // Else erroneous subtraction from non-existing service
          } else {
            if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "1") {
              // Add at index
              serviceDays[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] += 1;
            }
            if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "2") {
              // Subtract at index
              if (serviceDays[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] === 1) {
                // Subtract would zero service, so remove
                delete serviceDays[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]];
              } else {
                serviceDays[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] =
                  serviceDays[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] - 1;
              }
            }
          }

        }
      }

    }

    return serviceDays;
  }

  function getDiffSeconds(startTimeString, endTimeString) {
    /**
     * Helper: Get time difference in seconds between two GTFS-formatted (nn:nn:nn) times
     * @param {string} startTimeString
     * @param {string} endTimeString
     * @return {integer} seconds
     */

      function getTimeSeconds(timeString) {

        var conversion, i;
        var timeArray = timeString.split(":");

        if (timeArray.length < 3) {
          return -1;
            // Erroneous format
        }
        for (i = 0; i < timeArray.length; i += 1) {
          conversion = parseInt(timeArray[i], 10);
          if (Number.isNaN(conversion)) {
            return -1;
          }
          timeArray[i] = conversion;
        }
        return (timeArray[0] * 3600) + (timeArray[1] * 60) + timeArray[2];
      }

      var startTime = getTimeSeconds(startTimeString);
      var endTime = getTimeSeconds(endTimeString);

      if (startTime > endTime) {
        // Rolls over midnight
        return endTime - startTime - 86400;
      } else {
        return endTime - startTime;
      }
    }

  function createFrequencies(out) {
    /**
     * Creates lookup of GTFS trip_id: service total for frequent services
     * @param {object} out
     * @return {object} trip_id: service total
     */

    var i, service;
    var frequencies = {};

    if ("frequencies" in out.gtfs &&
      out.gtfsHead.frequencies.trip_id !== -1 &&
      out.gtfsHead.frequencies.start_time !== -1 &&
      out.gtfsHead.frequencies.end_time !== -1 &&
      out.gtfsHead.frequencies.headway_secs !== -1
    ) {
       for (i = 0; i < out.gtfs.frequencies.length; i += 1) {
         service = getDiffSeconds(
           out.gtfs.frequencies[i][out.gtfsHead.frequencies.start_time],
           out.gtfs.frequencies[i][out.gtfsHead.frequencies.end_time]
         ) / parseInt(out.gtfs.frequencies[i][out.gtfsHead.frequencies.headway_secs], 10);
         if (out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id] in frequencies) {
           frequencies[out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id]] += service;
         } else {
           frequencies[out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id]] = service;
         }
       }
    }

    return frequencies;
  }

  function createTrip(out, frequencies, serviceDays) {
    /**
     * Creates lookup of GTFS trip_id: complex Object describing trip
     * @param {object} out
     * @param {object} frequencies - as createFrequencies()
     * @param {object} serviceDays - as createServiceDays()
     * @return {object} trip_id: {service integer, stops [sequence, node], pickup only [], setdown only []}
     */

    var i;
    var trip = {};

    for (i = 0; i < out.gtfs.trips.length; i += 1) {
      if (serviceDays[out.gtfs.trips[i][out.gtfsHead.trips.service_id]] > 0) {

        trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]] = {
          "stops": []
        };
        if (out.gtfs.trips[i][out.gtfsHead.trips.trip_id] in frequencies) {
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service =
            frequencies[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]] *
            serviceDays[out.gtfs.trips[i][out.gtfsHead.trips.service_id]];
        } else {
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service =
            serviceDays[out.gtfs.trips[i][out.gtfsHead.trips.service_id]];
        }
        if (out.gtfsHead.stop_times.pickup_type !== -1) {
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown = [];
            // Pickup_type tested for none, thus setdown only
        }
        if (out.gtfsHead.stop_times.drop_off_type !== -1) {
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup = [];
            // Drop_off_type tested for none, thus pickup only
        }

      }
    }

    for (i = 0; i < out.gtfs.stop_times.length; i += 1) {
      if (trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]] !== undefined) {
        if ((trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].stops.length === 0 ||
          trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]]
            .stops[trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].stops.length - 1] !==
            out.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]) &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id] in out.nodeLookup
        ) {
          // Else concurrent stops

          trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].stops.push([
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_sequence],
            out.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]
          ]);

          if (out.gtfsHead.stop_times.pickup_type !== -1 &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.pickup_type] === "1"
          ) {
            trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].setdown.push(
              out.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]
            );
          }

          if (out.gtfsHead.stop_times.drop_off_type !== -1 &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.drop_off_type] === "1"
          ) {
            trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].pickup.push(
              out.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]
            );
          }

        }
      }
    }

    return trip;
  }

  function createRoutes(out) {
    /**
     * Creates lookup of GTFS route_id:: complex Object describing route
     * @param {object} out
     * @return {object} route_id: {product, reference{n, c, u}}
     */

    var i;
    var routes = {};

    for (i = 0; i < out.gtfs.routes.length; i += 1) {
      routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]] = {};

      routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference = {
        "slug": ""
          // Slug is a temporary indexable unique reference
      };

      if (out.config.allowRoute === true) {
        if (out.gtfsHead.routes.route_short_name !== -1 &&
          out.gtfs.routes[i][out.gtfsHead.routes.route_short_name].trim() !== ""
        ) {
          routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.n =
            out.gtfs.routes[i][out.gtfsHead.routes.route_short_name].trim();
          routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
            out.gtfs.routes[i][out.gtfsHead.routes.route_short_name].trim();
        } else {
          // Long name only if short name unavailable
          if (out.config.allowName === true &&
            out.gtfsHead.routes.route_long_name !== -1 &&
            out.gtfs.routes[i][out.gtfsHead.routes.route_long_name].trim() !== ""
          ) {
            routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.n =
              out.gtfs.routes[i][out.gtfsHead.routes.route_long_name].trim();
            routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
              out.gtfs.routes[i][out.gtfsHead.routes.route_long_name].trim();
          }
        }
      }

      if (out.config.allowColor === true &&
        out.gtfsHead.routes.route_color !== -1 &&
        out.gtfs.routes[i][out.gtfsHead.routes.route_color].trim() !== ""
      ) {
        routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.c =
          out.gtfs.routes[i][out.gtfsHead.routes.route_color].trim();
        routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
          out.gtfs.routes[i][out.gtfsHead.routes.route_color].trim();
      }

      if (out.config.allowColor === true &&
        out.gtfsHead.routes.route_text_color !== -1 &&
        out.gtfs.routes[i][out.gtfsHead.routes.route_text_color].trim() !== ""
      ) {
        routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.t =
          out.gtfs.routes[i][out.gtfsHead.routes.route_text_color].trim();
        routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
          out.gtfs.routes[i][out.gtfsHead.routes.route_text_color].trim();
      }

      if (out.config.allowURL === true &&
        out.gtfsHead.routes.route_url !== -1 &&
        out.gtfs.routes[i][out.gtfsHead.routes.route_url].trim() !== ""
      ) {
        routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.u =
          out.gtfs.routes[i][out.gtfsHead.routes.route_url].trim();
        routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
          out.gtfs.routes[i][out.gtfsHead.routes.route_url].trim();
      }

      if (out.config.productFilter.type === "agency") {
        if("agency_id" in out.gtfsHead.routes &&
          out.gtfsHead.routes.agency_id !== -1
        ) {
          routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product =
            out.config.productFilter.index.indexOf(out.gtfs.routes[i][out.gtfsHead.routes.agency_id]);
        } else {
          routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product = 0;
        }

      } else {
        if (out.config.productFilter.type === "mode" &&
          "route_type" in out.gtfsHead.routes &&
          out.gtfsHead.routes.route_type !== -1
        ) {
          routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product =
            out.config.productFilter.index.indexOf(out.gtfs.routes[i][out.gtfsHead.routes.route_type]);
        } else {
          routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product =
            out.config.productFilter.index[0];
            // Fallback
        }
      }
    }

    return routes;
  }

  function createLink(out, trip, routes) {
    /**
     * Creates lookup of unique link reference: complex Object describing link
     * @param {object} out
     * @param {object} trip - as createTrip()
     * @param {object} routes - as createRoutes()
     * @return {object} linkUniqueId: {route array, product id, service count,
     *   direction unless both, pickup array, setdown array, reference array}
     */

    var backward, forward, nodes, i, j;

    function isCircular(nodes) {
      // Returns 1 if route is circular

      var inner, i;

      if (nodes.length < 3 ||
        nodes[0] !== nodes[nodes.length -1]
      ) {
        return 0;
      }

      inner = nodes.slice(1, nodes.length - 2);
      for (i = 0; i < inner.length; i += 1) {
        if (inner.indexOf(inner[i]) !== inner.lastIndexOf(inner[i])) {
          // Different results from front and back means not unique
          return 0;
        }
      }

      return 1;
    }

    var link = {};

    for (i = 0; i < out.gtfs.trips.length; i += 1) {
      if (out.gtfs.trips[i][out.gtfsHead.trips.trip_id] in trip) {

        nodes = [];
        trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].stops.sort(function(a, b) {
          return a[0] - b[0];
        });
        for (j = 0; j < trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].stops.length; j += 1) {
          nodes.push(trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].stops[j][1]);
        }

        forward = "f" + routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].product;

        if (out.gtfsHead.stop_times.pickup_type !== -1 &&
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.length > 0
        ) {
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.sort();
          forward += "s" + trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.join(":");
        }

        if (out.gtfsHead.stop_times.drop_off_type !== -1 &&
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.length > 0
        ) {
          trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.sort();
          forward += "p" + trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.join(":");
        }

        backward = nodes.slice().reverse().join(":") + forward;
        forward = nodes.join(":") + forward;

        if (forward in link) {

          link[forward].service += trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service;
          if ("reference" in routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]] &&
            Object.keys(routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference).length > 1 &&
            link[forward].referenceLookup.indexOf(
              routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug) === -1
          ) {
            // Length 1 is slug only, which will be subsequently removed
            link[forward].reference.push(routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference);
            link[forward].referenceLookup.push(routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug);
          }

        } else {

          if (backward in link) {

            link[backward].service += trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service;
            if ("reference" in routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]]   &&
              Object.keys(routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference).length > 1 &&
              link[backward].referenceLookup.indexOf(
                routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug) === -1
            ) {
              link[backward].reference.push(routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference);
              link[backward].referenceLookup.push(routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug);
            }
            if ("direction" in link[backward]) {
              delete link[backward].direction;
            }

          } else {

            link[forward] = {
              "direction": 1,
              "product": routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].product,
              "route": nodes,
              "service": trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service
            };
            if ("reference" in routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]] &&
              Object.keys(routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference).length > 1
            ) {
              link[forward].reference = [routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference]
              link[forward].referenceLookup = [routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug];
            }

            if (out.gtfsHead.stop_times.pickup_type !== -1 &&
              trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.length > 0
            ) {
              link[forward].setdown = trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown;
            }
            if (out.gtfsHead.stop_times.drop_off_type !== -1 &&
              trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.length > 0
            ) {
              link[forward].pickup = trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup;
            }
            if (isCircular(nodes)) {
              link[forward].circular = 1;
            }

          }
        }

      }
    }

    return link;
  }

  function buildLink(out, link) {
    /**
     * Creates and populates aquius.link
     * @param {object} out
     * @param {object} link - as createLink()
     * @return {object} out
     */

    var line, service, i, j;
    var keys = Object.keys(link);
    var serviceFactor = out.config.servicePer /
      (1 + ((unformatGtfsDate(out.config.toDate) - unformatGtfsDate(out.config.fromDate)) / 864e5));
      // Day plus difference start to end milliseconds to days
    
    if ("aquius" in out === false) {
      out.aquius = {};
    }
    out.aquius.link = [];

    for (i = 0; i < keys.length; i += 1) {

      service = link[keys[i]].service * serviceFactor;
      if (service < 1) {
        service = parseFloat(service.toPrecision(1));
      } else {
        service = parseInt(service, 10);
      }

      line = [
        [link[keys[i]].product],
          // Products assigned uniquely, since GTFS normally describes individual product+vehicle journeys
        [service],
          // @todo Service time period filtering
        link[keys[i]].route,
        {}
      ];

      if ("reference" in link[keys[i]]) {
        for (j = 0; j < link[keys[i]].reference.length; j += 1) {
          delete link[keys[i]].reference[j].slug;
        }
        if (Object.keys(link[keys[i]].reference).length > 0) {
          line[3].r = link[keys[i]].reference;
        }
      }
      if ("color" in link[keys[i]]) {
        line[3].o = link[keys[i]].color;
      }
      if ("circular" in link[keys[i]]) {
        line[3].c = 1;
      }
      if ("direction" in link[keys[i]]) {
        line[3].d = 1;
      }
      if ("pickup" in link[keys[i]]) {
        line[3].u = link[keys[i]].pickup;
      }
      if ("setdown" in link[keys[i]]) {
        line[3].s = link[keys[i]].setdown;
      }
        // Future: Add shared/split? Would need to analysis whole schedule to assess overlaps
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
     * @return {object} with x and y keyed, or null if geometry not supported
     */

    var i;
    var bounds = {};

    function getCentroidFromPolygon(polygonArray) {

      var i, j;
      var bounds = {};

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
           bounds = getCentroidFromPolygon(feature.geometry.coordinates[i]);
         }
      }

      if (feature.geometry.type === "Polygon") {
         bounds = getCentroidFromPolygon(feature.geometry.coordinates);
      }
        // Future: Extendable for other geometry types
    }

    if ("maxX" in bounds) {
      return {
        "x": Math.round(((bounds.maxX + bounds.minX) / 2) * 1e5) / 1e5,
        "y": Math.round(((bounds.maxY + bounds.minY) / 2) * 1e5) / 1e5
          // Unweighted centroids. Rounded to 5 decimal places
      };
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

    var centroid, checked, lastDiff, nodeIndex, population, xyDiff, i, j;
    var centroidStack = {};
      // For efficient searching = GeojsonLine: {x, y}
    var centroidKeys = [];
      // Names of centroidStack. Saves repeat Object.keys
    var nodeStack = [];
      // For efficient searching = x+y, nodeIndex
    var thisPlace = -1;
      // GeojsonLine
    var previousPlace = 0;
      // GeojsonLine
    var placeStack = [];
      // Index = aquius.place, value = GeojsonLine:aquius.place index
    var maxPopulation = 0;

    if ("aquius" in out === false) {
      out.aquius = {};
    }
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
          centroidStack[i] = centroid;
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

        if (isPointInFeature(out.aquius.node[nodeStack[i][1]][0],
          out.aquius.node[nodeStack[i][1]][1], options.geojson.features[previousPlace])) {
          // Often the next node is near the last, so check the last result first
          thisPlace = previousPlace;

        } else {

          checked = [previousPlace];

          for (j = 0; j < centroidKeys.length; j += 1) {

            xyDiff = Math.abs((out.aquius.node[nodeStack[i][1]][0] +
              out.aquius.node[nodeStack[i][1]][1]) -
              (centroidStack[centroidKeys[j]].x +
              centroidStack[centroidKeys[j]].y));
            if (j === 0) {
              lastDiff = xyDiff;
            }

            if (lastDiff >= xyDiff &&
              checked.indexOf(centroidKeys[j]) === -1
            ) {
              // Only consider closer centroids than the prior failures. PreviousPlace already checked
              if (isPointInFeature(out.aquius.node[nodeStack[i][1]][0],
                out.aquius.node[nodeStack[i][1]][1], options.geojson.features[centroidKeys[j]])
              ) {
                thisPlace = centroidKeys[j];
                break;
              }
              checked.push(centroidKeys[j]);
              if (checked.length < 5) {
                // First 5 iterations tend to give an optimal search radius
                lastDiff = xyDiff;
              }
            }

          }

          if (thisPlace === -1) {
            // Low proportion will default to this inefficient loop
            for (j = 0; j < options.geojson.features.length; j += 1) {

              if (checked.indexOf(j) === -1 &&
                isPointInFeature(out.aquius.node[nodeStack[i][1]][0],
                  out.aquius.node[nodeStack[i][1]][1], options.geojson.features[j])
              ) {
                thisPlace = j;
                break;
              }

            }
          }

        }

        if (thisPlace !== -1) {
          previousPlace = thisPlace;
          nodeIndex = placeStack.indexOf(thisPlace);
          if (nodeIndex !== -1) {
            // Existing place
            out.aquius.node[nodeStack[i][1]][2].p = nodeIndex;
          } else {

            // New place
            if (thisPlace in centroidStack) {
              out.aquius.place.push([
                centroidStack[thisPlace].x,
                centroidStack[thisPlace].y,
                {}
              ]);
              out.aquius.node[nodeStack[i][1]][2].p = out.aquius.place.length - 1;
              placeStack.push(thisPlace);

              if ("properties" in options.geojson.features[thisPlace] &&
                out.config.populationProperty in options.geojson.features[thisPlace].properties
              ) {
                population = parseFloat(options.geojson.features[thisPlace].properties[out.config.populationProperty]);
                if (!Number.isNaN(population)) {
                  out.aquius.place[out.aquius.place.length - 1][2].p = population;
                  if (population > maxPopulation) {
                    maxPopulation = population;
                  }
                }
              }

            }

          }
        }
      }

      if (maxPopulation > 0 &&
        "placeScale" in out.config.option === false
      ) {
        out.config.option.placeScale = Math.round((1 / (maxPopulation / 2e6)) * 1e5) / 1e5;
          // Scaled relative to 2 million maximum. Rounded to 5 decimal places
        out.aquius.option.placeScale = out.config.option.placeScale;
      }

    }

    return out;
  }

  function exitProcess(out, gtfs, options) {
    /**
     * Called to exit
     * @param {object} out - internal data references
     * @param {object} gtfs
     * @param {object} options
     */

    var error, i;
    var clean = ["node", "nodeLookup"];
      // Out objects to be destroyed once processing is complete

    for (i = 0; i < clean.length; i += 1) {
      if (clean[i] in out) {
        delete out[clean[i]];
      }
    }

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

  if ("error" in out) {
    return exitProcess(out, gtfs, options);
  }

  out = buildHeader(out);
  out = buildNetwork(out);

  out = parentStopsToNode(out);
  out = transferStopsToNode(out);
  out = regularStopsToNode(out);

  out = buildLink(out, createLink(out, createTrip(out, createFrequencies(out),
    createServiceDays(out)), createRoutes(out)));

  out = buildPlace(out, options);

  return exitProcess(out, gtfs, options);
}


};
// EoF
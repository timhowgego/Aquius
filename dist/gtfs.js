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

    var caption, keys, maxService, tableData, tableFormat, tableHeader, i;
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

    if ("translation" in out.aquius &&
        "en-US" in out.aquius.translation &&
        "link" in out.aquius.translation["en-US"]
      ) {
        caption = out.aquius.translation["en-US"].link;
      } else {
        caption = "Services";
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
      "service" in out.summary
    ) {

      maxService = 0;

      for (i = 0; i < out.summary.service.length; i += 1) {
        if (out.summary.service[i] !== undefined &&
          out.summary.service[i] > maxService
        ) {
          maxService = out.summary.service[i];
        }
      }

      if (maxService > 0) {

        tableData = [];
        for (i = 0; i < out.summary.service.length; i += 1) {
          if (out.summary.service[i] === undefined) {
            tableData.push([i, "-", ""]);
          } else {
            tableData.push([i, (out.summary.service[i] * 100).toFixed(1),
              createElement("span", {}, {
                "background-color": "#000",
                "display": "inline-block",
                "height": "7px",
                "width": Math.round((out.summary.service[i] / maxService) * 100) + "%"
              })]);
          }
        }

        outputDOM.appendChild(createTabulation(tableData, ["Hour", "% Service", "Histogram"],
          [vars.configId + "Number", vars.configId + "Number", vars.configId + "Histogram"],
          caption + " by Hour (scheduled only)"));
          
      }
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
        // Group services by, using network definitions (see docs)
      "serviceFilter": {},
        // Group services by, using service definitions (see docs)
      "servicePer": 1,
        // Service average per period in days (1 gives daily totals, 7 gives weekly totals)
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
    var match;
    var matches = pattern.exec(csv);
    var output = [[]];

    csv = csv.trim();

    while (matches !== null) {
      if (matches[1].length &&
        matches[1] !== ","
      ) {
        output.push([]);
      }
      if (matches[2]) {
        match = matches[2].replace(new RegExp( "\"\"", "g" ), "\"");
      } else {
        match = matches[3];
      }
      output[output.length - 1].push(match);
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

    var index, keys, product, i, j;
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

    out._.productIndex = {};

    switch (out.config.productFilter.type) {
      // Extendable for more product filters. Add complementary code to wanderRoutes()

      case "mode":
        if ("route_type" in out.gtfsHead.routes &&
          out.gtfsHead.routes.route_type !== -1
        ) {
          index = 0;
          for (i = 0; i < out.gtfs.routes.length; i += 1) {
            if (out.gtfs.routes[i][out.gtfsHead.routes.route_type] in out._.productIndex === false) {
              out._.productIndex[out.gtfs.routes[i][out.gtfsHead.routes.route_type]] = index
              index += 1;
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
          index = 0;
          for (i = 0; i < out.gtfs.agency.length; i += 1) {
            if (out.gtfs.agency[i][out.gtfsHead.agency.agency_id] in out._.productIndex === false) {
              out._.productIndex[out.gtfs.agency[i][out.gtfsHead.agency.agency_id]] = index;
              index += 1;
            }
          }
        } else {
          out._.productIndex.agency = 0;
            // Uncoded single agency GTFS
        }
        break;

    }

    if ("network" in out.config.productFilter === false ||
      !Array.isArray(out.config.productFilter.network)
    ) {
      out.config.productFilter.network = [];
      keys = Object.keys(out._.productIndex);

      switch (out.config.productFilter.type) {
        // Extendable for more product filters

        case "mode":
          out.config.productFilter.network.push([
            keys,
              // Config references GTFS Ids
            {"en-US": "All modes"}
          ]);
          if (keys.length > 1) {
            for (i = 0; i < keys.length; i += 1) {
              if (keys[i] in modeLookup) {
                out.config.productFilter.network.push([
                  [keys[i]],
                  modeLookup[keys[i]]
                ]);
              } else {
                out.config.productFilter.network.push([
                  [keys[i]],
                  {"en-US": "Mode #"+ keys[i]}
                ]);
              }
            }
          }
          break;

        case "agency":
          out.config.productFilter.network.push([
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
                    out.config.productFilter.network.push([
                      [keys[i]],
                      {"en-US": out.gtfs.agency[j][out.gtfsHead.agency.agency_name]}
                    ]);
                    break;
                  }
                }
              } else {
                out.config.productFilter.network.push([
                  [keys[i]],
                  {"en-US": keys[i]}
                ]);
              }
            }
          }
          break;

        default:
          // Fallback only
          out.config.productFilter.network.push([
            keys,
            {"en-US": "All"}
          ]);
          break;

      }

    }

    out.aquius.network = [];

    for (i = 0; i < out.config.productFilter.network.length; i += 1) {
      if (out.config.productFilter.network[i].length > 1 &&
        Array.isArray(out.config.productFilter.network[i][0]) &&
        typeof out.config.productFilter.network[i][1] === "object"
      ) {
        product = [];
        for (j = 0; j < out.config.productFilter.network[i][0].length; j += 1) {
          product.push(out._.productIndex[out.config.productFilter.network[i][0][j]]);
        }
        out.aquius.network.push([product, out.config.productFilter.network[i][1], {}]);
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

      if ("nodeLookup" in out._ === false) {
        out._.nodeLookup = {};
        // Lookup of GTFS stop_id: out.aquius.node index
      }

      if ("node" in out.aquius === false) {
        out.aquius.node = [];
      }

      for (i = 0; i < out.gtfs.stops.length; i += 1) {
        if (out.gtfs.stops[i][out.gtfsHead.stops.location_type] === "1") {
          // Is parent
          out._.nodeLookup[out.gtfs.stops[i][out.gtfsHead.stops.stop_id]] = out.aquius.node.length;
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

    var fromStop, toStop, i, j;

    if ("transfers" in out.gtfs &&
      out.gtfsHead.transfers.from_stop_id !== -1 &&
      out.gtfsHead.transfers.to_stop_id !== -1 &&
      out.gtfsHead.transfers.transfer_type !== 1
    ) {
      // Transfer pairs are logically grouped together, even where actual transfer is forbidden

      if ("nodeLookup" in out._ === false) {
        out._.nodeLookup = {};
        // Lookup of GTFS stop_id: out.aquius.node index
      }

      if ("node" in out.aquius === false) {
        out.aquius.node = [];
      }

      for (i = 0; i < out.gtfs.transfers.length; i += 1) {
        if (out.gtfs.transfers[i][out.gtfsHead.transfers.from_stop_id] !== "") {
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
                        out._.nodeLookup[fromStop] = out.aquius.node.length;
                        out._.nodeLookup[toStop] = out.aquius.node.length;
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

    if ("nodeLookup" in out._ === false) {
      out._.nodeLookup = {};
      // Lookup of GTFS stop_id: out.aquius.node index
    }

    if ("node" in out.aquius === false) {
      out.aquius.node = [];
    }

    for (i = 0; i < out.gtfs.stops.length; i += 1) {
      if (out.gtfs.stops[i].stop_id in out._.nodeLookup === false &&
        out.gtfs.stops[i][out.gtfsHead.stops.stop_id] !== "") {
        out._.nodeLookup[out.gtfs.stops[i][out.gtfsHead.stops.stop_id]] = out.aquius.node.length;
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
     * Adds out._.serviceDays GTFS service_id: [total days, by serviceFilter index position]
     * @param {object} out
     * @return {object} out
     */

    var dates, dayCount, endToDateMS, keys, serviceDaysCount, startDateMS, today, i, j, k;
    var serviceByDay = {};
      // Working service_id: {dayname: total days}
    var calendarDates = {};
      // All formatted days to be sampled date:millseconds
    var calendarDays = {};
      // Number of each day included day:count
    var fromDateMS = unformatGtfsDate(out.config.fromDate);
    var toDateMS = unformatGtfsDate(out.config.toDate);

    function getGtfsDay(dateMS) {
      // Returns GTFS header day corresponding to milliseconds since epoch

      var days = ["sunday", "monday", "tuesday",
        "wednesday", "thursday", "friday", "saturday"];
      var dateDate = new Date(dateMS);

      return days[dateDate.getDay()];
    }

    function serviceAllCount(serviceObject) {
      // Future: Skip this loop by adding a total key within serviceByDay

      var i;
      var allCount = 0;
      var keys = Object.keys(serviceObject);

      for (i = 0; i < keys.length; i += 1) {
        allCount += serviceObject[keys[i]];
      }

      return allCount;
    }

    out._.serviceDays = {};
      // GTFS service_id: [total days, by serviceFilter index position]
    out._.dayFactor = [];
      // Total days analysed by serviceFilter index position
    out._.timeFactor = [];
      // Arrays of start, optional-end, one array of arrays per serviceFilter index position
    dayCount = 0;

    while (toDateMS >= fromDateMS) {

      calendarDates[formatGtfsDate(fromDateMS)] = fromDateMS;
      dayCount += 1;

      if ("serviceFilter" in out.config &&
        "period" in out.config.serviceFilter
      ) {
        today = getGtfsDay(fromDateMS);
        if (today in calendarDays) {
          calendarDays[today] += 1;
        } else {
          calendarDays[today] = 1;
        }
      }

      fromDateMS += 864e5;

    }

    if ("serviceFilter" in out.config &&
      "period" in out.config.serviceFilter
    ) {
      for (i = 0; i < out.config.serviceFilter.period.length; i += 1) {

        if ("day" in out.config.serviceFilter.period[i]) {
          out._.dayFactor.push(0);
          for (j = 0; j < out.config.serviceFilter.period[i].day.length; j += 1) {
            if (out.config.serviceFilter.period[i].day[j] in calendarDays) {
              out._.dayFactor[i] += calendarDays[out.config.serviceFilter.period[i].day[j]];
            }
          }
        } else {
          out._.dayFactor.push(dayCount);
        }
        
        if ("time" in out.config.serviceFilter.period[i]) {
          out._.timeFactor.push([]);
          for (j = 0; j < out.config.serviceFilter.period[i].time.length; j += 1) {
            if ("start" in out.config.serviceFilter.period[i].time[j]){
              out._.timeFactor[i].push([getGtfsTimeSeconds(out.config.serviceFilter.period[i].time[j].start)]);
            } else {
              out._.timeFactor[i].push([0]);
                // All times (00:00:00 and after)
            }
            if ("end" in out.config.serviceFilter.period[i].time[j]){
              out._.timeFactor[i][j].push(getGtfsTimeSeconds(out.config.serviceFilter.period[i].time[j].end));
            }
          }
        } else {
          out._.timeFactor.push([[0]]);
        }

      }
    } else {
      out._.dayFactor.push(dayCount);
      out._.timeFactor.push([[0]]);
    }

    if ("calendar" in out.gtfs) {
      // Some hacked GTFS archives skip calendar and use only calendar_dates

      for (i = 0; i < out.gtfs.calendar.length; i += 1) {

        startDateMS = unformatGtfsDate(out.gtfs.calendar[i][out.gtfsHead.calendar.start_date]);
        endToDateMS = unformatGtfsDate(out.gtfs.calendar[i][out.gtfsHead.calendar.end_date]);

        dates = Object.keys(calendarDates);
        for (j = 0; j < dates.length; j += 1) {
          if (calendarDates[dates[j]] >= startDateMS &&
            calendarDates[dates[j]] <= endToDateMS
          ) {

            today = getGtfsDay(calendarDates[dates[j]]);
            if (out.gtfs.calendar[i][out.gtfsHead.calendar[getGtfsDay(calendarDates[dates[j]])]] === "1") {

              if (out.gtfs.calendar[i][out.gtfsHead.calendar.service_id] in serviceByDay === false) {
                serviceByDay[out.gtfs.calendar[i][out.gtfsHead.calendar.service_id]] = {};
              }
              if (today in serviceByDay[out.gtfs.calendar[i][out.gtfsHead.calendar.service_id]] === false) {
                serviceByDay[out.gtfs.calendar[i][out.gtfsHead.calendar.service_id]][today] = 1;
              } else {
                serviceByDay[out.gtfs.calendar[i][out.gtfsHead.calendar.service_id]][today] += 1;
              }

            }

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
        if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.date] in calendarDates) {

          today = getGtfsDay(calendarDates[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.date]]);

          if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id] in serviceByDay === false) {
            // New service
            if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "1") {
              serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] = {};
              serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]][today] = 1;
            }
            // Else erroneous subtraction from non-existing service
          } else {
            if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "1") {
              // Add at index
              if (today in serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]]) {
                serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]][today] += 1;
              } else {
                serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]][today] = 1;
              }
            }
            if (out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.exception_type] === "2") {
              // Subtract at index
              if (today in serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]] === false ||
                serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]][today] <= 1
                ) {
                // Subtract would zero service, so remove
                delete serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]][today];
                if (Object.keys(serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]]).length
                  === 0
                ) {
                  delete serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]]
                }
              } else {
                serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]][today] =
                  serviceByDay[out.gtfs.calendar_dates[i][out.gtfsHead.calendar_dates.service_id]][today] - 1;
              }
            }
          }

        }
      }

    }

    keys = Object.keys(serviceByDay);
    for (i = 0; i < keys.length; i += 1) {

      if ("serviceFilter" in out.config &&
        "period" in out.config.serviceFilter
      ) {

        out._.serviceDays[keys[i]] = [];
        serviceDaysCount = 0;

        for (j = 0; j < out.config.serviceFilter.period.length; j += 1) {
          if ("day" in out.config.serviceFilter.period[j]) {
            dayCount = 0;
            for (k = 0; k < out.config.serviceFilter.period[j].day.length; k += 1) {
              if (out.config.serviceFilter.period[j].day[k] in serviceByDay[keys[i]]) {
                dayCount += serviceByDay[keys[i]][out.config.serviceFilter.period[j].day[k]];
              }
            }
          } else {
            dayCount = serviceAllCount(serviceByDay[keys[i]]);
          }
          out._.serviceDays[keys[i]].push(dayCount);
          serviceDaysCount += dayCount;
        }

        if (serviceDaysCount === 0) {
           delete out._.serviceDays[keys[i]];
        }

      } else {

        dayCount = serviceAllCount(serviceByDay[keys[i]]);
        if (dayCount > 0) {
          out._.serviceDays[keys[i]] = [dayCount];
        }

      }
    }

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

  function createTrip(out) {
    /**
     * Adds out._.trip lookup of GTFS trip_id: complex Object describing trip
     * @param {object} out
     * @return {object} out
     */

    var frequencies, keys, hour, inPeriod, scheduled, time, timeCache, i, j, k;

    function createFrequencies(out) {

      var end, proportion, start, i, j, k;

      var frequencies = {};
        // trip_id: service total
      var timeCache = {};

      if ("frequencies" in out.gtfs &&
        out.gtfsHead.frequencies.trip_id !== -1 &&
        out.gtfsHead.frequencies.start_time !== -1 &&
        out.gtfsHead.frequencies.end_time !== -1 &&
        out.gtfsHead.frequencies.headway_secs !== -1
      ) {
        for (i = 0; i < out.gtfs.frequencies.length; i += 1) {

          if (out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id] in frequencies === false) {
            frequencies[out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id]] = [];
            for (j = 0; j < out._.timeFactor.length; j += 1) {
              frequencies[out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id]].push(0);
            }
          }

          if (out.gtfs.frequencies[i][out.gtfsHead.frequencies.start_time] in timeCache === false) {
            timeCache[out.gtfs.frequencies[i][out.gtfsHead.frequencies.start_time]] =
              getGtfsTimeSeconds(out.gtfs.frequencies[i][out.gtfsHead.frequencies.start_time]);
              // TimeStrings cached for speed - times tend to be reused
          }
          start = timeCache[out.gtfs.frequencies[i][out.gtfsHead.frequencies.start_time]];
          if (out.gtfs.frequencies[i][out.gtfsHead.frequencies.end_time] in timeCache === false) {
            timeCache[out.gtfs.frequencies[i][out.gtfsHead.frequencies.end_time]] =
              getGtfsTimeSeconds(out.gtfs.frequencies[i][out.gtfsHead.frequencies.end_time]);
          }
          end = timeCache[out.gtfs.frequencies[i][out.gtfsHead.frequencies.end_time]];

          if (end < start) {
            end += 86400;
              // Over midnight, add day of sectonds.
          }

          for (j = 0; j < out._.timeFactor.length; j += 1) {
            if (out._.timeFactor[j].length === 1 &&
              out._.timeFactor[j][0].length === 1 &&
              out._.timeFactor[j][0][0] === 0
            ) {

              frequencies[out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id]][j] +=
                (end - start) / parseInt(out.gtfs.frequencies[i][out.gtfsHead.frequencies.headway_secs], 10);
                // Whole day, add all

            } else {

              for (k = 0; k < out._.timeFactor[j].length; k += 1) {
                if (out._.timeFactor[j][k][0] < end &&
                  (out._.timeFactor[j][k].length === 1 ||
                  start < out._.timeFactor[j][k][1])
                ) {
                  // Frequency wholly or partly within Period. Else skip
                  proportion = 1;
                  if (out._.timeFactor[j][k][0] > start) {
                    proportion = proportion - ((out._.timeFactor[j][k][0] - start) / (end - start));
                  }
                  if (out._.timeFactor[j][k][1] < end) {
                    proportion = proportion - ((end - out._.timeFactor[j][k][1]) / (end - start));
                  }
                  frequencies[out.gtfs.frequencies[i][out.gtfsHead.frequencies.trip_id]][j] += (end - start) *
                    proportion / parseInt(out.gtfs.frequencies[i][out.gtfsHead.frequencies.headway_secs], 10);
                }
              }

            }
          }
        }
      }

      return frequencies;
    }

    frequencies = createFrequencies(out);
    out._.trip = {};
      // trip_id: {service [numbers], stops [sequence, node], pickup only [], setdown only []}
    timeCache = {};
    out.summary.service = [];
      // Hour index position, service total value

    for (i = 0; i < out.gtfs.trips.length; i += 1) {
      if (out.gtfs.trips[i][out.gtfsHead.trips.service_id] in out._.serviceDays) {

        out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]] = {
          "service": [],
          "stops": []
        };

        for (j = 0; j < out._.serviceDays[out.gtfs.trips[i][out.gtfsHead.trips.service_id]].length; j += 1) {
          if (out.gtfs.trips[i][out.gtfsHead.trips.trip_id] in frequencies) {
            out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service.push(
              out._.serviceDays[out.gtfs.trips[i][out.gtfsHead.trips.service_id]][j] *
              frequencies[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]][j]);
          } else {
            out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service.push(
              out._.serviceDays[out.gtfs.trips[i][out.gtfsHead.trips.service_id]][j]);
              // Non-frequent trips are here each counted, but removed below if outside time periods
          }
        }

        if (out.gtfsHead.stop_times.pickup_type !== -1) {
          out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown = [];
            // Pickup_type tested for none, thus setdown only
        }

        if (out.gtfsHead.stop_times.drop_off_type !== -1) {
          out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup = [];
            // Drop_off_type tested for none, thus pickup only
        }

      }
    }

    for (i = 0; i < out.gtfs.stop_times.length; i += 1) {
      if (out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]] !== undefined) {

        if ((out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].stops.length === 0 ||
          out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]]
            .stops[out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].stops.length - 1] !==
            out._.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]) &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id] in out._.nodeLookup
        ) {
          // Excludes concurrent stops

          out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].stops.push([
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_sequence],
            out._.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]
          ]);

          if (out.gtfsHead.stop_times.departure_time !== -1 &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.departure_time] !== ""
          ) {
            if (out.gtfs.stop_times[i][out.gtfsHead.stop_times.departure_time] in timeCache === false) {
              timeCache[out.gtfs.stop_times[i][out.gtfsHead.stop_times.departure_time]] =
                getGtfsTimeSeconds(out.gtfs.stop_times[i][out.gtfsHead.stop_times.departure_time]);
             // TimeStrings cached for speed - times tend to be reused
            }
            time = timeCache[out.gtfs.stop_times[i][out.gtfsHead.stop_times.departure_time]];
            if ("start" in out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]] === false ||
              time < out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].start
            ) {
              out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].start = time;
            }
          }

          if (out.gtfsHead.stop_times.arrival_time !== -1 &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.arrival_time] !== ""
          ) {
            if (out.gtfs.stop_times[i][out.gtfsHead.stop_times.arrival_time] in timeCache === false) {
              timeCache[out.gtfs.stop_times[i][out.gtfsHead.stop_times.arrival_time]] =
                getGtfsTimeSeconds(out.gtfs.stop_times[i][out.gtfsHead.stop_times.arrival_time]);
            }
            time = timeCache[out.gtfs.stop_times[i][out.gtfsHead.stop_times.arrival_time]];
            if ("end" in out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]] === false ||
              time > out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].end
            ) {
              out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].end = time;
            }
          }

          if (out.gtfsHead.stop_times.pickup_type !== -1 &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.pickup_type] === "1"
          ) {
            out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].setdown.push(
              out._.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]
            );
          }

          if (out.gtfsHead.stop_times.drop_off_type !== -1 &&
            out.gtfs.stop_times[i][out.gtfsHead.stop_times.drop_off_type] === "1"
          ) {
            out._.trip[out.gtfs.stop_times[i][out.gtfsHead.stop_times.trip_id]].pickup.push(
              out._.nodeLookup[out.gtfs.stop_times[i][out.gtfsHead.stop_times.stop_id]]
            );
          }

        }

      }
    }

    keys = Object.keys(out._.trip);
    scheduled = keys.length - Object.keys(frequencies).length;
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] in frequencies === false) {
        // Service level of frequency-based trips already processed

        if ("start" in out._.trip[keys[i]] &&
          "end" in out._.trip[keys[i]]
        ) {
          time = ((out._.trip[keys[i]].end - out._.trip[keys[i]].start) / 2 ) + out._.trip[keys[i]].start;
            // Mid-journey time
          hour = Math.floor(time / 3600);
          if (out.summary.service[hour] === undefined) {
            out.summary.service[hour] = 1 / scheduled;
          } else {
            out.summary.service[hour] += 1 / scheduled;
          }
        } else {
          time = null;
        }
        
        for (j = 0; j < out._.timeFactor.length; j += 1) {
          if (out._.timeFactor[j].length > 1 ||
            out._.timeFactor[j][0].length > 1 ||
            out._.timeFactor[j][0][0] !== 0
          ) {
            // Else all time periods, so leave unchanged
            inPeriod = false;

            if (time !== null) {
              // Else no time data, thus inPeriod remains false
              for (k = 0; k < out._.timeFactor[j].length; k += 1) {
                if (time > out._.timeFactor[j][k][0] &&
                  (out._.timeFactor[j][k].length === 1 ||
                  time < out._.timeFactor[j][k][1])
                ) {
                  inPeriod = true;
                  break;
                }
              }
            }

            if (inPeriod === false) {
              out._.trip[keys[i]].service[j] = 0;
            }

          }
        }
      }
    }

    delete out._.nodeLookup;
    delete out._.serviceDays;
    delete out._.timeFactor;
      // Free memory?

    return out;
  }

  function createRoutes(out) {
    /**
     * Adds out._.routes lookup of GTFS route_id:: complex Object describing route
     * @param {object} out
     * @return {object} out
     */

    var i;

    out._.routes = {};
      // route_id: {product, reference{n, c, u}}

    for (i = 0; i < out.gtfs.routes.length; i += 1) {
      out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]] = {};

      out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference = {
        "slug": ""
          // Slug is a temporary indexable unique reference
      };

      if (out.config.allowRoute === true) {
        if (out.gtfsHead.routes.route_short_name !== -1 &&
          out.gtfs.routes[i][out.gtfsHead.routes.route_short_name].trim() !== ""
        ) {
          out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.n =
            out.gtfs.routes[i][out.gtfsHead.routes.route_short_name].trim();
          out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
            out.gtfs.routes[i][out.gtfsHead.routes.route_short_name].trim();
        } else {
          // Long name only if short name unavailable
          if (out.config.allowName === true &&
            out.gtfsHead.routes.route_long_name !== -1 &&
            out.gtfs.routes[i][out.gtfsHead.routes.route_long_name].trim() !== ""
          ) {
            out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.n =
              out.gtfs.routes[i][out.gtfsHead.routes.route_long_name].trim();
            out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
              out.gtfs.routes[i][out.gtfsHead.routes.route_long_name].trim();
          }
        }
      }

      if (out.config.allowColor === true &&
        out.gtfsHead.routes.route_color !== -1 &&
        out.gtfs.routes[i][out.gtfsHead.routes.route_color].trim() !== ""
      ) {
        out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.c =
          out.gtfs.routes[i][out.gtfsHead.routes.route_color].trim();
        out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
          out.gtfs.routes[i][out.gtfsHead.routes.route_color].trim();
      }

      if (out.config.allowColor === true &&
        out.gtfsHead.routes.route_text_color !== -1 &&
        out.gtfs.routes[i][out.gtfsHead.routes.route_text_color].trim() !== ""
      ) {
        out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.t =
          out.gtfs.routes[i][out.gtfsHead.routes.route_text_color].trim();
        out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
          out.gtfs.routes[i][out.gtfsHead.routes.route_text_color].trim();
      }

      if (out.config.allowURL === true &&
        out.gtfsHead.routes.route_url !== -1 &&
        out.gtfs.routes[i][out.gtfsHead.routes.route_url].trim() !== ""
      ) {
        out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.u =
          out.gtfs.routes[i][out.gtfsHead.routes.route_url].trim();
        out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].reference.slug +=
          out.gtfs.routes[i][out.gtfsHead.routes.route_url].trim();
      }

      if (out.config.productFilter.type === "agency") {
        if("agency_id" in out.gtfsHead.routes &&
          out.gtfsHead.routes.agency_id !== -1
        ) {
          out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product =
            out._.productIndex[out.gtfs.routes[i][out.gtfsHead.routes.agency_id]];
        } else {
          out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product = 0;
        }

      } else {
        if (out.config.productFilter.type === "mode" &&
          "route_type" in out.gtfsHead.routes &&
          out.gtfsHead.routes.route_type !== -1
        ) {
          out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product =
            out._.productIndex[out.gtfs.routes[i][out.gtfsHead.routes.route_type]];
        } else {
          out._.routes[out.gtfs.routes[i][out.gtfsHead.routes.route_id]].product =
            out._.productIndex[Object.keys(out._.productIndex)[0]];
            // Fallback
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

    var backward, forward, keys, line, nodes, i, j, k;
    var link = {};
      // linkUniqueId: {route array, product id, service count,
      // direction unless both, pickup array, setdown array, reference array}

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

    for (i = 0; i < out.gtfs.trips.length; i += 1) {
      if (out.gtfs.trips[i][out.gtfsHead.trips.trip_id] in out._.trip) {

        nodes = [];
        out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].stops.sort(function(a, b) {
          return a[0] - b[0];
        });
        for (j = 0; j < out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].stops.length; j += 1) {
          nodes.push(out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].stops[j][1]);
        }

        forward = "f" + out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].product;

        if (out.gtfsHead.stop_times.pickup_type !== -1 &&
          out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.length > 0
        ) {
          out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.sort();
          forward += "s" + out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.join(":");
        }

        if (out.gtfsHead.stop_times.drop_off_type !== -1 &&
          out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.length > 0
        ) {
          out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.sort();
          forward += "p" + out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.join(":");
        }

        backward = nodes.slice().reverse().join(":") + forward;
        forward = nodes.join(":") + forward;

        if (forward in link) {

          link[forward].service = mergeService(link[forward].service,
            out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service);
          if ("reference" in out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]] &&
            Object.keys(out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference).length > 1 &&
            out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug in
              link[forward].referenceLookup === false
          ) {
            // Length 1 is slug only, which will be subsequently removed
            link[forward].reference.push(out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference);
            link[forward].referenceLookup[out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug] =
              out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug;
          }

        } else {

          if (backward in link) {

            link[backward].service = mergeService(link[backward].service,
              out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service);
            if ("reference" in out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]] &&
              Object.keys(out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference).length > 1 &&
              out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug in
                link[backward].referenceLookup === false
            ) {
              link[backward].reference.push(out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference);
              link[backward].referenceLookup[out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug] =
                out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug;
            }
            if ("direction" in link[backward]) {
              delete link[backward].direction;
            }

          } else {

            link[forward] = {
              "direction": 1,
              "product": out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].product,
              "route": nodes,
              "service": out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].service
            };

            if ("reference" in out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]] &&
              Object.keys(out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference).length > 1
            ) {
              link[forward].reference = [out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference]
              link[forward].referenceLookup = {};
              link[forward].referenceLookup[out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug] = 
                out._.routes[out.gtfs.trips[i][out.gtfsHead.trips.route_id]].reference.slug;
                // key=value index for lookup speed
            }

            if (out.gtfsHead.stop_times.pickup_type !== -1 &&
              out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown.length > 0
            ) {
              link[forward].setdown = out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].setdown;
            }
            if (out.gtfsHead.stop_times.drop_off_type !== -1 &&
              out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup.length > 0
            ) {
              link[forward].pickup = out._.trip[out.gtfs.trips[i][out.gtfsHead.trips.trip_id]].pickup;
            }
            if (isCircular(nodes)) {
              link[forward].circular = 1;
            }

          }
        }

      }
    }

    delete out._.routes;
    delete out._.trip;

    out.aquius.link = [];
    out.summary.network = [];
      // Indexed by productFilter, content array of service by serviceFilter index

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

      for (j = 0; j < link[keys[i]].service.length; j += 1) {
        link[keys[i]].service[j] = (link[keys[i]].service[j] / out._.dayFactor[j]) * out.config.servicePer;
        
        for (k = 0; k < out.aquius.network.length; k += 1) {
          if (out.aquius.network[k][0].indexOf(link[keys[i]].product) !== -1) {
            out.summary.network[k][j] += link[keys[i]].service[j];
          }
        }
        
        if (link[keys[i]].service[j] < 10) {
          link[keys[i]].service[j] = parseFloat(link[keys[i]].service[j].toPrecision(1));
        } else {
          link[keys[i]].service[j] = parseInt(link[keys[i]].service[j], 10);
        }
      }

      line = [
        [link[keys[i]].product],
        link[keys[i]].service,
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

    for (i = 0; i < out.summary.network.length; i += 1) {
      for (j = 0; j < out.summary.network[i].length; j += 1) {
        out.summary.network[i][j] = Math.round(out.summary.network[i][j]);
      }
    }

    delete out._.dayFactor;

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

    var centroid, checked, lastDiff, population, xyDiff, i, j;
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
    var placeStack = {};
      // aquius.place: GeojsonLine:aquius.place index
    var maxPopulation = 0;

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

          checked = {};
          checked[previousPlace] = previousPlace;

          for (j = 0; j < centroidKeys.length; j += 1) {

            xyDiff = Math.abs((out.aquius.node[nodeStack[i][1]][0] +
              out.aquius.node[nodeStack[i][1]][1]) -
              (centroidStack[centroidKeys[j]].x +
              centroidStack[centroidKeys[j]].y));
            if (j === 0) {
              lastDiff = xyDiff;
            }

            if (lastDiff >= xyDiff &&
              centroidKeys[j] in checked === false
            ) {
              // Only consider closer centroids than the prior failures. PreviousPlace already checked
              if (isPointInFeature(out.aquius.node[nodeStack[i][1]][0],
                out.aquius.node[nodeStack[i][1]][1], options.geojson.features[centroidKeys[j]])
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
          if (thisPlace in placeStack) {
            // Existing place
            out.aquius.node[nodeStack[i][1]][2].p = placeStack[thisPlace];
          } else {

            // New place
            if (thisPlace in centroidStack) {
              out.aquius.place.push([
                centroidStack[thisPlace].x,
                centroidStack[thisPlace].y,
                {}
              ]);
              out.aquius.node[nodeStack[i][1]][2].p = out.aquius.place.length - 1;
              placeStack[thisPlace] = out.aquius.place.length - 1;

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

    var error;

    if ("_" in out) {
      delete out._;
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
  out = buildService(out);

  out = parentStopsToNode(out);
  out = transferStopsToNode(out);
  out = regularStopsToNode(out);

  out = createServiceDays(out);
  out = createTrip(out);
  out = createRoutes(out);
  out = buildLink(out);

  out = buildPlace(out, options);

  return exitProcess(out, gtfs, options);
}


};
// EoF
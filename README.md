# Aquius

> _Here+Us_ - An Alternative Approach to Public Transport Network Discovery

## Description

[![Aquius at Ciudad Real](static/aquius-ciudad-real.jpg)](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/#x-3.296/y39.092/z7/c-3.966/k38.955/m8/s7/vlphn)

Aquius visualises the links between people that are made possible by transport networks. The user clicks once on a location, and near-instantly all the routes, stops, services, and connected populations are summarised visually. Aquius answers the question, what services are available _here_? And to a degree, who am I connected to by those services? Population is a proxy for all manner of socio-economic activity and facilities, measured both in utility and in perception. Conceptually Aquius is half-way between the two common approaches to public transport information:

1. Conventional journey planners are aimed at users that already have some understanding of what routes exist. Aquius summarises overall service patterns.
1. Most network maps are pre-defined and necessarily simplified, typically showing an entire city or territory. Aquius relates to a bespoke location.

The application makes no server queries (once the initial dataset has been loaded), so responds near-instantly. That speed allows network discovery by trial and error, which changes the user dynamic from _being told_, to playful learning. Some caveats:

* Aquius maps straight-line links, not the precise geographic route taken. This allows services that do not stop at all intermediate stops to be clearly differentiated. It also makes it technically possible for an internet client to work with a large transport network. Aquius is however limited conventional scheduled public transport with fixed stopping points.
* Aquius summarises the patterns of fixed public transport networks. It presumes a degree of network stability over time, and cannot sensibly be used to describe a transport network that is in constant flux. The Aquius data structure allows filtering by time period, but such periods must be pre-defined and cannot offer the same precision as schedule-based systems.
* Aquius only shows the direct service from _here_, not journeys achieved by interchange. It is theoretically possible to define key interchanges from one service to another by mimicking a service which splits into two portions part-way through its journey. However if the intention is to show all possible interchanges without letting users explore the possibilities for themselves, then Aquius is not the logical platform to use: Displaying all possible interchanges ultimately results in a map of every service which fails to convey what is genuinely local to _here_.

> Ready to explore? [Try a live demonstration](https://timhowgego.github.io/Aquius/live/)!

## Manual

In this document:

* [User FAQ](#user-faq)
* [Quick Setup](#quick-setup)
* [Limitations](#limitations)
* [Known Issues](#known-issues)
* [Configuration](#configuration)
* [Here Queries](#here-queries)
* [GTFS To Aquius](#gtfs-to-aquius)
* [Data Structure](#data-structure)
* [License](#license)
* [Contributing](#contributing)

## User FAQ

*How are services counted?* Within the boundary of _here_ all unique services are counted in whatever direction each is operated. The overall total of unique services is displayed in the bottom left panel. Outside _here_, only the services from _here_ to there (in that specific direction) are displayed. The counts that appear as tooltips for specific stops and links follow the same logic. This is more intuitive where _here_ includes several stops, since the services between those stops are counted in both directions (because each stop is both origin and destination of the other). Services (typically trains) that split mid-journey are counted once over common sections. Individual services that combine more than one product together on the same vehicle are counted no more than once, by the longer distance component unless that has been filtered out by the choice of network.

*How are people counted?* This varies by dataset, but broadly: Population is that of the local area (municipality or similar) containing one or more stops linked to _here_ by one or more of the services shown. Plus the population of _here_ itself. For example, in the Spanish Railway dataset the population is that of the municipal Padrón at the start of 2017. Long distance services often have a wider population catchment than just the local municipality of the stations they serve, so this count of people must be read with caution. For example, "Camp Tarragona" ostensibly serves long distance travel from Tarragona and Reus, but is located in neither. However Camp Tarragona cannot fairly be attributed the population of its natural hinterland without factoring in penalties for local interchange and travel time: Such advanced analysis would be possible, but complicates the simple message the population bubbles are intended to convey.

*What do the line widths and circle diameters indicate?* Links and stops are scaled by the logarithm of the service (such as total daily trains), so at high service levels the visual display is only slightly increased. Increasing the scale increases the visual distinction between service levels, but may flood the view in urban areas. The area of each population circle is in proportion to the number of residents. The original numbers are displayed in a tooltip, visible when mousing over (or similar) the line or circle. The here circle defines the exact geographic area of _here_, that searched to find local stops.

*How can everything be displayed?* Zoom out a lot, then click... The result may be visually hard to digest, and laggy - especially with an unfiltered network or when showing multiple map layers: Aquius wasn't really intended to display everything. Hosts can limit this behaviour (by increasing the value of [Configuration](#configuration) key `minZoom`).

## Quick Setup

In its most basic form, Aquius simply builds into a specific `HTML` element on a web page, the most basic configuration placed in the document `body`:

```html
<div id="aquius-div-id" style="height:100%;"></div>
<script src="absolute/url/to/aquius.js" async></script>
<script>window.addEventListener("load", function() {
  aquius.init("aquius-div-id");
});</script>
```

Note older browsers also require the `html` and `body` elements to be styled with a `height` of 100% before correctly displaying the `div` at 100%. Absolute paths are recommended to produce portable embedded code, but not enforced.

The first argument of the function `aquius.init()` requires a valid `id` refering to an empty element on the page. The second optional argument is an `Object` containing keyed options which override the default configuration. Three option keys are worth introducing here:

* `dataset`: `String` (quoted) of the full path and filename of the JSON file containing the network data (the default is empty).
* `locale`: `String` (quoted) of the initial [BCP 47-style](https://en.wikipedia.org/wiki/IETF_language_tag) locale, currently `en-US` or `es-ES`. Users may choose their language - this option simply defines the initial state.
* `uiHash`: `Boolean` (true or false, no quotes) indicating whether Aquius records its current state as a hash in the browser's URL bar (great for sharing, but may interfere with other elements of web page design).

Others options are documented in the [Configuration](#configuration) section below. Here is an example with the Spanish Railway dataset:

```html
<div id="aquius" style="height:100%;"></div>
<script src="https://timhowgego.github.io/Aquius/dist/aquius.min.js"
  async></script>
<script>window.addEventListener("load", function() {
  aquius.init("aquius", {
    "dataset": "https://timhowgego.github.io/AquiusData/es-rail/20-jul-2018.json",
    "locale": "es-ES",
    "uiHash": true
  });
});</script>
```

[Current script files can be found on Github](https://github.com/timhowgego/Aquius/tree/master/dist). [Sample datasets are also available](https://github.com/timhowgego/AquiusData).

*Tip:* Aquius can also be [used as a stand-alone library](#here-queries): `aquius.here()` accepts and returns data objects without script loading or user interface. Alternatively, Aquius can be built into an existing Leaflet map object by sending that object to `aquius.init()` as the value of [Configuration](#configuration) key `map`.

## Limitations

* Aquius is conceptually inaccessible to those with severe visual impairment ("blind people"), with no non-visual alternative available.
* Internet Explorer 9 is the oldest vintage of browser theoretically supported, although a modern browser will be faster (both in use of `Promise` to load data and `Canvas` to render data). Mobile and tablet devices are supported, although older devices may lag when interacting with the map interface.
* Aquius is written in pure Javascript, automatically loading its one dependency at runtime, [Leaflet](https://github.com/Leaflet/Leaflet). Aquius can produce graphically intensive results, so be cautious before embedding multiple instances in the same page, or adding Aquius to pages that are already cluttered.
* Aquius works efficiently for practical queries within large conurbations, or for inter-regional networks. The current extreme test case is a single query containing _every_ bus stop and weekly bus service in the whole of Greater Manchester - a network consisting of about 5 million different stop-time combinations: This takes just under a second for Aquius to query on a slow 2010-era computer. A third of that second is for processing, and two thirds for map rendering: Aquius' primary bottleneck is the ability of the browser to render large numbers of visual objects on a canvas.

## Known Issues

This section tries to explain the reasoning behind particular quirks:

Aquius is fundamentally inaccessible to those with severe visual impairment: The limitation lay in the concept, not primarily the implementation. Aquius can't even read out the stop names, since it doesn't necessarily know anything about them except their coordinates. Genuine solutions are more radical than marginal, implying a quite separate application. For example, conversion of the map into a 3D soundscape, or allowing users to walk a route as if playing a [MUD](https://en.wikipedia.org/wiki/MUD).

Multiple base maps can be added but only one may be displayed: A user selection and associated customisation was envisaged for the future.

Population bubbles are not necessarily centered on towns: These are typically located at the centroid of the underlying administrative area, which does not necessary relate to the main settlement. Their purpose is simply to indicate the presence of people at a broad scale, not to map nuances in local population distribution.

Circular services that constitute two routes in different directions, that share some stops but not all, display with the service in both directions serving the entire shared part of the loop: Circular services normally halve the total service to represent the journey possibilities either clockwise or counter-clockwise, without needing to decide which direction to travel in to reach any one stop. Circular services that take different routes depending on their direction cannot simply be halved in this manner, even over the common section, because the service level in each direction is not necessarily the same. Consequently Aquius would have to understand which direction to travel in order to reach each destination the fastest. That would be technically possible by calculating distance, but would remain prone to misinterpretation, because a service with a significantly higher service frequency in one direction might reasonably be used to make journeys round almost the entire loop, regadless of distance. The safest assumption is that services can be ridden round the loop in either direction. In practice this issue only arises [in Parla](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/#x-3.76265/y40.23928/z14/c-3.7669/k40.2324/m10/s5/vlphn/n2).

Aquius will summarise cabotaged routes accurately where only one node on the route is within _here_, but may over-count the service total when multiple nodes with different cabotage rules for the same vehicle journey are included in _here_. Cabotaged routes are those where pickup and setdown restrictions vary depending on the passenger journey being undertaken, not the vehicle journey. For example, an international or inter-regional operator may be forbidden from carrying passengers solely within one nation or region. Flixbus, for example, define these restrictions by creating multiple copies of each vehicle journey, each copy with different pickup and setdown conditions. This poses a logical problem for Aquius, since it needs to both display the links from each separate node _and_ acknowledge that these separate links are provided by the exact same vehicle journey. Currently Aquius opts to show the links and over-count the journeys. This could be improved by counting common sections and nodes accurately, perhaps by defining a parent link that serves as a lookup for the entire stop sequence - although the basic conflict between link display and service count would remain a source of confusion.

## Configuration

As described in the [Quick Setup](#quick-setup) section, the second optional argument of `aquius.init()` takes an `Object` containing keys and respective values. Any key not specified will use the default. Bespoke options must conform to the expected data `type`.

*Tip*: Clicking the `Embed` link on the bottom of the Layer Control will produce a dummy HTML file containing the configuration at the time the Embed was produced.

### Data Sources

All except `dataset`, introduced in the [Quick Setup](#quick-setup) section, can be happily ignored in most cases.

Key|Type|Default|Description
---|----|-------|-----------
base|Array|See below|Array of objects containing base layer tile maps, described below
dataObject|Object|{}|JSON-like [network data](#data-structure) as an Object: Used in preference to dataset
dataset|string|""|JSON file containing network data: Recommended full URL, not just filename
leaflet|Object|{}|Active Leaflet library Object L: Used in preference to loading own library
locale|string|"en-US"|Default locale, BCP 47-style. Not to be confused with user selection, `t`
map|Object|{}|Active Leaflet map Object: Used in preference to own map
network|Array|[]|Extension of `network`: Array of products, Object of locale keyed names
networkAdd|boolean|true|Append this network extension to dataset defaults. Set false to replace defaults
translation|Object|{}|Custom translations: Format matching `defaultTranslation` within `aquius.init()`

For base mapping, `base` is a complex `Array` containing one or more tile layers, each represented as an `Object`. Within, the key `url` contains a `string` URI of the resource, potentially formatted as [described by Leaflet](https://leafletjs.com/reference-1.3.4.html#tilelayer). WMS layers require a specific key `type`: "wms". Finally a key called `options` may be provided, itself containing an `Object` of keys and values, matching Leaflet's options. Or in summary:

```javascript
"base": [
  {
    "url": "http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png", 
    "type": "",
      // Optional, if WMS: "wms"
    "options": {
      // Optional, but attribution is always advisable
      "attribution": "&copy; OpenStreetMap contributors"
    }
  }
    // Extendable for multiple maps
]
```

The default `locale` needs to be fully translated, since it becomes the default should any other language choice not be translated.

The extension of `network` allow extra network filters to be appended to the defaults provided in the JSON `dataset`. For example, in the Spanish Railways dataset a separate network filter for [FEVE](https://en.wikipedia.org/wiki/Renfe_Feve) could be created using the product's ID, here 14, and its name. Multiple products or networks can be added in this way. See the [Data Structure](#data-structure) section for more details. To replace the defaults in the dataset, set configuration `networkAdd` to `false`.

```javascript
"network": [ 
  [ 
    [14],
      // Product ID(s)
    {"en-US": "FEVE"},
      // Locale:Name, must include the default locale
    {}
      // Optional properties
  ] 
  // Extendable for multiple networks
],
"networkAdd": false
  // Replace dataset defaults with this network selection
```

The `translation` `Object` allows bespoke locales to be hacked in. Bespoke translations take precedence over everything else. Even network names can be hacked by referencing key `network0`, where the final `integer` is the index position in the network `Array`. While this is not the optimal way to perform proper translation, it may prove convenient. The structure of `translation` matches that of `defaultTranslation` within `aquius.init()`. Currently translatable strings are listed below. Missing translations default to `locale`, else are rendered blank. 

```javascript
"translation": {
  "xx-XX": {
    // BCP 47-style locale
    "lang": "X-ish",
      // Required language name in that locale
    "embed": "Embed",
      // Translate values into locale, leave keys alone
    "export": "Export",
    "here": "Location",
    "language": "Language",
    "link": "Services",
    "network": "Network",
    "node": "Stops",
    "place": "People",
    "scale": "Scale",
    "service": "Period"
  }
    // Extendable for multiple locales
}
```

The remaining configurations are far more basic.

### Styling

Formatting of visual elements, mostly on the map.

Key|Type|Default|Description
---|----|-------|-----------
hereColor|string|"#080"|CSS Color for here layer circle strokes
linkColor|string|"#f00"|CSS Color for link (service) layer strokes
linkScale|float|1.0|Scale factor for link (service) layer strokes: ceil( log( 1 + ( service * ( 1 / ( scale * 4 ) ) ) ) * scale * 4)
minWidth|integer|2|Minimum pixel width of links, regardless of scaling. Assists click useability
minZoom|integer|0|Minimum map zoom. Sets a soft cap on query complexity
nodeColor|string|"#000"|CSS Color for node (stop) layer circle strokes
nodeScale|float|1.0|Scale factor for node (stop) layer circles: ceil( log( 1 + ( service * ( 1 / ( scale * 4) ) ) ) * scale * 2)
panelOpacity|float|0.7|CSS Opacity for background of the bottom-left summary panel
panelScale|float|1.0|Scale factor for text on the bottom-left summary panel
placeColor|string|"#00f"|CSS Color of place (population) layer circle fill
placeOpacity|float|0.5|CSS Opacity of place (population) layer circle fill: 0-1
placeScale|float|1.0|Scale factor for place (population) layer circles: ceil( sqrt( people * scale / 666) )

**Caution:** Colors accept any [CSS format](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value), but be wary of introducing transparency this way, because it tends to slow down rendering. Transparent link lines will render with ugly joins.

### User Interface

Enable or disable User Interface components. These won't necessarily block the associated code if it can be entered by an alternative means, such as the hash.

Key|Type|Default|Description
---|----|-------|-----------
uiHash|boolean|false|Enables recording of the user state in the URL's hash
uiLocale|boolean|true|Enables locale selector
uiNetwork|boolean|true|Enables network selector
uiPanel|boolean|true|Enables summary statistic panel
uiScale|boolean|true|Enables scale selector
uiService|boolean|true|Enables service selector
uiShare|boolean|true|Enables embed and export
uiStore|boolean|true|Enables browser [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) of user state

### User State

As seen in the URL hash (if `uiHash` is `true`). Coordinates are always WGS 84. Map click defines the centre of the search.

Key|Type|Default|Description
---|----|-------|-----------
c|float|-0.89|_Here_ click Longitude
k|float|41.66|_Here_ click Latitude
m|integer|11|_Here_ click zoom
n|integer|0|User selected network filter: Must match range of network in `dataset`
v|string|"hlnp"|User selected map layers by first letter: here, link, node, place
r|integer|0|User selected service filter: Must match range of service in `dataset`
s|integer|5|User selected global scale factor: 0 to 10
t|string|"en-US"|User selected locale: BCP 47-style
x|float|-3.689|Map view Longitude
y|float|40.405|Map view Latitude
z|integer|6|Map view zoom

*Tip:* Instead of specifying `s`, consider altering the corresponding `linkScale`, `nodeScale`, and/or `placeScale`. Instead of specifying `t`, consider altering the default `locale`.

## Here Queries

Aquius can also be used as a stand-alone library via `aquius.here()`, which accepts and returns data Objects without script loading or user interface. Arguments, in order:

1. `dataObject` - `Object` containing a [Data Structure](#data-structure).
1. `x` - `float` longitude of _here_ in WGS 84.
1. `y` - `float` latitude of _here_ in WGS 84.
1. `range` - `float` distance from _here_ to be searched for nodes, in metres.
1. `options` - optional `Object` of key:value pairs.

Possible `options`:

* `callback` - function to receive the result, which should accept `Object` (0) `error` (javascript Error), (1) `output` (as returned without callback, described below), and (2) `options` (as submitted, which also allows bespoke objects to be passed through to the callback).
* `filter` - `integer` index of network to filter by.
* `geoJSON` - `Array` of strings describing map layers to be outputted in GeoJSON format ("here", "link", "node" and/or "place").
* `sanitize` - `boolean` check data integrity. Checks occur unless set to `false`. Repeat queries with the same dataObject can safely set sanitize to false.
* `service` - `integer` index of service to restrict by.

**Caution:** Sanitize does not fix logical errors within the dataObject, and should not be used to check data quality. Sanitize merely replaces missing or incomplete structures with zero-value defaults, typically causing bad data to be ignored without throwing errors.

Without a callback, calls to `aquius.here()` return a JSON-like Object. On error, that Object contains a key `error`.

If `geoJSON` is specified a GeoJSON-style Object with a `FeatureCollection` is returned. In addition to [the standard geometry data](https://tools.ietf.org/html/rfc7946), each `Feature` has two or more properties, which can be referenced when applying styling in your GIS application:

* `type` - "here", "link" (routes), "node" (stops), "place" (demographics).
* `value` - numeric value associated with each (such as daily services or resident population).
* `node` - array of reference data objects relating to the node itself.
* `link` - array of reference data objects relating to the links at the node, or the links contained on the line.

The information contained within keys `node` and `link` is that otherwise displayed in popup boxes when clicking on nodes or links in the map view. The existence of keys `node` and `link` will depend on the dataset. The potential format of the objects that described for the `reference` property of `node` and `link` in the [Data Structure](#data-structure).

Otherwise the JSON-like Object will contain `summary`, is an Object containing link, node and place totals, and geometry for `here`, `link`, `node` and `place`. Each geometry key contains an Array of features, where each feature is an Object with a key `value` (the associated numeric value, such as number of services) and either `circle` (here, node, place) or `polyline` (link). Circles consist of an Array containing a single x, y pair of WGS 84 coordinates. Polylines consist of an Array of Arrays in route order, each child Array containing a similar pair of x, y coordinates. The (sanitized) `dataObject` will also be returned as a key, allowing subsequent queries with the returned dataObject to be passed with `sanitize` false, which speeds up the query slighty.

**Caution:** Both `link` outputs mirrors the internal construction of Aquius' map, which tries to find adjoining links with the same service frequency and attach them to one continuous polyline. The logic reduces the number of objects, but does not find all logical links, nor does it necessarily links the paths taken by individual services. If you need to map individual routes interrogate the original link in the original `dataObject`.

## GTFS To Aquius

[General Transit Feed Specification](https://developers.google.com/transit/gtfs/reference/) is the most widely used interchange format for public transport schedule data. A [script is available](https://github.com/timhowgego/Aquius/tree/master/dist) that automatically converts single GTFS archives into Aquius datasets. This script is currently under development, requiring both features and testing, so check the output carefully. [A live demonstration is available here](https://timhowgego.github.io/Aquius/live/gtfs/). Alternatively, run the `gtfs.min.js` file privately, either: 

1. With a user interface: Within a webpage, load the script and call `gtfsToAquius.init("aquius-div-id")`, where "aquius-div-id" is the ID of an empty element on the page.
1. From another script: Call `gtfsToAquius.process(gtfs, options)`. Required value `gtfs` is an `Object` consisting of keys representing the name of the GTFS file without extension, whose value is the raw text content of the GTFS file - for example, `"calendar": "raw,csv,string,data"`. `options` is an optional `Object` that may contain the following keys, each value itself an `Object`:

* `callback` - function to receive the result, which should accept 3 `Object`: `error` (javascript Error), `output` (as returned without callback, described below), `options` (as submitted, which also allows bespoke objects to be passed through to the callback).
* `config` - contains key:value pairs for optional configuration settings, as described in the next section.
* `geojson` - is the content of a GeoJSON file pre-parsed into an `Object`, as detailed in a subsequent section.

Without callback, the function returns an `Object` with possible keys:

* `aquius` - as `dataObject`.
* `config` - as `config`, but with defaults or calculated values applied.
* `error` - `Array` of error message strings.
* `gtfs` - `Object` containing GTFS data parsed into arrays.
* `gtfsHead` - `Object` describing the column indices of values in gtfs.
* `summary` - `Object` containing summary `network` (productFilter-serviceFilter matrix) and `service` (service histogram).

**Caution:** Runtime is typically about a second per 10 megabytes of GTFS text data (with roughly half that time spent processing the Comma Separated Values), plus time to assign stops (nodes) to population (places). The single-operator networks found in most GTFS archives should process within about 5 seconds, but very complex multi-operator conurbations may take longer. Specifying a callback is therefore recommended to avoid browser crashes.

### Configuration File

By default GTFS To Aquius simply analyses services over the next 7 days, producing average daily service totals, filtered by agency (operator). GTFS To Aquius accepts and produces a file called `config.json`, which in the absence of a detailed user interface, is the only way to customise the GTFS processing. The minimum content of `config.json` is an empty `Object` (`{}`). To this `Object` one or more key: value pairs may be added. Currently supported keys are:

Key|Type|Default|Description
---|----|-------|-----------
allowColor|boolean|true|Include route-specific colors if available
allowName|boolean|true|Include stop names (increases file size)
allowRoute|boolean|true|Include route-specific short names
allowURL|boolean|true|Include URLs for stops and services where available (increases file size)
fromDate|YYYYMMDD dateString|Today|Start date for service pattern analysis (inclusive)
meta|object|{"schema": "0"}|As [Data Structure](#data-structure) meta key
option|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) option key
populationProperty|string|"population"|Field name in GeoJSON properties containing the number of people (or equivalent demographic statistic)
productFilter|object|{"type": "agency"}|Group services by, using network definitions, detailed below
serviceFilter|object|{}|Group services by, usingservice definitions, detailed below
servicePer|integer|1|Service average per period in days (1 gives daily totals, 7 gives weekly totals), regardless of fromDate/toDate
toDate|YYYYMMDD dateString|Next week|End date for service pattern analysis (inclusive)
translation|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) translation key

*Tip:* The fastest way to start building a `config.json` file is to run GTFS To Aquius once, download and edit the resulting `config.json`, then use that file in subsequent GTFS To Aquius processing. 

#### Product Filter

`productFilter` currently supports one of two `type` values:

* "agency", which assigns a product code for each operator identified in the GTFS (default).
* "mode", which assigns a product code for each vehicle type identified in the GTFS (only the original types and "supported" [extensions](https://developers.google.com/transit/gtfs/reference/extended-route-types) will be named).

By default GTFS To Aquius will create network filters consisting of all and each (with every filter named in en-US locale), including a `productFilter.network` key of arrays structured like the [Data Structure](#data-structure) network key (except references are to GTFS codes, not numerical indices). The easiest way to build bespoke network filters is to process the GTFS data once, then manually edit the `config.json` produced. If using GTFS To Aquius via its user interface, a rough count of routes and services by each `productFilter` will be produced after processing, allowing the most important categories to be identified.

**Caution:** Pre-defining the `productFilter` will prevent GTFS To Aquius adding or removing entries, so any new operators or modes subsequently added to the GTFS source will need to be added to the `productFilter` manually.

#### Service Filter

`serviceFilter` can be used (in addition to any productFilter) to summarises the number of service by different time period. `serviceFilter` is an `Object` consisting keys:

* `type` - `string` currently always "period".
* `period` - `Array` of time period definitions which are applied in GTFS processing.

The `period` is an `Object` consisting one or more keys:

* `day` - `Array` of days of the week, lowercase English (as used in GTFS Calendar headers). The `day` evaluated is that assigned by date in the GTFS.
* `time` - `Array` of time periods, each an `Object` with optional keys: `start` and `end` are strings in the format "HH:MM:SS" (as in GTFS times). Multiple sets of time periods can be specified as separate objects in the array.
* `name` - `Object` consisting locale:name in that locale.

In categorising services by time, GTFS To Aquius interprets times as equal to or after `start`, but before `end`. Only the keys specified are evaluated, thus a `start` time with no `end` time will analyse the entire service at and after that start time. For scheduled trips, each vehicle journey is evaluated based by mean time - the average of the earliest and latest times in the trip schedule. For example, a trip that leaves its first stop at 09:00:00 and arrives at its final stop at 10:00:00 would match any `time` criteria that included 09:30:00. Frequency-based services count the number of services based on the average headway(s) during the time period defined.

**Caution:** GTFS to Aquius naively mirrors whatever convention the GTFS file has used for handling services operated wholly or partly after midnight: Some operators consider all trips that commence after midnight to be on a new day. Others continue the previous day into the next until a notional "end of service". Days are continued into the next by adding 24 hours to the clock time (for example 01:10:00 on the _next_ day becomes 25:10:00 on the _original_ day). Early morning services may require two time conditions, as shown in the example below. Night services are easily double-counted, so if in doubt spot-check the output of such periods against published timetables.

```javascript
{
  "serviceFilter": {
    "type": "period",
    "period": {
      "name": {"en-US": "00:00-06:00 Catchall"},
      "time": [
        {"end": "06:00:00"},
          // Before 06:00, as today
        {"start": "24:00:00", "end": "30:00:00"}
          // Midnight until before 06:00, as tomorrow
      ]
      // No "day" key = all days
    }
  }
}
```

**Caution:** The `serviceFilter` always applies a single time criteria to the whole journey, an assumption that will become progressively less realistic the longer the GTFS network's average vehicle journey. For example, an urban network may be usefully differentiated between morning peak and inter-peak because most vehicle journey on urban networks are completed within an hour, and thus the resulting analysis will be accurate within 30 minutes at all nodes on the route. In contrast, inter-regional vehicle journey duration may be much longer, and such detailed time periods risk misrepresenting passenger journey opportunities at certain nodes: For example, a 4-hour vehicle journey are commences at 07:30 might match a morning peak definition at its origin, but not by the time it reaches its final destination at 11.30. Such networks may be better summarised more broadly - perhaps morning, afternoon and evening. Long-distance or international networks, where vehicle journeys routinely span whole days, may be unsuitable for any form of `serviceFilter`.

*Tip:* Service totals within defined time periods are still calculated as specified by `servicePer` - with default 1, the total service per day. This is a pragmatic way of fairly summarising unfamiliar networks with different periods of operation. However if serviceFilter periods exclude the times of day when the network is closed, the `servicePer` setting may be set per hour (0.04167), which may make it easier to compare periods of unequal duration, especially on metro networks with defined opening and closing times.

### GeoJSON File

Optionally, a [GeoJSON file](http://geojson.org/) can be provided containing population data, which allows Aquius to summarise the people served by a network. The file must end in the extension `.json` or `.geojson`, must use (standard) WGS 84 coordinates, and must contain either Polygon or MultiPolygon geographic boundaries. Each feature should have a property containing the number of people (or equivalent demographic statistic), either using field name "population", or that defined in `config.json` as `populationProperty`. Excessively large or complex boundary files may delay processing, so before processing GTFS To Aquius, consider reducing the geographic area to only that required, or simplifying the geometry.

GTFS To Aquius will attempt to assign each node (stop) to the boundary it falls within. For consistent results, boundaries should not overlap and specific populations should not be counted more than once. The choice of boundaries should be appropriate for the scale and scope of the services within the GTFS file: Not so small as to routinely exclude nodes used by a local population, but not so large as to suggest unrealistic hinterlands or catchment areas. For example, an entire city may reasonably have access to an inter-regional network whose only stop is in the city centre, and thus city-level boundaries might be appropriate at inter-regional level. In contrast, an urban network within a city should use more detailed boundaries that reflect the inherently local nature of the areas served. Note that the population summaries produced by Aquius are not intended to be precise, rather to provide a broad summary of where people are relative to nearby routes, and to allow basic comparison of differences in network connectivity.

## Data Structure

Aquius requires a network `dataset` JSON file to work with. The dataset file uses a custom data structure, one intended to be sufficiently compact to load quickly, and thus shorn of much human readability and structural flexibility. The dataset file will require custom pre-processing by the creator of the network. As is, there is no automated tool for this, although one might yet emerge. Aquius performs some basic checks on data integrity (of minimum types and lengths) that should catch the more heinous errors, but it is beholden on the creator of the dataset to control the quality of the data therein. JSON files must be encoded to UTF-8.

### Meta

The most basic dataset is a `Object` with a key "meta", that key containing another `Object` with key:value pairs. The only required key is `schema`, which is currently always a `string` "0". Other options are as shown in the example below:

```javascript
{
  "meta": {
    "attribution": {
      "en-US": "Copyright and attribution",
        // Short, text only
      "es-ES": "Derechos"
    },
    "description": {
      "en-US": "Human readable description"
        // For future use
    },
    "name": {
      "en-US": "Human readable name",
        // Short, text only
      "es-ES": "Nombre"
    },
    "schema": "0",
      // Required, always "0"
    "url": "absolute/url/to/more/human/readable/information"
      // Will be wrapped around name
  }
}
```

### Translation

An optional key `translation` may contain an `Object` with the same structure as that described for the `translation` [Configuration](#configuration) option. Translations in the dataset take precedence over every translation except any in the `translation` option. If the dataset's network consists of _Stations_ and not generic _Stops_, the dataset's `translation` key contains the best place to redefine that, for example:

```javascript
"translation": {
  "en-US": {
    "node": "Stations"
  },
  "es-ES": {
    "node": "Estaciones"
  }
}
```

### Option

An optional key `option` may contain an `Object` with the same structure as the [Configuration](#configuration) second argument of `aquius.init()`, described earlier. Keys `id`, `dataset`, `network` and `translation` are ignored, all in their own way redundant. It is recommended to set a sensible initial User State for the map (map view, _here_ click), but this key can also be used to apply Styling (color, scale), or even control the User Interface or set alternative base mapping. The `option` key only takes precedence over Aquius' defaults, not over valid hash or Configuration options.

### Network

Each `link` (detailed below) is categorised with an `integer` product ID. The definition of a product is flexible: The network might be organised by different brands, operators, or vehicles. One or more products ID(s) are grouped into network filters, each network filter becoming an option for the user. Products can be added to more than one network filter, and there is no limit on the total number of filters, beyond practical usability: An interface with a hundred network filters would be hard to both digest and navigate.

The dataset's `network` key consists of an `Array` of network filters, in the order they are to be presented in the User Interface. This order should be kept constant once the dataset is released, since each network filter is referenced in hashable options by its index in the `Array`. Each network filter itself consists of an `Array` of two parts:

1. `Array` containing `integer` product IDs of those products that make up the network filter.
1. `Object` containing key:text, where locale is the key, and text is a `string` containing the translated network filter name.
1. `Object` containing optional properties, reserved for future use.

```javascript
"network": [
  [
    [1, 2, 3],
    {"en-US": "All 3 products"},
    {}
  ],
  [
    [1, 3],
    {"en-US": "Just 1 and 3"},
    {}
  ]
]
```

### Service

Each `link` (detailed below) is categorised with one or more counts of the number of services (typically vehicle journeys) associated with the link. The precise variable is flexible - for example, it could be used to indicate total vehicle capacity - but ensure the `link` key in `translation` contains an appropriate description.

Networks may be adequately described with just one service count per link. However `service` allows the same link to described for different time periods - for example, 2 journeys in the morning and 3 in the afternoon - especially important to differentiate services that are not provided at marginal times, such as evenings or weekends. The `service` key defines those time periods as service filters. Like `network`, each filter consist of a 3-part `Array`:

1. `Array` of the index positions within each `link` service array that are to be summed to produce the total service count.
1. `Object` containing the localised description of the filter.
1. `Object` containing optional properties, reserved for future use.

In the example below, the corresponding `link` service array would consist of an `Array` of two numbers, the first morning, and second afternoon. The first filter would sum both, while the second "morning" filter would take only the first service count, the third "afternoon" filter only the second count.

```javascript
"service": [
  [
    [0, 1],
      // Index positions in link service array
    {"en-US": "All day"},
    {}
  ],
  [
    [0],
    {"en-US": "Morning"},
    {}
  ],
  [
    [1],
    {"en-US": "Afternoon"},
    {}
  ]
]
```

**Caution:** Providing more that one index position in link service array should only be done where the values sum without invalidating the service count metric used. For example, if the metric used is "services per day", summing two days together will falsely double the service level "per day". Aquius does not know how the original metric was constructed, so cannot make logical assumptions such as averaging instead of summing.

### Link

The `link` key contains an `Array` of lines of link data. Each line of link data is defined as a route upon which the entire service has identical stopping points and identical product. On some networks, every daily service will become a separate line of link data, on others almost the whole day's service can be attached to a single line of link data. Each line of link data is itself an `Array` consisting 4 parts:

1. Product networks (`Array` of `integer`) - list of the Product IDs associated with this link, as described in Network above.
1. Service levels (`Array` of `float`) - where each value in the array contains a count indicative of service level, such as total vehicle journeys operated (the sum of both directions, unless assigned the property `direction` below). To allow filtering, the position in the array must correspond to a position defined in the `service` key. 
1. Nodes served (`Array` of `integer`) - the Node ID of each point the services stops to serve passengers, in order. Routes are presumed to also operate in the reverse direction, but, as described below, the route can be define as one direction only, in which case the start point is only the first point in the `Array`. Node IDs reference an index position in `node`, and if the `link` is populated with data, so must `node` (and in turn `place`).
1. Properties (`Object`) - an extendable area for keys containing optional data or indicating special processing conditions. In many cases this will be empty, vis: `{}`. Optional keys are described below:

* `circular` or `c` - `boolean` true or `integer` 1 indicates operation is actually a continuous loop, where the start and end points are the same node. Only the nodes for one complete loop should be included - the notional start and end node thus included twice. Circular services are processed so that their duplicated start/end node is only counted once. Figure-of-eight loops are intentionally double-counted at the midpoint each service passes twice per journey, since such services may reasonably be considered to offer two completely different routes to passengers, however this does result in arithmetic quirks (as demonstrated by Madrid Atocha's C-7).
* `direction` or `d` - `boolean` true or `integer` 1 indicates operation is only in the direction recorded, not also in the opposite direction. As noted under [Known Issues](#known-issues), services that are both circular and directional will produce numeric quirks. *Tip:* Services that loop only at one end of a route (sometimes seen in tram operation) should be recorded as uni-directional with nodes on the common section recorded twice, once in each direction - not recorded as circular.
* `pickup` or `u` - `Array` containing `integer` Node IDs describing nodes on the service's route where passengers can only board (get on), not alight (get off).
* `reference` or `r` - `Array` containing one or more `Object` of descriptive data associated with the routes within the link - for example, route headcodes or display colors. Possible keys and values are described below.
* `setdown` or `s` - `Array` containing `integer` Node IDs describing nodes on the service's route where passengers can only alight (get off), not board (get on).
* `shared` or `h` - `integer` Product ID of the parent service. Shared allows an existing parent service to be assigned an additional child service of a different product category. The specific parent service is not specifically identified, only its product. Over common sections of route, only the parent will be processed and shown, however if the network is filtered to exclude the parent, the child is processed. The parent service should be defined as the longer of the two routes, such that the parent includes all the stops of the child. Shared was originally required to describe Renfe's practice of selling (state supported) local journey fare products on sections of (theoretically commercial) long distance services, but such operations are also common in aviation, where a single flight may carry seats sold by more than one airline.
* `split` or `t` - `Array` containing `integer` Node IDs describing the unique nodes on the service's route. Split is assigned to one half of a service operated as two portions attached together over a common part of route. Splits can be affected at either or both ends of the route. In theory more than two portions can be handled by assigning a split to every portion except the first. Like `shared` services, and companion service is not specifically identified, however a `split` should be of the same Product ID as its companion service (else to avoid miscalculations `network` needs to be constructed so that both Product IDs fall into the same categories). Railway services south of London were built on this style of operation, while operators such as Renfe only split trains operated on _very_ long distance routes.

Possible keys within the `reference` Object - all values are `string`:

* `c` - 6-hexadecimal HTML-style color associated with the route line
* `n` - short name or human-readable reference code (recommended)
* `t` - 6-hexadecimal HTML-style color associated with the route text (must contrast against the color of the line)
* `u` - URL link for further human-readable information

References should be consistently presented across the dataset - for example always "L1", not also "l1" and "line one". References should also be unique within localities - for example, the dataset may contain several different services referenced "L1", but should they serve the same node they will be aggregated together as "L1".

**Caution:** `split`, and perhaps `shared`, can be hacked to mimic guaranteed onward connections to key destinations, especially from isolated branch lines or feeder services. However this feature should not be abused to imply all possible interchanges, and it may be more sensible to let users discover for themselves the options available at _the end of the line_.

### Node

The `node` key contains an `Array` of node (stop, station) information. Each node is referenced (within `link`) by its index position. The format is simple:

1. Longitude (`float`) - "x" coordinate of the node in WGS 84.
1. Latitude (`float`) - "y" coordinate of the node in WGS 84.
1. Properties (`Object`) - an extendable area for keys related to this node. Minimum empty, vis: `{}`.

Optional `properties` keys are:

* `place` or `p` - `integer` index position in `place` (described below) for the place that contains this node. Recommended.
* `reference` or `r` - `Array` containing one or more `Object` of descriptive data associated with the stop or stops within the node - for example, names or URLs containing further information.

Possible `reference` keys and values are described below - all values are `string`:

* `n` - short name or human-readable reference code (recommended)
* `u` - URL link for further human-readable information

*Tip:* To reduce `dataset` file size, restrict the accuracy of coordinates to only that needed - metres, not millmetres. Likewise, while URLs and detailed names may provide useful reference information, these can inflate file size dramatically when lengthy or when attached to every node or service.

### Place

The `place` key has a similar structure to `node` above - each place an `Array` referenced by index position. Place can be an entirely empty `Array`, vis: `[]`. Places are intended to quickly summarise local demographics - how many people are connected together. Places are assigned simply to nodes (see `node` above), so each node has just one demographic association. For example, the Spanish Railway dataset uses the census of local municipalities, since municipalities tend to self-define the concept of locality, with both cities and villages falling into single municipalities. It is not possible to change the population catchment for specific Products within the same network, so the dataset creator will need to find an acceptable compromise that represents the realistic catchment of a node. Aquius was originally intended simply to show the broad presence of people nearby. As is, if precise catchment is important, networks containing a mix of intra and inter-urban services may be best split into two completely separate datasets, to be shown in two separate instances of Aquius.

1. Longitude (`float`) - "x" coordinate of the place in WGS 84.
1. Latitude (`float`) - "y" coordinate of the place in WGS 84.
1. Properties (`Object`) - an extendable area for keys related to this place. Minimum empty, vis: `{}`.

Optional `properties` keys are:

* `population` or `p` - `integer` total resident population, or equivalent statistic (recommended).

*Tip:* For bespoke analysis, the population can be hacked for any geospatial data that sums.

## License

Aquius, with no dataset, is freely reusable and modifiable under a [MIT License](https://opensource.org/licenses/MIT).

[Dataset](https://github.com/timhowgego/AquiusData) copyright will differ, and no licensing guarantees can be given unless made explicit by all entities represented within the dataset. Be warned that no protection is afforded by the _logical nonsense_ of a public transport operator attempting to deny the public dissemination of their public operations. Nor should government-owned companies or state concessionaires be naively presumed to operate in some kind of public domain. Railways, in particular, can accumulate all manner of arcane legislation and strategic national paranoias. In the era of Google many public transport operators have grown less controlling of their information channels, but some traditional entities, [such as Renfe](https://www.elconfidencial.com/espana/madrid/2018-07-17/transparencia-retrasos-cercanias-madrid_1593408/), are not yet beyond claiming basic observable information to be a trade secret. Your mileage may vary.

## Contributing

[Contributors are most welcome](https://github.com/timhowgego/Aquius/). Check the [Known Issues](#known-issues) before making suggestions. Try to establish a consensus before augmenting data structures.

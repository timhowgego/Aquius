# Aquius

> _Here+Us_ - An Alternative Approach to Public Transport Network Discovery

## Description

[![Aquius at Ciudad Real](https://timhowgego.github.io/Aquius/static/aquius-ciudad-real.jpg)](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/#x-3.296/y39.092/z7/c-3.966/k38.955/m8/s7/vlphn)

Aquius visualises the links between people that are made possible by transport networks. The user clicks once on a location, and near-instantly all the routes, stops, services, and connected populations are summarised visually. Aquius answers the question, what services are available _here_? And to a degree, who am I connected to by those services? Population is a proxy for all manner of socio-economic activity and facilities, measured both in utility and in perception. Conceptually Aquius is half-way between the two common approaches to public transport information:

1. Conventional journey planners are aimed at users that already have some understanding of what routes exist. Aquius summarises overall service patterns.
1. Most network maps are pre-defined and necessarily simplified, typically showing an entire city or territory. Aquius relates to a bespoke location.

The application makes no server queries (once the initial dataset has been loaded), so responds near-instantly. That speed allows network discovery by trial and error, which changes the user dynamic from _being told_, to playful learning. Aquius can be configured to locate stops and services very precisely, or to summarise networks strategically. Aquius can even allow proposed route and service changes to be rapidly visualised and assessed in context, prior to any detailed scheduling or modelling.

[![Aquius at Torrassa with Barcelona Metro Line 9/10 Connection](https://timhowgego.github.io/Aquius/static/aquius-barcelona-l9-l10.jpg)](https://timhowgego.github.io/Aquius/live/amb-vortex-2018/#c2.11985/k41.36972/m13/x2.153/y41.3832/z12/p2/r2/s3/tca-ES)

Some caveats:

* Aquius maps straight-line links, not the precise geographic route taken. This allows services that do not stop at all intermediate stops to be clearly differentiated. It also makes it technically possible for an internet client to work with a large transport network. Aquius is however limited to conventional scheduled public transport with fixed stopping points.
* Aquius summarises the patterns of fixed public transport networks. It presumes a degree of network stability over time, and cannot sensibly be used to describe a transport network that is in constant flux. The Aquius data structure allows filtering by time period, but such periods must be pre-defined and cannot offer the same precision as schedule-based systems.
* Aquius only shows the direct service from _here_, not journeys achieved by interchange. If the intention is to show all possible interchanges without letting users explore the possibilities for themselves, then Aquius is not the logical platform to use: Displaying all possible interchanges ultimately results in a map of every service which fails to convey what is genuinely local to _here_.

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
* [GeoJSON to Aquius](#geojson-to-aquius)
* [Merge Aquius](#merge-aquius)
* [Data Structure](#data-structure)
* [License](#license)
* [Contributing](#contributing)

## User FAQ

#### How are services counted?

Broadly, every service leaving from a node (stop, station) within _here_ is counted once. If that service also arrives at a node within here, it is additionally counted at that node as an arrival, thus within _here_, services are summarised in both directions. Outside _here_, only services from _here_ to _there_ are summarised. Any specific local setdown and pickup conditions are taken into consideration. Services (typically trains) that split mid-journey are counted once over common sections. Individual services that combine more than one product together on the same vehicle are counted no more than once, by the longer distance component unless that has been filtered out by the choice of network.

#### How are people counted?

The population is that of the local area containing one or more nodes (stops, stations) linked to _here_ by the services shown, including the population of _here_ itself. Each node is assigned to just one such geographic area. The geography of these areas is defined by the dataset creator, but is intended to _broadly_ convey the natural catchment or hinterland of the service, and typically uses local administrative boundaries (such as districts or municipalities) to reflect local definitions of place. This population may be additionally factored by Connectivity, as described in the next paragraph.

#### What is connectivity?

Connectivity factors the population linked (as described above) by the service level linking it - every unique service linking _here_ with the local area is counted once. The Connectivity slider can be moved to reflect one of four broad service expectations, the defaults summarised in the table below (for left to right on the slider, read down the table). The slider attempts to capture broad differences in network perception, for example that 14 trains per day from London to Paris is considered a "good" service, while operating 14 daily _within_ either city would be almost imperceptible. Except for Any, which does not factor population, the precise formula is: 1 - ( 1 / (service * factor)), if the result is greater than 0, with the default factor values: 2 (long distance), 0.2 (local/interurban) and 0.02 (city). The dataset creator or host may change the factor value (see [Configuration](#configuration) key `connectivity`), but not the formula.

Connectivity Expectation|0% Factor Service|50% Factor Service|95% Factor Service
------------------------|-----------------|------------------|------------------
Any|0|Entire population always counted|Entire population always counted
Long Distance|0.5|1|10
Local/Interurban|5|10|100
City|50|100|1000

#### What do the line widths and circle diameters indicate?

Links and stops are scaled by the logarithm of the service (such as total daily trains), so at high service levels the visual display is only slightly increased. Increasing the scale increases the visual distinction between service levels, but may flood the view in urban areas. The original numbers are associated reference information can be seen by clicking on the link or node. The area of each population circle is in proportion to the number of residents. The original numbers are displayed in a tooltip, visible when mousing over (or similar) the circle. The here circle defines the exact geographic area of _here_, that searched to find local stops.

#### How can everything be displayed?

Zoom out a lot, then click... The result may be visually hard to digest, and laggy - especially with an unfiltered network or when showing multiple map layers: Aquius wasn't really intended to display everything. Hosts can limit this behaviour (by increasing the value of [Configuration](#configuration) key `minZoom`).

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

The first argument of the function `aquius.init()` requires a valid `id` refering to an empty element on the page. The second optional argument is an `Object` containing keyed options which override the default configuration. Two option keys are worth introducing here:

* `dataset`: `String` (quoted) of the full path and filename of the JSON file containing the network data (the default is empty).
* `uiHash`: `Boolean` (true or false, no quotes) indicating whether Aquius records its current state as a hash in the browser's URL bar (great for sharing, but may interfere with other elements of web page design).

Others options are documented in the [Configuration](#configuration) section below. Here is an example with the Spanish Railway dataset:

```html
<div id="aquius" style="height:100%;"></div>
<script src="https://timhowgego.github.io/Aquius/dist/aquius.min.js"
  async></script>
<script>window.addEventListener("load", function() {
  aquius.init("aquius", {
    "dataset": "https://timhowgego.github.io/AquiusData/es-rail/20-jul-2018.json",
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

Aquius is fundamentally inaccessible to those with severe visual impairment: The limitation lay in the concept, not primarily the implementation. Aquius can't even read out the stop names, since it doesn't necessarily know anything about them except their coordinates. Genuine solutions are more radical than marginal, implying a quite separate application. For example, conversion of the map into a 3D soundscape, or allowing users to walk a route as if playing a [MUD](https://en.wikipedia.org/wiki/MUD).

Multiple base maps can be added but only one may be displayed: A user selection and associated customisation was envisaged for the future.

Population bubbles are not necessarily centered on towns: These are typically located at the centroid of the underlying administrative area, which does not necessary relate to the main settlement. Their purpose is simply to indicate the presence of people at a broad scale, not to map nuances in local population distribution.

Circular services that constitute two routes in different directions, that share some stops but not all, display with the service in both directions serving the entire shared part of the loop: Circular services that operate in both directions normally halve the total service to represent the journey possibilities either clockwise or counter-clockwise, without needing to decide which direction to travel in to reach any one stop. Circular services that take different routes depending on their direction cannot simply be halved in this manner, even over the common section, because the service level in each direction is not necessarily the same. Consequently Aquius would have to understand which direction to travel in order to reach each destination the fastest. That would be technically possible by calculating distance, but would remain prone to misinterpretation, because a service with a significantly higher service frequency in one direction might reasonably be used to make journeys round almost the entire loop, regadless of distance. The safest assumption is that services can be ridden round the loop in either direction. In practice this issue only rarely arises, [notably in Parla](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/#x-3.76265/y40.23928/z14/c-3.7669/k40.2324/m10/s5/vlphn/n2).

Passenger journey opportunities are not always accurately presented where pickup/setdown restrictions apply, and multiple nodes on the same service are included within _here_: Assuming the dataset is correctly structured (see `link` property `block` in the [Data Structure](#data-structure)), Aquius should always count services accurately at each node and on each link. However the combination may be visually misleading, perhaps suggesting a link between nodes which are actually being counted only in regard to travel to destinations further along the route. The underlying problem lay in cabotage restrictions: Routes where pickup and setdown criteria vary depending on the passenger journey being undertaken, not the vehicle journey. This poses a logical problem for Aquius, since it needs to both display the links from each separate node and acknowledge that these separate links are provided by the exact same vehicle journey.

Link (route), node (stop), place names cannot be localised: Most text within Aquius can be localised (translated), but nodes, places and routes cannot. Many different references can be assigned to the same thing, so multiple languages are supported. But these have no language identifier, so cannot be matched to the user's locale setting. This is compromise between dataset filesize (nodes names, in particular, often bloat files, and even adding a localisation key to single names would tend to increase that bloat by about 50%), practical reality (few agencies provide multilingual information in a structured format, often opting for single names such as "oneLanguage / anotherLanguage"), and the importance of this information within Aquius (strictly secondary reference information).

Link reference data does not change to match the selected service filter: The reference data ascribed to each link describes all the service information that has been used to build the link. The service filter changes the total number of services, but does not know which pieces of reference data pertains to which service within the link, so continues to display all the reference data. Reference data is primarily intended to convey route-level information, which should not vary from trip to trip. While Aquius can display very detailed reference data, such as trip-specific train numbers which vary between different periods of time, such information is intended as a marginal benefit, especially to assist in debugging data, and should be presented with caution.

## Configuration

As described in the [Quick Setup](#quick-setup) section, the second optional argument of `aquius.init()` takes an `Object` containing keys and respective values. Any key not specified will use the default. Bespoke options must conform to the expected data `type`.

*Tip*: Clicking the `Embed` link on the bottom of the Layer Control will produce a dummy HTML file containing the configuration at the time the Embed was produced.

### Data Sources

All except `dataset`, introduced in the [Quick Setup](#quick-setup) section, can be happily ignored in most cases.

Key|Type|Default|Description
---|----|-------|-----------
base|Array|See below|Array of objects containing base layer tile maps, described below
connectivity|float|1.0|Factor for connectivity calculation: population * ( 1 - ( 1 / ( service * ( 2 / ( power(10, configuration.p) / 10 )) * connectivity))), where p is greater than 0
dataObject|Object|{}|JSON-like [network data](#data-structure) as an Object: Used in preference to dataset
dataset|string|""|JSON file containing network data: Recommended full URL, not just filename
leaflet|Object|{}|Active Leaflet library Object L: Used in preference to loading own library
locale|string|"en-US"|Default locale, BCP 47-style. Not to be confused with user selection, `t`
map|Object|{}|Active Leaflet map Object: Used in preference to own map
network|Array|[]|Extension of `network`: Array of products, Object of locale keyed names, described below
networkAdd|boolean|true|Append this network extension to dataset defaults. Set false to replace defaults
translation|Object|{}|Custom translations, format described below

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

The extension of `network` allows extra network filters to be appended to the defaults provided in the JSON `dataset`. For example, in the Spanish Railways dataset a separate network filter for [FEVE](https://en.wikipedia.org/wiki/Renfe_Feve) could be created using the product's ID, here 14, and its name. Multiple products or networks can be added in this way. See the [Data Structure](#data-structure) section for more details. To replace the defaults in the dataset, set configuration `networkAdd` to `false`.

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

The `translation` `Object` allows bespoke locales to be hacked in. Bespoke translations take precedence over everything else. Even network names can be hacked by referencing key `network0`, where the final `integer` is the index position in the network `Array`. While this is not the optimal way to perform proper translation, it may prove convenient. The structure of `translation` matches that of `getDefaultTranslation()` within `aquius.init()`. Currently translatable strings are listed below. Missing translations default to `locale`, else are rendered blank. 

```javascript
"translation": {
  "xx-XX": {
    // BCP 47-style locale
    "lang": "X-ish",
      // Required language name in that locale
    "connectivity": "Connectivity",
      // Translate values into locale, leave keys alone
    "connectivityRange": "Any - Frequent",
    "embed": "Embed",
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
uiConnectivity|boolean|true|Enables connectivity slider (if the dataset's `place` length > 0)
uiHash|boolean|false|Enables recording of the user state in the URL's hash
uiLocale|boolean|true|Enables locale selector
uiNetwork|boolean|true|Enables network selector (if the dataset's `network` length > 1)
uiPanel|boolean|true|Enables summary statistic panel
uiScale|boolean|true|Enables scale slider
uiService|boolean|true|Enables service selector (if the dataset's `service` length > 1)
uiShare|boolean|true|Enables embed and export
uiStore|boolean|true|Enables browser [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) of user state

### User State

As seen in the URL hash (if `uiHash` is `true`). Coordinates are always WGS 84. _Here_ click defines the centre of the search.

Key|Type|Default|Description
---|----|-------|-----------
c|float|-0.89|_Here_ click Longitude
k|float|41.66|_Here_ click Latitude
m|integer|11|_Here_ click zoom
n|integer|0|User selected network filter: Must match range of network in `dataset`
p|integer|0|User selected connectivity setting
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
1. `options` - optional `Object` of key:value pairs.

Possible `options`:

* `callback` - function to receive the result, which should accept `Object` (0) `error` (javascript Error), (1) `output` (as returned without callback, described below), and (2) `options` (as submitted, which also allows bespoke objects to be passed through to the callback).
* `connectivity` - `float` factor applied to weight population by service level: population * ( 1 - ( 1 / (service * connectivity))), if result is greater than zero. If `connectivity` is missing or less than or equal to 0, population is not factored. The user interface calculates `connectivity` as: configuration.connectivity * ( 2 / ( power(10, configuration.p) / 10 )), producing factors 2, 0.2, and 0.02 - broadly matching long distance, local/inter-urban and city expectations.
* `geoJSON` - `Array` of strings describing map layers to be outputted in GeoJSON format ("here", "link", "node" and/or "place").
* `network` - `integer` index of network to filter by.
* `place` - `Array` of `integer` dataObject `place` indices to define _here_ (in addition to any range/x/y criteria). Place-based criteria do not currently not return a specific geographic feature equivalent of here.
* `range` - `float` distance from _here_ to be searched for nodes, in metres.
* `sanitize` - `boolean` check data integrity. Checks occur unless set to `false`. Repeat queries with the same dataObject can safely set sanitize to false.
* `service` - `integer` index of service to filter by.
* `x` - `float` longitude of _here_ in WGS 84.
* `y` - `float` latitude of _here_ in WGS 84.

**Caution:** Sanitize does not fix logical errors within the dataObject, and should not be used to check data quality. Sanitize merely replaces missing or incomplete structures with zero-value defaults, typically causing bad data to be ignored without throwing errors.

Without a callback, calls to `aquius.here()` return a JSON-like Object. On error, that Object contains a key `error`.

If `geoJSON` is specified a GeoJSON-style Object with a `FeatureCollection` is returned. In addition to [the standard geometry data](https://tools.ietf.org/html/rfc7946), each `Feature` has two or more properties, which can be referenced when applying styling in your GIS application:

* `type` - "here", "link" (routes), "node" (stops), "place" (demographics).
* `value` - numeric value associated with each (such as daily services or resident population).
* `node` - array of reference data objects relating to the node itself.
* `link` - array of reference data objects relating to the links at the node, or the links contained on the line.
* `place` - array of reference data objects relating to the place itself.

The information contained within keys `node` and `link` is that otherwise displayed in popup boxes when clicking on nodes or links in the map view. The existence of keys `node`, `link` and `place` will depend on the dataset. The potential format of the objects within `reference` property of `node`, `link` and `place` are described in the [Data Structure](#data-structure).

Otherwise the JSON-like Object will contain `summary`, is an Object containing link, node and place totals, and geometry for `here`, `link`, `node` and `place`. Each geometry key contains an Array of features, where each feature is an Object with a key `value` (the associated numeric value, such as number of services) and either `circle` (here, node, place) or `polyline` (link). Circles consist of an Array containing a single x, y pair of WGS 84 coordinates. Polylines consist of an Array of Arrays in route order, each child Array containing a similar pair of x, y coordinates. The (sanitized) `dataObject` will also be returned as a key, allowing subsequent queries with the returned dataObject to be passed with `sanitize` false, which speeds up the query slighty.

**Caution:** Both `link` outputs mirrors the internal construction of Aquius' map, which tries to find adjoining links with the same service frequency and attach them to one continuous polyline. The logic reduces the number of objects, but does not find all logical links, nor does it necessarily links the paths taken by individual services. If you need to map individual routes interrogate the original link in the original `dataObject`.

## GTFS To Aquius

[General Transit Feed Specification](https://developers.google.com/transit/gtfs/reference/) is the most widely used interchange format for public transport schedule data. A [script is available](https://github.com/timhowgego/Aquius/tree/master/dist) that automatically converts single GTFS archives into Aquius datasets. This script is currently under development, requiring both features and testing, so check the output carefully. [A live demonstration is available here](https://timhowgego.github.io/Aquius/live/gtfs/). Alternatively, run the `gtfs.min.js` file privately, either: 

1. With a user interface: Within a webpage, load the script and call `gtfsToAquius.init("aquius-div-id")`, where "aquius-div-id" is the ID of an empty element on the page.
1. From another script: Call `gtfsToAquius.process(gtfs, options)`. Required value `gtfs` is an `Object` consisting of keys representing the name of the GTFS file without extension, whose value is an array containing one or more blocks of raw text from the GTFS file - for example, `"calendar": ["raw,csv,string,data"]`. If the file is split into multiple blocks (to allow very large files to be handled) the first block must contain at least the first header line. `options` is an optional `Object` that may contain the following keys, each value itself an `Object`:

* `callback` - function to receive the result, which should accept 3 `Object`: `error` (javascript Error), `output` (as returned without callback, described below), `options` (as submitted, which also allows bespoke objects to be passed through to the callback).
* `config` - contains key:value pairs for optional configuration settings, as described in the next section.
* `geojson` - is the content of a GeoJSON file pre-parsed into an `Object`, as detailed in a subsequent section.

Without callback, the function returns an `Object` with possible keys:

* `aquius` - as `dataObject`.
* `config` - as `config`, but with defaults or calculated values applied.
* `error` - `Array` of error message strings.
* `summary` - `Object` containing summary `network` (productFilter-serviceFilter matrix) and `service` (service histogram).

**Caution:** Runtime is typically about a second per 10 megabytes of GTFS text data (with roughly half that time spent processing the Comma Separated Values), plus time to assign stops (nodes) to population (places). The single-operator networks found in most GTFS archives should process within 5-10 seconds, but very complex multi-operator conurbations may take longer. Processing requires operating system memory of up to 10 times the total size of the raw text data. If processing takes more than a minute, it is highly likely that the machine has run out of free physical memory, and processing should be aborted.

*Tip:* To work around any memory limitation, copy all the GTFS file and divide `stop_times.txt` (which is almost always far larger than any other file, and thus most likely the trigger for any memory issue) into two or more pieces, each placed in a separate file directory. The `stop_times.txt` divide must not break a trip (divide immediately before a `stop_sequence` 0) and for optimum efficiency should break between different `route_id`. The first (header) line of `stop_times.txt` must be present as the first line of each file piece. Add to each directory identical config.json files and a complete copy of all the other GTFS files used - except `frequencies.txt`, which if present must only be added in one directory. GTFS file `shapes.txt` (which is sometimes large) is not used by GTFS to Aquius, so can also be skipped. Run GTFS to Aquius on each directory separately, then use [Merge Aquius](#merge-aquius) to merge the two (or more) outputs together. GTFS to Aquius will skip any (not-frequency) link it can find stop_times for, while Merge Aquius automatically merges the duplicate nodes created.

### Configuration File

By default GTFS To Aquius simply analyses services over the next 7 days, producing average daily service totals, filtered by agency (operator). GTFS To Aquius accepts and produces a file called `config.json`, which in the absence of a detailed user interface, is the only way to customise the GTFS processing. The minimum content of `config.json` is empty, vis: `{}`. To this `Object` one or more key: value pairs may be added. Currently supported keys are:

Key|Type|Default|Description
---|----|-------|-----------
allowCabotage|boolean|false|Process duplicate vehicle trips with varying pickup/setdown restrictions as cabotage, described below
allowCode|boolean|true|Include stop codes
allowColor|boolean|true|Include route-specific colors
allowDuplication|boolean|false|Include duplicate vehicle trips (same route, service period, direction and stop times)
allowHeadsign|boolean|false|Include trip-specific headsigns (information may be redundant if using allowRoute)
allowName|boolean|true|Include stop names (increases file size significantly)
allowRoute|boolean|true|Include route-specific short names
allowRouteUrl|boolean|true|Include URLs for routes (can increase file size significantly unless URLs conform to logical repetitive style)
allowSplit|boolean|false|Include trips on the same route (service period and direction) which share at least two (but not all) stop times as "split"
allowStopUrl|boolean|true|Include URLs for stops (can increase file size significantly unless URLs conform to logical repetitive style)
coordinatePrecision|integer|5|Coordinate decimal places (smaller values tend to group clusters of stops), described below
duplicationRouteOnly|boolean|true|Restrict duplicate check to services on the same route
fromDate|YYYYMMDD dateString|Today|Start date for service pattern analysis (inclusive)
inGeojson|boolean|true|If geojson boundaries are provided, only services at stops within a boundary will be analysed
isCircular|array|[]|GTFS "route_id" (strings) to be referenced as circular. If empty (default), GTFS to Aquius follows its own logic, described below
meta|object|{"schema": "0"}|As [Data Structure](#data-structure) meta key
mirrorLink|boolean|true|Services mirrored in reverse are combined into the same link. Reduces filesize, but can distort service averages
networkFilter|object|{"type": "agency"}|Group services by, using network definitions, detailed below
option|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) option key
placeNameProperty|string|"name"|Field name in GeoJSON properties containing the name or identifier of the place
populationProperty|string|"population"|Field name in GeoJSON properties containing the number of people (or equivalent demographic statistic)
productOverride|object|{}|Properties applied to all links with the same product ID, detailed below
routeExclude|array|[]|GTFS "route_id" (strings) to be excluded from analysis
routeInclude|array|[]|GTFS "route_id" (strings) to be included in analysis, all if empty
routeOverride|object|{}|Properties applied to routes, by GTFS "route_id" key, detailed below
serviceFilter|object|{}|Group services by, using service definitions, detailed below
servicePer|integer|1|Service average per period in days (1 gives daily totals, 7 gives weekly totals), regardless of fromDate/toDate
stopExclude|array|[]|GTFS "stop_id" (strings) to be excluded from analysis
stopInclude|array|[]|GTFS "stop_id" (strings) to be included in analysis, all if empty
stopOverride|object|{}|Properties applied to stops, by GTFS "stop_id" key, detailed below
toDate|YYYYMMDD dateString|Next week|End date for service pattern analysis (inclusive)
translation|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) translation key

*Tip:* The fastest way to start building a `config.json` file is to run GTFS To Aquius once, download and edit the resulting `config.json`, then use that file in subsequent GTFS To Aquius processing.

#### Circulars

Circular services are where one journey seamlessly operates into the next as a contiunous loop. If circular services are not correctly flagged circular, the Aquius output will double-count those services at their start/end node, and (for circular services defined separately in each direction) may imply passenger journey opportunities that are affected only by the least direct of route around the circle.

The key `isCircular` allows specific "route_id" values to be flagged as circular. Values reference the first column of GTFS `routes.txt`. If one or more route is specified in this way, only those routes specified will be flagged as circular. This gives absolute control over what services are assigned circular, and should be used if the default logic fails to correctly differentiate circular routes.

If `isCircular` is empty, GTFS to Aquius will attempt to evaulate whether a route is circular, vis:

1. Start and end stops are the same, and the route contains multiple trips with a shared (non-empty) "block_id". [Loops should be coded](http://gtfs.org/best-practices/#loop-routes) with a single "block_id" that groups all such journeys, but this convention is not universal, and often the "block_id" is empty.
1. Start and end stops are the same, with the stop immediately after the start and the stop prior to the end greater than 200 metres from each other. Aquius processes basic [lasso routes](http://gtfs.org/best-practices/#lasso-routes) as uni-directional, so should not flag such routes as circular. Complex loops, such as figures-of-eight (dual loop with a common mid-point) or dual lassos (common middle section with loops at each end), should be flagged as circular. Although the "outbound" and "inbound" segment of a simple lasso route may be serve the same location along the same street, the actual stops served may differ because they are on opposite sides of that street, hence the range test.

*Tip:* To disabled the default logic without actually assigning any route as circular specify `"isCircular": [null]`. This gives the array a length greater than 0 (thus disables the default logic) without ever matching any valid "route_id" (which cannot be null).

#### Coordinates

Lowering the value of `coordinatePrecision` reduces the size of the Aquius output file, but not just because the coordinate data stored is shorter: At lower `coordinatePrecision`, stops that are in close proximity will tend to merge into single nodes, which in turn tends to result in fewer unique links between nodes. Such merges reflect mathematical rounding, and will not necessarily group clusters of stops in a way that users or operators might consider logical. Networks with widespread use of pickup and setdown restrictions may be rendered illogical by excessive grouping. Aggregation of different stops into the same node may also create false duplicate trips, since duplication is assessed by node, not original stop - in most case setting `allowDuplication` to true will avoid this issue (as detailed below). If the precise identification of individual stops is important, increase the default `coordinatePrecision` to avoid grouping. Very low `coordinatePrecision` values effectively transform the entire network into a fixed "[Vortex Grid](https://en.wikipedia.org/wiki/The_Adventure_Game)", useful for strategic geospatial analysis.

#### Duplication

A duplicate is a vehicle trip which shares all its stop times with another trip on the same route (unless `duplicationRouteOnly` is false), and in the same direction and same (calendar) day. Duplicates normally add no additional passenger journey opportunities, merely capacity, so by default these duplicate trips are removed (`allowDuplication` is false). If the Aquius output specifically analyses capacity or counts vehicles, set `allowDuplication` to true. Highly serviced routes with imprecise schedules may need `allowDuplication` as true to avoid falsely identified duplicates being removed. Networks analysed at low `coordinatePrecision` may need `allowDuplication` as true to avoid falsely created duplicates being removed - separate trips that originally served different stops at the same time having been grouped into single nodes. By default duplicates between different routes are excluded, since high-frequency urban corridors may schedule more than one trip per minute between the same stops. This route limitation can be overriden by setting `duplicationRouteOnly` to false, which would then, for example, allow split services (see below) which have been allocated to different routes to be grouped properly.

A split is a vehicle trip that duplicates at least two, but not all, of its stop times with another trip on the same route (and in the same service period and direction). If `allowSplit` is set true, the duplicate trip will have its unique stops attributed as a "split", which means Aquius does not double-count the service over common sections of route. The original trip remains unchanged. Genuine split operation occurs in multi-vehicle modes such as rail. Note that where such split trips have been misappropiated to indicate guaranteed connections onto entirely different routes, GTFS to Aquius will double-count the service at stops common to both routes because it only considers duplication within routes. In such cases, set `allowSplit` to false and maintain the default `allowDuplication` as false to discard such trips entirely.

The two prior duplication definitions do not consider any pickup or setdown restrictions, only that the vehicle trip is duplicated or split. If `allowCabotage` is set true, trips that would be categorised as duplicate or split, but contain pickup or setdown criteria which differ from the original trip, are processed differently: Such duplicates are grouped to indicate they are part of the same vehicle journey, and thus should only be _counted_ once as a group, but are not removed because each expresses a unique combination of _passenger_ journey opportunities, depending on the origin and destination of that passenger. Technically these are assigned an Aquius "block". Services operating between different administrative jurisdictions, especially different nations, may be restricted in the point between which passengers can be carried - for example, an international service may be able to pickup passengers at stops within one country and set them down in another, but not convey passengers solely within either country. Each set of restrictions may be represented in the GTFS file as a duplicate trip.

#### Overrides

Configuration key `productOverride` allows colors to be applied to all links of the same product, where product is defined by `networkFilter.type` (above). The `productOverride` key's value is is an `Object` whose key names refer to GTFS codes (`agency_id` values for "agency", or `route_type` values for "mode"), and whose values consist of an `Object` of properties to override any (and missing) GTFS values. Currently only two keys are supported: "route_color" and "route_text_color", each value is a `string` containing a 6-character hexadecimal HTML-style color ([matching GTFS specification](https://developers.google.com/transit/gtfs/reference/#routestxt)). These allow colors to be added by product, for example to apply agency-specific colors to their respective operations.

Configuration key `routeOverride` allows bespoke colors or route names to be applied by route (taking precedence). The `routeOverride` key's value is an `Object` whose keys are GTFS "route_id" values. The value of each "route_id" key is an `Object` containing keys "route_short_name", "route_color", "route_text_color" and/or "route_url", with content matching GTFS specification.

Configuration key `stopOverride` allows poorly geocoded stops to be given valid coordinates, and bespoke (user friendly) codes, names, and URLs to be specified. The `stopOverride` key's value is is an `Object` whose keys are GTFS "stop_id" values. The value of each "stop_id" key is an `Object` containing override coordinates (WGS 84 floats) "x" and "y", and/or "stop_code", "stop_name" and "stop_url". If GTFS to Aquius encounters 0,0 coordinates it will automatically add these stops to `stopOverride` for manual editing.

#### Network Filter

Configuration key `networkFilter` defines groups of product IDs which the user can select to filter the results displayed. These filters are held in the network key of the [Data Structure](#data-structure). `networkFilter` is an `Object` consisting one or more keys:

* `type` - `string` either "agency", which assigns a product code for each operator identified in the GTFS (default), or "mode", which assigns a product code for each vehicle type identified in the GTFS (only the original types and "supported" [extensions](https://developers.google.com/transit/gtfs/reference/extended-route-types) will be named).
* `network` - `Array` containing network filter definitions, each an `Array` consisting: First, an `Array` of the GTFS codes (`agency_id` values for "agency", or `route_type` values for "mode") included in the filter, and second an `Object` of localised names in the style `{"en-US": "English name"}`. If the GTFS file contains no agency_id, specify the `agency_name` instead.
* `reference` - `Object` whose keys are GTFS codes (`agency_id` values for "agency", or `route_type` values for "mode") and those value is an `Object` of localised names in the style `{"en-US": "English name"}`, which allows the respective names to be specified.

*Tip:* The easiest way to build bespoke network filters is to initially specify only `type`, process the GTFS data once, then manually edit the `config.json` produced. If using GTFS To Aquius via its user interface, a rough count of routes and services by each `productFilter` will be produced after processing, allowing the most important categories to be identified.

**Caution:** Pre-defining the `networkFilter` will prevent GTFS To Aquius adding or removing entries, so any new operators or modes subsequently added to the GTFS source will need to be added manually.

#### Service Filter

Configuration key `serviceFilter` can be used (in addition to any productFilter) to filter or summarise the number of service by different time periods. `serviceFilter` is an `Object` consisting one or more keys:

* `type` - `string` currently always "period".
* `period` - `Array` of time period definitions which are applied in GTFS processing.

Each time period definition within `period` is an `Object` consisting one or more keys:

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

**Caution:** The `serviceFilter` always applies a single time criteria to the whole journey, an assumption that will become progressively less realistic the longer the GTFS network's average vehicle journey. For example, an urban network may be usefully differentiated between morning peak and inter-peak because most vehicle journeys on urban networks are completed within an hour, and thus the resulting analysis will be accurate within 30 minutes at all nodes on the route. In contrast, inter-regional vehicle journey duration may be much longer, and such detailed time periods risk misrepresenting passenger journey opportunities at certain nodes: For example, a 4-hour vehicle journey are commences at 07:30 might match a morning peak definition at its origin, but not by the time it reaches its final destination at 11.30. Such networks may be better summarised more broadly - perhaps morning, afternoon and evening. Long-distance or international networks, where vehicle journeys routinely span whole days, may be unsuitable for any form of `serviceFilter`.

*Tip:* Service totals within defined time periods are still calculated as specified by `servicePer` - with default 1, the total service per day. This is a pragmatic way of fairly summarising unfamiliar networks with different periods of operation. However if serviceFilter periods exclude the times of day when the network is closed, the `servicePer` setting may be set per hour (0.04167), which may make it easier to compare periods of unequal duration, especially on metro networks with defined opening and closing times.

### GeoJSON File

Optionally, a [GeoJSON file](http://geojson.org/) can be provided containing population data, which allows Aquius to summarise the people served by a network. The file must end in the extension `.json` or `.geojson`, must use (standard) WGS 84 coordinates, and must contain either Polygon or MultiPolygon geographic boundaries. Each feature should have a property containing the number of people (or equivalent demographic statistic), either using field name "population", or that defined in `config.json` as `populationProperty`. Excessively large or complex boundary files may delay processing, so before processing GTFS To Aquius, consider reducing the geographic area to only that required, or simplifying the geometry.

GTFS To Aquius will attempt to assign each node (stop) to the boundary it falls within. For consistent results, boundaries should not overlap and specific populations should not be counted more than once. The choice of boundaries should be appropriate for the scale and scope of the services within the GTFS file: Not so small as to routinely exclude nodes used by a local population, but not so large as to suggest unrealistic hinterlands or catchment areas. For example, an entire city may reasonably have access to an inter-regional network whose only stop is in the city centre, and thus city-level boundaries might be appropriate at inter-regional level. In contrast, an urban network within a city should use more detailed boundaries that reflect the inherently local nature of the areas served. Note that the population summaries produced by Aquius are not intended to be precise, rather to provide a broad summary of where people are relative to nearby routes, and to allow basic comparison of differences in network connectivity.

If configuration key `inGeojson` is true (the default), the entire dataset will be limited to services between stops within the GeoJSON boundaries.

## GeoJSON to Aquius

This tool converts geographic network data in [GeoJSON format](http://geojson.org/) into an Aquius dataset file. GeoJSON lines become Aquius links, GeoJSON points become Aquius nodes, and GeoJSON boundaries become Aquius places (population). Lines must be provided, other data is optional. If points are provided, they must match the coordinates of the start of end of lines to be processed usefully. GeoJSON files must be projected using WGS 84 (which is normally the default for the format).

Non-spatial data may be attached as GeoJSON field names (technically called properties). This data typically matches the Aquius [Data Structure](#data-structure) (for links and nodes respectively), except each piece of data takes a GeoJSON field of its own. For example, data items that Aquius contains within a reference `Object` within a properties `Object` are instead exposed as a _top_ _level_ GeoJSON property. Data that is otherwise held as an `Array` (notably product and service keys) is instead provided in the GeoJSON as a comma-separated `string`. For example, a network with two service filter definitions should attach a `service` property to each GeoJSON line with the string value `"10,20"`, where 10 is the service count associated with the first filter and 20 the second filter.

GeoJSON files can be crafted to match the expected property names, or bespoke names in GeoJSON files can be assigned using a `config.json` file, as listed below. The optional file `config.json` is also important for defining product and service filters (which are otherwise left empty), and adding other header data, such as meta names and translations.

Key|Type|Default|Description
---|----|-------|-----------
blockProperty|string|"block"|Field name in GeoJSON properties containing block
circularProperty|string|"circular"|Field name in GeoJSON properties containing circular
colorProperty|string|"color"|Field name in GeoJSON properties containing service color (6-hex, no hash, [as GTFS specification](https://developers.google.com/transit/gtfs/reference/#routestxt))
coordinatePrecision|integer|5|Coordinate decimal places (as Aquius to GTFS [Coordinates](#coordinates))
directionProperty|string|"direction"|Field name in GeoJSON properties containing direction
inGeojson|boolean|true|If geojson boundaries are provided, only services at nodes within a boundary will be analysed
linkNameProperty|string|"name"|Field name in GeoJSON properties containing service name
linkUrlProperty|string|"url"|Field name in GeoJSON properties containing service url
meta|object|{}|As [Data Structure](#data-structure) meta key
network|object|{}|As [Data Structure](#data-structure) network key
nodeCodeProperty|string|"code"|Field name in GeoJSON properties containing node code
nodeNameProperty|string|"name"|Field name in GeoJSON properties containing node name
nodeUrlProperty|string|"url"|Field name in GeoJSON properties containing node url
option|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) option key
placeNameProperty|string|"name"|Field name in GeoJSON properties containing the name or identifier of the place
populationProperty|string|"population"|Field name in GeoJSON properties containing the number of people (or equivalent demographic statistic)
product|Array|[]|As [Data Structure](#data-structure) network reference.product key (products in index order, referencing productProperty data)
productProperty|string|"product"|Field name in GeoJSON properties containing product array as comma-separated string
service|object|{}|As [Data Structure](#data-structure) service key
serviceProperty|string|"service"|Field name in GeoJSON properties containing service array as comma-separated string
sharedProperty|string|"shared"|Field name in GeoJSON properties containing shared product ID
textColorProperty|string|"text"|Field name in GeoJSON properties containing service text color (6-hex, no hash, [as GTFS specification](https://developers.google.com/transit/gtfs/reference/#routestxt))
translation|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) translation key

**Caution:** Pickup, setdown, and split are not currently supported. Product and service filters are specified exactly as they appear in the output file, as described in [Data Structure](#data-structure): There is no logical processing of product and service data of the type performed by [GTFS To Aquius](#gtfs-to-aquius).

This script is currently under development, requiring both features and testing, so check the output carefully. [A live demonstration is available here](https://timhowgego.github.io/Aquius/live/geojson/). Alternatively, run the `geojson.min.js` [file](https://github.com/timhowgego/Aquius/tree/master/dist) privately, either: 

1. With a user interface: Within a webpage, load the script and call `geojsonToAquius.init("aquius-div-id")`, where "aquius-div-id" is the ID of an empty element on the page.
1. From another script: Call `geojsonToAquius.cartograph(geojson, options)`. 

Required value `geojson` is an `Array` consisting of GeoJSON `Object`s - the original file content already processed by `JSON.parse()`. `options` is an optional `Object` that may contain the following keys, each value itself an `Object`:

* `callback` - function to receive the result, which should accept 3 `Object`: `error` (javascript Error), `output` (as returned without callback, described below), `options` (as submitted, which also allows bespoke objects to be passed through to the callback).
* `config` - contains key:value pairs for optional configuration settings. The minimum content of `config.json` is empty, vis: `{}`. To this `Object` one or more key: value pairs may be added, as listed above.

Without callback, the function returns an `Object` with possible keys:

* `aquius` - as `dataObject`.
* `config` - as `config`, but with defaults or calculated values applied.
* `error` - `Array` of error message strings.

## Merge Aquius

This tool merges Aquius dataset files into a single file. The tool cannot understand these files beyond their technical structure, so the files should be produced in a similar manner:

* Files must not duplicate one another's service count - else service totals will erroneously double. *Tip:* Links can be duplicated, although since each dataset is assigned unique product IDs, such links are structured separately, so Merge Aquius is not the most efficient means of combining different services on the same route.
* Files must all share the same or very similiar service filters - the filter indices and definitions are blindly assumed comparable.
* Files should use (if any) the same place/demographic data - the original boundaries are not present, so no assessment can be made of overlaps.

Nodes and places are grouped by shared coordinates - the number of decimal places can be set as configuration key `coordinatePrecision` (described below). Products are grouped on name - all translations must be identical. Meta, option and translation content will be copied, but cannot always be merged - configuration keys can be used to supply definitions.

This script is currently under development, requiring both features and testing, so check the output carefully. [A live demonstration is available here](https://timhowgego.github.io/Aquius/live/merge/). Alternatively, run the `merge.min.js` [file](https://github.com/timhowgego/Aquius/tree/master/dist) privately, either: 

1. With a user interface: Within a webpage, load the script and call `mergeAquius.init("aquius-div-id")`, where "aquius-div-id" is the ID of an empty element on the page.
1. From another script: Call `mergeAquius.merge(input, options)`. 

Required value `input` is an `Array` consisting of one or more `dataObject` in the order to be processed. As a minimum, these must have `meta.schema`, `link` and `node` keys. `options` is an optional `Object` that may contain the following keys, each value itself an `Object`:

* `callback` - function to receive the result, which should accept 3 `Object`: `error` (javascript Error), `output` (as returned without callback, described below), `options` (as submitted, which also allows bespoke objects to be passed through to the callback).
* `config` - contains key:value pairs for optional configuration settings. The minimum content of `config.json` is empty, vis: `{}`. To this `Object` one or more key: value pairs may be added. Currently supported keys are:

Key|Type|Default|Description
---|----|-------|-----------
coordinatePrecision|integer|5|Coordinate decimal places (as GTFS to Aquius, smaller values tend to group clusters of stops)
meta|object|{}|As [Data Structure](#data-structure) meta key
option|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) option key
translation|object|{}|As [Configuration](#configuration)/[Data Structure](#data-structure) translation key

Without callback, the function returns an `Object` with possible keys:

* `aquius` - as `dataObject`.
* `config` - as `config`, but with defaults or calculated values applied.
* `error` - `Array` of error message strings.

**Caution:** Merge Aquius is intended to merge sets of files created in a similiar manner. Merging an adhoc sequence of Aquius files may appear successful, but the actual services presented may be extremely inconsistent, especially if service filters differ or different analysis periods have been used.

*Tip:* The original dataset files are processed in order of filename, which allows processing order to be controlled. The product filters of first file will appear at the top of the merged product filter. The nodes in the first file will tend to hold smaller index values, which may have a small impact on final file size. The first file is the first source consulted for meta, option, translation (all unless defined by configuration), and service filter.

## Data Structure

Aquius requires a network `dataset` JSON file to work with. The dataset file uses a custom data structure, one intended to be sufficiently compact to load quickly, and thus shorn of much human readability and structural flexibility. The dataset file will require custom pre-processing by the creator of the network. [GTFS To Aquius](#gtfs-to-aquius) or [GeoJSON to Aquius](#geojson-to-aquius) can be used to automate this pre-processing. Aquius performs some basic checks on data integrity (of minimum types and lengths) that should catch the more heinous errors, but it is beholden on the creator of the dataset to control the quality of the data therein. JSON files must be encoded to UTF-8.

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

### Reference

An optional key `reference` may contain an `Object`, itself containing keys whose value is an `Array` of verbose recurrent data. Specific values within the `dataset` may reference this recurrent data by index position, which avoids repeating identical data throughout the `dataset` and thus reduces filesize. Possible `reference` keys are:

* `color` - `Array` of `string` HTML color codes. Currently only 6-hexadecimal styles are supported, including the leading hash, for example `#1e00ff`.
* `product` - `Array` of `Object` translations of product names, for example `{"en-US":"English Name"}`, whose index position corresponds to product ID.
* `url` - `Array` of `string` URLs. URLs may contain one or more expression `[*]` which will be automatically replaced by a link/node specific identifier, such as the route number.

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
1. Properties (`Object`) - an extendable area for keys containing optional data or indicating special processing conditions. In many cases this will be empty, vis: `{}`. Optional keys are described below (short forms are recommended to reduce filesize):

* `block` or `b` - `integer` ID unique to a group of links which are actually provided by exactly the same vehicle journey(s), but where each link contains different properties. The ID has no meaning beyond uniquely defining the group. A `block` simply prevents the service total assigned to the group being counted more than once. If the properties of the block are the same, with the product and potentially the nodes differing, define a `shared` instead (which is generally simpler to manage and faster to process). Unlike `shared`, a block must contain links with the same service total, has no defined parent, can define groups of links which have the same product, and specifically identifies the links it is common to. The `block` is primarily used for cabotage, where pickup and setdown restrictions vary depending on the passenger journey being undertaken, not the vehicle journey. Flixbus, for example, manage such restrictions by creating multiple copies of each vehicle journey, each copy with different pickup and setdown conditions.
* `circular` or `c` - `boolean` true or `integer` 1 indicates operation is actually a continuous loop, where the start and end points are the same node. Only the nodes for one complete loop should be included - the notional start and end node thus included twice. Circular services are processed so that their duplicated start/end node is only counted once. Figure-of-eight loops are intentionally double-counted at the midpoint each service passes twice per journey, since such services may reasonably be considered to offer two completely different routes to passengers, however this does result in arithmetic quirks (as demonstrated by Madrid Atocha's C-7).
* `direction` or `d` - `boolean` true or `integer` 1 indicates operation is only in the direction recorded, not also in the opposite direction. As noted under [Known Issues](#known-issues), services that are both circular and directional will produce numeric quirks. *Tip:* Services that loop only at one end of a route ("lasso" routes) should be recorded as uni-directional with nodes on the common section recorded twice, once in each direction - not recorded as circular.
* `pickup` or `u` - `Array` containing `integer` Node IDs describing nodes on the service's route where passengers can only board (get on), not alight (get off), expressed relative to order of the Nodes served. For a link summarising both directions, a pickup condition automatically becomes a setdown condition when that node order is reversed. If pickup and setdown are not mirrorred thus, define two separate links, one in each direction.
* `reference` or `r` - `Array` containing one or more `Object` of descriptive data associated with the routes within the link - for example, route headcodes or display colors. Possible keys and values are described below.
* `setdown` or `s` - `Array` containing `integer` Node IDs describing nodes on the service's route where passengers can only alight (get off), not board (get on), expressed relative to order of the Nodes served. For a link summarising both directions, a setdown condition automatically becomes a pickup condition when that node order is reversed. If setdown and pickup are not mirrorred thus, define two separate links, one in each direction.
* `shared` or `h` - `integer` Product ID of the parent service. Shared allows an existing parent service to be assigned an additional child service of a different product category. The specific parent service is not specifically identified, only its product. Over common sections of route, only the parent will be processed and shown, however if the network is filtered to exclude the parent, the child is processed. The parent service should be defined as the longer of the two routes, such that the parent includes all the stops of the child. Shared was originally required to describe Renfe's practice of selling (state supported) local journey fare products on sections of (theoretically commercial) long distance services, but such operations are also common in aviation, where a single flight may carry seats sold by more than one airline.
* `split` or `t` - `Array` containing `integer` Node IDs describing the unique nodes on the service's route. Split is assigned to one half of a service operated as two portions attached together over a common part of route. Splits can be affected at either or both ends of the route. In theory more than two portions can be handled by assigning a split to every portion except the first. Like `shared` services, and companion service is not specifically identified, however a `split` should be of the same Product ID as its companion service (else to avoid miscalculations `network` needs to be constructed so that both Product IDs fall into the same categories). Railway services south of London were built on this style of operation, while operators such as Renfe only split trains operated on _very_ long distance routes.

Possible keys within the `reference` Object, all optional, although `n` is strongly recommended:

* `c` - `reference.color` index associated with the route line.
* `i` - reference code used in URL (see `u` below).
* `n` - short name or human-readable reference code.
* `t` - `reference.color` index associated with the route text (must contrast against the color of the line).
* `u` - `reference.url` index of link providing further human-readable information. The optional `[*]` in that URL will be replaced by `i` if available, else `n`, else removed.

References should be consistently presented across the dataset - for example always "L1", not also "l1" and "line one". References should also be unique within localities - for example, the dataset may contain several different services referenced "L1", but should they serve the same node they will be aggregated together as "L1".

**Caution:** Keys `split`, and perhaps `shared`, can be hacked to mimic guaranteed onward connections to key destinations, especially from isolated branch lines or feeder services. However this feature should not be abused to imply all possible interchanges, and it may be more sensible to let users discover for themselves the options available at _the end of the line_.

**Caution:** The use of keys containing lists of nodes (`pickup`, `setdown` and `split`) should be avoided where they contain a node that is duplicated within the link - for example, the start/end node of a circular - because Aquius will attempt to apply the criteria to each duplicate, not just one.

*Tip:* Links follow the node order regardless of any pickup and setdown restrictions, so by assigning a node as both pickup _and_ setdown only (thus allowing neither boarding nor alighting) the route shape can be altered without adding a stop.

### Node

The `node` key contains an `Array` of node (stop, station) information. Each node is referenced (within `link`) by its index position. The format is simple:

1. Longitude (`float`) - "x" coordinate of the node in WGS 84.
1. Latitude (`float`) - "y" coordinate of the node in WGS 84.
1. Properties (`Object`) - an extendable area for keys related to this node. Minimum empty, vis: `{}`.

Optional `properties` keys are:

* `place` or `p` - `integer` index position in `place` (described below) for the place that contains this node. Recommended.
* `reference` or `r` - `Array` containing one or more `Object` of descriptive data associated with the stop or stops within the node - for example, names or URLs containing further information.

Possible `reference` keys and values are described below, all optional, although `n` is strongly recommended:

* `i` - reference code used in URL (see `u` below).
* `n` - short name or human-readable reference code.
* `u` - `reference.url` index of link providing further human-readable information. The optional `[*]` in that URL will be replaced by `i` if available, else `n`, else removed.

*Tip:* To reduce `dataset` file size, restrict the accuracy of coordinates to only that needed - metres, not millmetres. Likewise, while URLs and detailed names may provide useful reference information, these can inflate file size dramatically when lengthy or when attached to every node or service.

### Place

The `place` key has a similar structure to `node` above - each place an `Array` referenced by index position. Place can be an entirely empty `Array`, vis: `[]`. Places are intended to quickly summarise local demographics - how many people are connected together. Places are assigned simply to nodes (see `node` above), so each node has just one demographic association. For example, the Spanish Railway dataset uses the census of local municipalities, since municipalities tend to self-define the concept of locality, with both cities and villages falling into single municipalities. It is not possible to change the population catchment for specific Products within the same network, so the dataset creator will need to find an acceptable compromise that represents the realistic catchment of a node. Aquius was originally intended simply to show the broad presence of people nearby. As is, if precise catchment is important, networks containing a mix of intra and inter-urban services may be best split into two completely separate datasets, to be shown in two separate instances of Aquius.

1. Longitude (`float`) - "x" coordinate of the place in WGS 84.
1. Latitude (`float`) - "y" coordinate of the place in WGS 84.
1. Properties (`Object`) - an extendable area for keys related to this place. Minimum empty, vis: `{}`.

Optional `properties` keys are:

* `population` or `p` - `integer` total resident population, or equivalent statistic (recommended).
* `reference` or `r` - `Array` containing one or more `Object` of descriptive data associated with the place. The only supported key is `n` - short name or human-readable reference code.

*Tip:* For bespoke analysis, the population can be hacked for any geospatial data that sums.

## License

Aquius, with no dataset, is freely reusable and modifiable under a [MIT License](https://opensource.org/licenses/MIT).

[Dataset](https://github.com/timhowgego/AquiusData) copyright will differ, and no licensing guarantees can be given unless made explicit by all entities represented within the dataset. Be warned that no protection is afforded by the _logical nonsense_ of a public transport operator attempting to deny the public dissemination of their public operations. Nor should government-owned companies or state concessionaires be naively presumed to operate in some kind of public domain. Railways, in particular, can accumulate all manner of arcane legislation and strategic national paranoias. In the era of Google many public transport operators have grown less controlling of their information channels, but some traditional entities, [such as Renfe](https://www.elconfidencial.com/espana/madrid/2018-07-17/transparencia-retrasos-cercanias-madrid_1593408/), are not yet beyond claiming basic observable information to be a trade secret. Your mileage may vary.


## Contributing

[Contributors are most welcome](https://github.com/timhowgego/Aquius/). Check the [Known Issues](#known-issues) before making suggestions. Try to establish a consensus before augmenting data structures.

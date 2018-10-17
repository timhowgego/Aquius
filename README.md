# Aquius

> _Here+Us_ - An Alternative Approach to Public Transport Network Discovery

## Description

[![Aquius at Ciudad Real](static/aquius-ciudad-real.jpg)](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/#x-3.296/y39.092/z7/c-3.966/k38.955/m8/s7/vlphn)

Aquius visualises the links between people that are made possible by transport networks. The user clicks once on a location, and near-instantly all the routes, stops, services, and connected populations are summarised visually. Aquius answers the question, what services are available _here_? And to a degree, who am I connected to by those services? Population is a proxy for all manner of socio-economic activity and facilities, measured both in utility and in perception. Conceptually Aquius is half-way between the two common approaches to public transport information:

1. Conventional journey planners are aimed at users that already have some understanding of what routes exist. Aquius summarises overall service patterns.
1. Most network maps are pre-defined and necessarily simplified, typically showing an entire city or territory. Aquius relates to a bespoke location.

The application makes no server queries (once the initial dataset has been loaded), so responds near-instantly. That speed allows network discovery by trial and error, which changes the user dynamic from _being told_, to playful learning.

Those advantages cannot maintain all the features of existing approaches to public transport information, notably:

* Aquius maps links, not routes. Straight-line links are shown between defined service stops, not drawn along the precise geographic route taken. This allows services that do not stop at all intermediate stops to be clearly differentiated. It also makes it technically possible for an internet client to work with a large transport network. Aquius is however limited to displaying conventional scheduled public transport, and perhaps does not display information in the manner users have come to expect.
* Aquius summarises the patterns of fixed public transport networks. It presumes a degree of network stability over time, and cannot sensibly be used to describe a transport network that is in constant flux. The Aquius data structure allows filtering by time period, but such periods must be pre-defined and cannot offer the same precision as schedule-based systems.
* Aquius only shows the direct service from _here_, not journeys achieved by interchange. It is theoretically possible to define keys interchanges from one service to one other service of the same type within the network dataset by mimicking a service which splits into two porions part-way through its journey. However if the intention is to show all possible interchanges without letting users explore the possibilities for themselves, then Aquius is not the logical platform to use: Displaying all possible interchanges ultimately results in a map of every service which fails to convey what is genuinely local to _here_.

> Ready to explore? [Try a live demonstration](https://timhowgego.github.io/Aquius/live/)!

In this document:

* [User FAQ](#user-faq)
* [Quick Setup](#quick-setup)
* [Limitations](#limitations)
* [Known Issues](#known-issues)
* [Configuration](#configuration)
* [Here Queries](#here-queries)
* [Data Structure](#data-structure)
* [License](#license)
* [Contributing](#contributing)

## User FAQ

*How are services counted?* Within the boundary of _here_ all unique services are counted in whatever direction each is operated. The overall total of unique services is displayed in the bottom left panel. Outside _here_, only the services from _here_ to there (in that specific direction) are displayed. The counts that appear as tooltips for specific stops and links follow the same logic. This is more intuitive where _here_ includes several stops, since the services between those stops are counted in both directions (because each stop is both origin and destination of the other). Services (typically trains) that split mid-journey are counted once over common sections. Individual services that combine more than one product together on the same vehicle are counted no more than once, by the longer distance component unless that has been filtered out by the choice of network.

*How are people counted?* This varies by dataset, but broadly: Population is that of the local area (municipality or similar) containing one or more stops linked to _here_ by one or more of the services shown. Plus the population of _here_ itself. For example, in the Spanish Railway dataset the population is that of the municipal Padrón at the start of 2017. Long distance services often have a wider population catchment than just the local municipality of the stations they serve, so this count of people must be read with caution. For example, "Camp Tarragona" ostensibly serves long distance travel from Tarragona and Reus, but is located in neither. However Camp Tarragona cannot fairly be attributed the population of its natural hinterland without factoring in penalties for local interchange and travel time: Such advanced analysis would be possible, but complicates the simple message the population bubbles are intended to convey.

*What do the line widths and circle diameters indicate?* Links and stops are scaled by the logarithm of the service (such as total daily trains), so at high service levels the visual display is only slightly increased. Increasing the scale increases the visual distinction between service levels, but may flood the view in urban areas. The area of each population circle is in proportion to the number of residents. The original numbers are displayed in a tooltip, visible when mousing over (or similar) the line or circle. The here circle defines the exact geographic area of _here_, that searched to find local stops.

*How can everything be displayed?* Zoom out a lot, then click... The result may be visually hard to digest, and laggy - especially with an unfiltered network or when showing multiple map layers: Aquius wasn't really intended to display everything.

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
    "dataset": "https://timhowgego.github.io/Aquius/data/es-rail-20-jul-2018.json",
    "locale": "es-ES",
    "uiHash": true
  });
});</script>
```

[Current script files can be found on Github](https://github.com/timhowgego/Aquius/tree/master/dist). [Sample datasets are also available](https://github.com/timhowgego/Aquius/tree/master/data).

*Tip:* Aquius can also be [used as a stand-alone library](#here-queries): `aquius.here()` accepts and returns data objects without script loading or user interface. Alternatively, Aquius can be built into an existing Leaflet map object by sending that object to `aquius.init()` as the value of [Configuration](#configuration) key `map`.

## Limitations

* Aquius is conceptually inaccessible to those with severe visual impairment ("blind people"), with no non-visual alternative available.
* Internet Explorer 9 is the oldest vintage of browser theoretically supported, although a modern browser will be faster (both in use of `Promise` to load data and `Canvas` to render data). Mobile and tablet devices are supported, although older devices may lag when interacting with the map interface.
* Aquius is written in pure Javascript, automatically loading its one dependency at runtime, [Leaflet](https://github.com/Leaflet/Leaflet). Aquius can produce graphically intensive results, so be cautious before embedding multiple instances in the same page, or adding Aquius to pages that are already cluttered.
* Aquius works adequately within large conurbations, or for inter-regional networks, but might become more technically problematic should multiple large networks be deposited into one unfiltered dataset. As is, a 2010-era computer mapping every rail service from Madrid takes about 100ms to do the calculations and another 100ms to map the result, which can then lag slightly when moved.
* A [GTFS](https://developers.google.com/transit/gtfs/reference/) converter is being written. In the meantime, the dataset format is described in the [Data Structure](#data-structure) section below.

## Known Issues

This section tries to explain the reasoning behind particular quirks.

### General

Aquius is fundamentally inaccessible to those with severe visual impairment: The limitation lay in the concept, not primarily the implementation. Aquius can't even read out the stop names, since it doesn't know anything about them except their coordinates. Genuine solutions are more radical than marginal, implying a quite separate application. For example, conversion of the map into a 3D soundscape, or allowing users to walk a route as if playing a [MUD](https://en.wikipedia.org/wiki/MUD).

Multiple base maps can be added but only one may be displayed: A user selection and associated customisation was envisaged for the future.

Population bubbles are not necessarily centered on towns: These are typically located at the centroid of the underlying administrative area, which does not necessary relate to the main settlement. Their purpose is simply to indicate the presence of people at a broad scale, not to map nuances in local population distribution.

Circular services that constitute two routes in different directions, that share some stops but not all, display with the service in both directions serving the entire shared part of the loop: Circular services normally halve the total service to represent the journey possibilities either clockwise or counter-clockwise, without needing to decide which direction to travel in to reach any one stop. Circular services that take different routes depending on their direction cannot simply be halved in this manner, even over the common section, because the service level in each direction is not necessarily the same. Consequently Aquius would have to understand which direction to travel in order to reach each destination the fastest. That would be technically possible by calculating distance, but would remain prone to misinterpretation, because a service with a significantly higher service frequency in one direction might reasonably be used to make journeys round almost the entire loop, regadless of distance. The safest assumption is that services can be ridden round the loop in either direction. In practice this issue only arises [in Parla](https://timhowgego.github.io/Aquius/live/es-rail-20-jul-2018/#x-3.76265/y40.23928/z14/c-3.7669/k40.2324/m10/s5/vlphn/n2).

### Spain

Spanish Railway dataset services are not totally accurate: The network was research in one direction (away from Madrid), during academic holidays, and with a Cercanías journey planner that only showed origin/destination and not the stops inbetween. Likewise service totals for many city metros were calculated from average headways, so won't be perfectly accurate. Tourist-type services have been excluded. International services only within Spain. For an introduction to the dataset, see [Disassembling Trenes](https://timhowgego.wordpress.com/2018/09/04/disassembling-trenes/).

Spanish Railway dataset summarises certain circular service incorrectly: Madrid's C-7 at Atocha is a specific exception to the rule that circular services are counted just once, because each C-7 loop serves different stations, and consequently the count of trains specifically at Atocha (the total arrival/departure in all directions) differs from the count of trains in the bottom-left panel (the total number of unique services involved). The quirks of the Parla tram, which is both circular and differs by direction, were discussed above.

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
    {"en-US": "FEVE"}
      // Locale:Name, must include the default locale
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
nodeColor|string|"#000"|CSS Color for node (stop) layer circle strokes
nodeScale|float|1.0|Scale factor for node (stop) layer circles: ceil( log( 1 + ( service * ( 1 / ( scale * 4) ) ) ) * scale * 2)
panelOpacity|float|0.7|CSS Opacity for background of the bottom-left summary panel
panelScale|float|1.0|Scale factor for text on the bottom-left summary panel
placeColor|string|"#00f"|CSS Color of place (population) layer circle fill
placeOpacity|float|0.5|CSS Opacity of place (population) layer circle fill: 0-1
placeScale|float|1.0|Scale factor for place (population) layer circles: ceil( sqrt( people * scale / 666) )

**Caution:** Colors accept any CSS format, but be wary of introducing transparency this way, because it tends to slow down rendering. Transparent link lines will render with ugly joins.

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
uiStore|boolean|true|Enables browser session storage of user state

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

* `dataObject` - `Object` containing a [Data Structure](#data-structure).
* `x` - `float` longitude of _here_ in WGS 84.
* `y` - `float` latitude of _here_ in WGS 84.
* `range` - `float` distance from _here_ to be searched for nodes, in metres.
* `options` - optional `Object` of key:value pairs.

Possible `options`:

* `filter` - `integer` index of network to filter by.
* `geoJSON` - `Array` of strings describing map layers to be outputted in GeoJSON format ("here", "link", "node" and/or "place").
* `sanitize` - `boolean` check data integrity. Checks occur unless set to `false`. Repeat queries with the same dataObject can safely set sanitize to false.
* `service` - `integer` index of service to restrict by.

**Caution:** Sanitize does not fix logical errors within the dataObject, and should not be used to check data quality. Sanitize merely replaces missing or incomplete structures with zero-value defaults, typically causing bad data to be ignored without throwing errors.

Calls to `aquius.here()` return a JSON-like Object. On error, that Object contains one key `error`.

Otherwise, if `geoJSON` is specified a GeoJSON-style Object with a `FeatureCollection` is returned. In addition to [the standard geometry data](https://tools.ietf.org/html/rfc7946), each `Feature` has two or more properties, which can be referenced when applying styling in your GIS application:

* `type` - "here", "link" (routes), "node" (stops), "place" (demographics)
* `value` - numeric value associated with each (such as daily services or resident population)
* `node` - array of reference data objects relating to the node itself
* `link` - array of reference data objects relating to the links at the node, or the links contained on the line

The information conatined within keys `node` and `link` is that otherwise displayed in popup boxes when clicking on nodes or links in the map view. The existence of keys `node` and `link` will depend on the dataset. The potential format of the objects that described for the `reference` property of `node` and `link` in the [Data Structure](#data-structure).

Otherwise the JSON-like Object will contain `summary`, is an Object containing link, node and place totals, and geometry for `here`, `link`, `node` and `place`. Each geometry key contains an Array of features, where each feature is an Object with a key `value` (the associated numeric value, such as number of services) and either `circle` (here, node, place) or `polyline` (link). Circles consist of an Array containing a single x, y pair of WGS 84 coordinates. Polylines consist of an Array of Arrays in route order, each child Array containing a similar pair of x, y coordinates. Unless `sanitize` is false, the sanitized `dataObject` will be returned as a key, allowing subsequent queries with the returned dataObject to be passed with `sanitize` false, which speeds up the query slighty.

**Caution:** Both `link` outputs mirrors the internal construction of Aquius' map, which tries to find adjoining links with the same service frequency and attach them to one continuous polyline. The logic reduces the number of objects, but does not find all logical links, nor does it necessarily links the paths taken by individual services. If you need to map individual routes interrogate the original link in the original `dataObject`.

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

An optional key `option` may contain an `Object` with the same structure as the [Configuration](#configuration) second argument of `aquius.init()`, described earlier. Keys `id`, `dataset`, `network` and `translation` are ignored, all in their own way redundant. It is recommended to set a sensible initial User State for the map (map view, _here_ click), but can also be used to apply Styling (color, scale), or even control the User Interface or set alternative base mapping. The `option` key only takes precedence over Aquius' defaults, not over valid hash or Configuration options.

### Network

Each `link` (detailed below) is categorised with an `integer` product ID. The definition of a product is flexible: The network might be organised by different brands, operators, or vehicles. One or more products ID(s) are grouped into network filters, each network filter becoming an option for the user. Products can be added to more than one network filter, and there is no limit on the total number of filters, beyond practical usability: An interface with a hundred network filters would be hard to both digest and navigate.

The dataset's `network` key consists of an `Array` of network filters, in the order they are to be presented in the User Interface. This order should be kept constant once the dataset is released, since each network filter is referenced in hashable options by its index in the `Array`. Each network filter itself consists of an `Array` of two parts:

1. An `Array` containing `integer` product IDs of those products that make up the network filter.
1. An `Object` containing key:text, where locale is the key, and text is a `string` containing the translated network filter name.

```javascript
"network": [
  [
    [1, 2, 3],
    {"en-US": "All 3 products"}
  ],
  [
    [1, 3],
    {"en-US": "Just 1 and 3"}
  ]
]
```

### Service

Each `link` (detailed below) is categorised with one or more counts of the number of services (typically vehicle journeys) associated with the link. The precise variable is flexible - for example, it could be used to indicate total vehicle capacity - but ensure the `link` key in `translation` contains an appropriate description.

Networks may be adequately described with just one service count per link. However `service` allows the same link to described for different time periods - for example, 2 journeys in the morning and 3 in the afternoon - especially important to differentiate services that are not provided at marginal times, such as evenings or weekends. The `service` key defines those time periods as service filters. Like `network`, each filter consist of a 2-part `Array`, the first part an `Array` of the index positions within each `link` service array that are to be summed to produce the total service count. The second part, the localised description of the filter. For example:

```javascript
"service": [
  [
    [0, 1],
      // Index positions in link service array
    {"en-US": "All day"}
  ],
  [
    [0],
    {"en-US": "Morning"}
  ],
  [
    [1],
    {"en-US": "Afternoon"}
  ]
]
```

The corresponding `link` service array would consist of an `Array` of two numbers, the first morning, and second afternoon. The first filter would sum both, while the second "morning" filter would take only the first service count, the third "afternoon" filter only the second count.

### Link

The `link` key contains an `Array` of lines of link data. Each line of link data is defined as a route upon which the entire service has identical stopping points and identical product. On some networks, every daily service will become a separate line of link data, on others almost the whole day's service can be attached to a single line of link data. Each line of link data is itself an `Array` consisting 4 parts:

1. Product networks (`Array` of `integer`) - list of the Product IDs associated with this link, as described in Network above.
1. Service levels (`Array` of `float`) - where each value in the array contains a count indicative of service level, such as total vehicle journeys operated (the sum of both directions, unless assigned the property `direction` below). To allow filtering, the position in the array must correspond to a position defined in the `service` key. 
1. Nodes served (`Array` of `integer`) - the Node ID of each point the services stops to serve passengers, in order. Routes are presumed to also operate in the reverse direction, but, as described below, the route can be define as one direction only, in which case the start point is only the first point in the `Array`. Node IDs reference an index position in `node`, and if the `link` is populated with data, so must `node` (and in turn `place`).
1. Properties (`Object`) - an extendable area for keys containing optional data or indicating special processing conditions. In many cases this will be empty, vis: `{}`. Optional keys are described below:

* `circular` or `c` - `boolean` true or `integer` 1 indicates operation is actually a continuous loop, where the start and end points are the same station. Only the nodes for one complete loop should be included - the notional start and end stop thus included twice. Circular services are processed so that their duplicated start/end station is only counted once. **Caution:** Figure-of-eight loops are intentionally double-counted at the midpoint each service passes twice per journey, since such services may reasonably be considered to offer two completely different routes to passengers, however this does result in arithmetic quirks (as demonstrated by Atocha's C-7, described in [Known Issues](#known-issues)).
* `direction` or `d` - `boolean` true or `integer` 1 indicates operation is only in the direction recorded, not also in the opposite direction. As noted under [Known Issues](#known-issues), services that are both circular and directional will produce numeric quirks. *Tip:* Services that loop only at one end of a route (sometimes seen in tram operation) should be recorded as uni-directional with nodes on the common section recorded twice, once in each direction - not recorded as circular.
* `pickup` or `u` - `Array` containing `integer` Node IDs describing nodes on the service's route where passengers can only board (get on), not alight (get off). Restriction not yet implemented.
* `reference` or `r` - `Array` containing one or more `Object` of descriptive data associated with the routes within the link - for example, route headcodes or display colors. Possible keys and values are described below.
* `setdown` or `s` - `Array` containing `integer` Node IDs describing nodes on the service's route where passengers can only alight (get off), not board (get on). Restriction not yet implemented.
* `shared` or `h` - `integer` Product ID of the parent service. Shared allows an existing parent service to be assigned an additional child service of a different product category. The specific parent service is not specifically identified, only its product. Over common sections of route, only the parent will be processed and shown, however if the network is filtered to exclude the parent, the child is processed. The parent service should be defined as the longer of the two routes, such that the parent includes all the stops of the child. Shared was originally required to describe Renfe's practice of selling (state supported) local journey fare products on sections of (theoretically commercial) long distance services, but such operations are also common in aviation, where a single flight may carry seats sold more than one airline.
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

*Tip:* To reduce `dataset` file size, restrict the accuracy of coordinates to only that needed - metres, not millmetres.

### Place

The `place` key has a similar structure to `node` above - each place an `Array` referenced by index position. Place can be an entirely empty `Array`, vis: `[]`. Places are intended to quickly summarise local demographics - how many people are connected together. Places are assigned simply to nodes (see `node` above), so each node has just one demographic association. For example, the Spanish Railway dataset uses the census of local municipalities, since municipalities tend to self-define the concept of locality, with both cities and villages falling into single municipalities. It is not possible to change the population catchment for specific Products within the same network, so the dataset creator will need to find an acceptable compromise that represents the realistic catchment of a node. Aquius was originally intended simply to show the broad presence of people nearby. As is, if precise catchment is important, networks containing a mix of intra and inter-urban services may be best split into two completely separate datasets, to be shown in two separate instances of Aquius.

1. Longitude (`float`) - "x" coordinate of the place in WGS 84.
1. Latitude (`float`) - "y" coordinate of the place in WGS 84.
1. Properties (`Object`) - an extendable area for keys related to this place. Minimum empty, vis: `{}`.

Optional `properties` keys are:

* `population` or `p` - `integer` total resident population, or equivalent statistic. Recommended.

*Tip:* For bespoke analysis, the population can be hacked for any geospatial data that sums.

## License

Aquius, with no dataset, is freely reusable and modifiable under a [MIT License](https://opensource.org/licenses/MIT).

Dataset copyright will differ, and no licensing guarantees can be given unless made explicit by all entities represented within the dataset. Be warned that no protection is afforded by the _logical nonsense_ of a public transport operator attempting to deny the public dissemination of their public operations. Nor should government-owned companies or state concessionaires be naively presumed to operate in some kind of public domain. Railways, in particular, can accumulate all manner of arcane legislation and strategic national paranoias. In the era of Google many public transport operators have grown less controlling of their information channels, but some traditional entities, [such as Renfe](https://www.elconfidencial.com/espana/madrid/2018-07-17/transparencia-retrasos-cercanias-madrid_1593408/), are not yet beyond claiming basic observable information to be a trade secret. Your mileage may vary.

### Spanish Railways

The Spanish Railway dataset is a creative work of academic curiosity, a limited snapshot of one day in history. The original creator makes no claim of ownership to any data therein, nor should be held responsible for its accuracy. Such can therefore be used as "freely" as its source. In particular, note that the contents of Renfe's website is claimed as an intellectual property whose reuse is "[totalmente prohibida](http://www.renfe.com/empresa/informacion_legal/CGUsoWeb.html)", however the work of the dataset may reasonably be judged creative, with no specific items of Renfe Operadora data reused in their original form. Non-operational information is based on sources whose reused is licensed more freely: Population data is "Prepared with data extracted from the INE website: [www.ine.es](http://www.ine.es/)", apparently with no restriction on reuse beyond that statement. Municipality centroids CC BY 4.0 from [Instituto Geográfico Nacional de España](http://www.ign.es/). National network station nodes were originally from the [IDEAADIF](http://ideadif.adif.es/) (INSPIRE) dataset, apparently under the same license.

## Contributing

[Contributors are most welcome](https://github.com/timhowgego/Aquius/). Check the [Known Issues](#known-issues) before making suggestions. Try to establish a consensus before augmenting data structures.

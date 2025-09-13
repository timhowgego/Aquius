"""
Analyses route variations (repeated sequences of the same nodes by same agency
on the same number route):
* Estimates route distance (haversine stop-to-stop, adjusted for indirectness).
* Estimates proportion of route serving each place (imprecise, splits mileage between
  pairs of stops in different places equally).
Gathers variations into single agency+route combination:
* Variations are weighted by service level (average daily total assumed first services
  entry or define position with --daily_service).
* Allocates route an operational archetype (indicative, only broadly reflecting local
  bus sector practice - place should include a "rural" boolean).

Script presumes the aquius file has been created with:
* An agency networkFilter and period serviceFilter.
* allowDuration=True (else average journey times and speeds will be omitted).
* No complex route data structures - block, shared, or split.

Usage: python aquius_to_route.py aquius.json
Add --format csv gpkg pq to output to one or more of CSV, GeoPackage, or GeoParquet
See aquius_to_route.py -h for further arguments
"""

import argparse
from collections.abc import Callable
from enum import Enum
import logging
from os import getcwd
from pathlib import Path
from typing import List, Optional, Union

import numpy as np
import geopandas as gpd
from haversine import haversine, Unit

from _common import get_common_args, is_aquius, load_json, use_arrow


WGS84CRS = "EPSG:4326"
UNKNOWN = "Unknown"

class Cols(Enum):
    """Property/column names"""

    AGENCY = "agency"
    AVERAGE_KM_DRIVEN_START_TO_END = "average_km_driven_start_to_end"
    AVERGE_KMPH ="average_kmph"
    GEOMETRY = "geometry"
    HEADSIGNS = "headsigns"
    IS_CIRCULAR = "is_circular"
    KM_DRIVEN_START_TO_END = "km_driven_start_to_end"
    OPERATIONAL_ARCHETYPE = "operational_archetype"
    POPULATION_SERVED = "population_served"
    UNIDIRECTIONAL = "unidirectional"
    ROUTE = "route"
    ROUTE_AGENCY = "agency_route"
    STOPS = "stops"
    STOPS_SERVED = "stops_served"
    TMP_DAILY_SERVICES = "_daily_service_journeys"
    TMP_PLACE_LIST = "_place_index_list"
    TMP_SERVICE_MINUTES = "_service_minutes"
    TMP_STOP_LIST = "_stop_index_list"

    @classmethod
    def average_minutes_per_journey(cls, service: str) -> str:
        """Service-period average_minutes_per_journey"""

        return f"{service}_average_minutes_per_journey"

    @classmethod
    def proportion_of_route(cls, extension: str) -> str:
        """Extension (e.g. rural) proportion_of_route"""

        return f"{extension}_proportion_of_route"

    @classmethod
    def service_journeys(cls, service: str) -> str:
        """Service-period service_journeys"""

        return f"{service}_service_journeys"

    @classmethod
    def get_temp_cols(cls) -> List[str]:
        """Return list of temporary columns"""

        return [col for col in [
            cls[attr].value for attr in dir(cls) if not attr.startswith("__")
            ] if col.startswith("_")]

    @classmethod
    def get_all_service_cols(cls, service: List[list],
                             column: str = "service_journeys") -> List[str]:
        """List all service_journeys columns, service us akin to aquius.get("service", [])"""

        service_cols: List[str] = []
        for meta in service:
            if (not isinstance(meta, list) or len(meta) < 2 or not isinstance(meta[0], list) or
                not isinstance(meta[1], dict) or len(meta[1]) == 0):
                continue
            slug = service_property_name(meta_one=meta[1])
            if column == "service_journeys":
                service_cols.append(cls.service_journeys(service=slug))
            elif column == "average_minutes_per_journey":
                service_cols.append(cls.average_minutes_per_journey(service=slug))
            else:
                raise NotImplementedError(f"Unsupported column {column}")

        return service_cols


def get_args() -> argparse.Namespace:
    """Get command line arguments or apply defaults"""

    parser = get_common_args(doc=__doc__)

    parser.add_argument(
        "--output",
        nargs="?",
        dest="output",
        help="Output directory root. Defaults to working directory.",
        type=Path,
        default=getcwd(),
    )
    parser.add_argument(
        "--format",
        dest="format",
        nargs="+",
        type=str,
        default=["pq"],
        choices=["csv", "gpkg", "pq"],
        help="Output file format (csv gpkg pq), defaults to GeoParquet.",
    )
    parser.add_argument(
        "--daily_service",
        dest="daily_service",
        type=int,
        default=0,
        help="""Position in services array of average daily total. To create,
in config.json, "serviceFilter" > "period" add a first entry like: {"name": {"en-US": "day"},
"day": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]}""",
    )
    parser.add_argument(
        "--directness",
        dest="directness",
        type=float,
        default=1.17,  # From JIVE D3.36_Potential for hydrogen buses in europe.pdf p41
        help="""Multiplication factor from haversine distance to that driven between nodes
(public transport routes between stops are normally much more direct than driving in general).""",
    )
    parser.add_argument(
        "--node_remoteness_tolerance",
        dest="node_remoteness_tolerance",
        type=float,
        default=12.,
        help="""Multiplication factor for average km between nodes (stops) on route.
This removes nodes which are expectedly far from others, so presumed to be miscoded.
It will occasionally fail, even at high tolerance, typically on interurban routes
with many local pickups followed by a longer-distance section with one or two stops.
False positives can be excluded by setting this value even higher.""",
    )
    parser.add_argument(
        "--max_kmph",
        dest="max_kmph",
        type=float,
        default=100.,
        help="""Average km per hour above which routes will be flagged as a DRT archetype
(Demand Responsive) and in many cases will need to be excluded from subsequent analysis.""",
    )
    parser.add_argument(
        "--place_extensions",
        dest="place_extensions",
        nargs="*",
        type=str,
        default=["rural"],
        help="""Key name(s) of additional properties in place entries (beyond population).
Caution: The entry for rural must be specified first. The property value should be expressed
as a percentage, so in the range 0 to 1, however can be boolean (where True becomes 1).
These extra properties can be added using place_from_gis.py.""",
    )

    parser.add_argument(
        "--route_vars",
        dest="route_vars",
        type=str,
        default="route_vars",
        help="Filename slug for route_vars.",
    )
    parser.add_argument(
        "--route",
        dest="route",
        type=str,
        default="route",
        help="Filename slug for route.",
    )

    return parser.parse_args()


def build_route_vars(aquius: dict, args: argparse.Namespace) -> gpd.GeoDataFrame:
    """Analyses all route variations and returns them as a gdf"""

    features = []
    for position, link in enumerate(aquius["link"]):
        if not isinstance(link, list) or len(link) < 4:
            continue
        features.append(route_var_feature(position=position, link=link, aquius=aquius, args=args))
    route_var_gdf = gpd.GeoDataFrame.from_features(
        {"type": "FeatureCollection", "features": features}, crs=WGS84CRS)

    return unique_route_agency(route_var_gdf=route_var_gdf)


def unique_route_agency(route_var_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Identifies route_agency sets in different places differently:
    Route variation that share at least one place are grouped together
    """

    def _match_to_group(groups: List[dict], places: List[int]) -> Optional[int]:
        """If any entry in places matches a groups.places, return groups index, else None"""

        for position, group in enumerate(groups):
            if any(place_id in group.get("places", []) for place_id in places):
                return position
        return None

    def _distill_groups(groups: List[dict]) -> List[dict]:
        """Merge overlapping groups"""

        for position, group in enumerate(groups):
            group_id = _match_to_group(groups=groups, places=group["places"])
            if group_id is not None and group_id != position:
                groups[group_id]["places"] = list(
                    set(groups[group_id]["places"] + group["places"]))
                groups[group_id]["indices"] = list(
                    set(groups[group_id]["indices"] + group["indices"]))
                del groups[position]
                return _distill_groups(groups=groups)

        return groups

    route_agencies: List[str] = route_var_gdf[Cols.ROUTE_AGENCY.value].unique().tolist()
    index_gdf = route_var_gdf.copy()
    index_gdf["_index"] = index_gdf.index
    index_gdf = index_gdf[["_index", Cols.TMP_PLACE_LIST.value, Cols.ROUTE_AGENCY.value]]

    for route_agency in route_agencies:
        groups: List[dict] = []  # place: list of ids, indices: list of route_var_gdf indices
        place_df = index_gdf.loc[index_gdf[Cols.ROUTE_AGENCY.value] == route_agency]

        for route_var in place_df.itertuples(index=False):
            group_id = _match_to_group(groups=groups, places=route_var[1])
            if group_id is None:  # New group entry
                groups.append({"places": route_var[1],
                               "indices": [route_var[0]]})
            else:  # Augment existing group entry
                groups[group_id]["places"] = list(
                    set(groups[group_id]["places"] + route_var[1]))
                groups[group_id]["indices"].append(route_var[0])

        if len(groups) < 2:  # group_route is already unique
            continue
        group = _distill_groups(groups=groups)  # Merge overlapping groups
        if len(groups) < 2:
            continue

        logging.info("%s: judged to consist %s distinct routes", route_agency, len(groups))
        for position, group in enumerate(groups):  # Update route_agency
            group_route_agency = f"{route_agency} [{position + 1}]"
            for df_ix in group.get("indices", []):
                route_var_gdf.loc[df_ix, Cols.ROUTE_AGENCY.value] = group_route_agency

    return route_var_gdf


def route_var_feature(position: int, link: list, aquius: dict, args: argparse.Namespace,
                      agency_route_join: str = ": ") -> dict:
    """Analyses a single route variation and returns it as a geojson-like feature"""

    agency_name = get_product(link_zero=link[0], aquius=aquius)
    route_name = get_name(link_dict=link[3], first_part=True)
    headsigns = get_name(link_dict=link[3], first_part=False)
    properties = {
        Cols.ROUTE_AGENCY.value: f"{agency_name}{agency_route_join}{route_name}",
        Cols.AGENCY.value: agency_name,
        Cols.ROUTE.value: route_name,
        Cols.HEADSIGNS.value: f"{headsigns}|",  # | handled after groupby sum
        Cols.STOPS.value: len(link[2]),  # May include stops with neither pickup nor setdown
    }

    for (link_key, properties_key) in [
        ("d", Cols.UNIDIRECTIONAL.value),  # Operates only in direction drawn
        ("direction", Cols.UNIDIRECTIONAL.value),
        ("c", Cols.IS_CIRCULAR.value),  # In practice, operates as continuous loop
        ("circular", Cols.IS_CIRCULAR.value),
        ]:
        if link_key in link[3]:
            properties[properties_key] = link[3][link_key]

    properties, coordinates = route_analysis(
        properties=properties, node_list=link[2], aquius=aquius, args=args)
    properties = add_service_to_properties(
        properties=properties, service_meta=aquius.get("service", []),
        service_list=link[1], suffix=Cols.service_journeys,
        day_total_col_from_index=args.daily_service,
        day_total_col_name=Cols.TMP_DAILY_SERVICES.value)
    if isinstance(link[3].get("m"), list):
        properties = add_service_to_properties(
            properties=properties, service_meta=aquius.get("service", []),
            service_list=link[3]["m"], suffix=Cols.average_minutes_per_journey,
            day_total_col_from_index=args.daily_service,
            day_total_col_name=Cols.TMP_SERVICE_MINUTES.value)
        if properties[Cols.TMP_SERVICE_MINUTES.value] > 0:
            properties[Cols.AVERGE_KMPH.value] = properties[
                Cols.KM_DRIVEN_START_TO_END.value] / (
                    properties[Cols.TMP_SERVICE_MINUTES.value] / 60)
    properties[Cols.TMP_STOP_LIST.value] = link[2]

    return {
        "id": position,
        "type": "Feature",
        "properties": properties,
        "geometry": {"type": "LineString", "coordinates": coordinates}
    }


def add_service_to_properties(
        properties: dict, service_meta: List[list], service_list: List[float], suffix: Callable,
        day_total_col_from_index: Optional[int], day_total_col_name: Optional[str]) -> dict:
    """
    Expand properties with service_list, keyed to match service_meta with suffix
    
    day_total_col is a named copy of the property identified as averaging the entire period,
    intended to be used for internal calculation convenience and dropped before writing output.
    """

    for meta_index, meta in enumerate(service_meta):
        if (not isinstance(meta, list) or len(meta) < 2 or not isinstance(meta[0], list) or
            not isinstance(meta[1], dict) or len(meta[1]) == 0):
            logging.error("Bad meta service structure: %s", meta)
            break
        slug = service_property_name(meta_one=meta[1])
        total = 0
        for position in meta[0]:
            if position >= 0 and position < len(service_list):
                total += service_list[position]
        if (day_total_col_from_index is not None and day_total_col_name is not None and
            day_total_col_from_index == meta_index):
            properties[day_total_col_name] = total
        properties[suffix(service=slug)] = total

    return properties


def service_property_name(meta_one: List[dict]) -> str:
    """Returns name for a meta service [1] entry, in English else first available"""

    return meta_one.get("en-US", next(iter(meta_one)))


def route_analysis(properties: dict, node_list: List[int], aquius: dict, args: argparse.Namespace,
                   km_max_stage_allowed: Optional[float] = None) -> tuple[dict, List[tuple]]:
    """
    Measure route, assigning population served and rural split:
    * properties are the first part of the return
    * coordinates are the second - those for a LineString of the route
    """

    def _get_node(node_index: int, node: list) -> Optional[list]:
        """Returns valid single node content or None on failure"""

        if (not isinstance(node_index, int) or node_index < 0 or
            node_index > len(aquius["node"]) - 1):
            return None
        node = aquius["node"][node_index]
        if (len(node) < 3 or not isinstance(node[2], dict)):
            return None

        return node

    def _set_place_id(node: list, place: list) -> Optional[int]:
        """Returns valid place_id for current stage"""

        place_id: Optional[list] = None
        for key in ["p", "place"]:
            place_id = node[2].get(key, place_id)
        if (place_id is not None and (
            place_id < 0 or place_id > len(place) -1 or
            not isinstance(place[place_id], list))):
            return None

        return place_id

    def _update_extensions(extensions: dict, aquius: dict, link_km: Optional[float]) -> dict:
        """Updates and returns extensions for current stage, link_km=None if first node"""

        for extension, values in extensions.items():
            extension_value = aquius["place"][place_id][2].get(extension)
            if extension_value is None:
                continue
            try:
                extension_value = float(extension_value)
            except TypeError:
                logging.warning("Skipping non-numeric data type %s in place_extension %s",
                                type(extension_value), extension)
                continue
            if link_km is not None:
                # Apportions half of current and previous weights to mileage
                # (each expected in range 0 and 1, but this is not enforced)
                values["km"] = values["km"] + (
                    (link_km * values["last_was"]) / 2) + ((link_km * extension_value) / 2)
            values["last_was"] = extension_value

        return extensions

    def _update_properties(properties: dict, km_total: float,
                           place_indices: dict, extensions: dict) -> dict:
        """Updates and returns properties with final summary stats"""

        properties[Cols.KM_DRIVEN_START_TO_END.value] = round(km_total, 1)
        properties[Cols.POPULATION_SERVED.value] = int(sum(place_indices.values()))
        for extension, values in extensions.items():
            if km_total > 0:
                proportion = round(values.get("km", 0) / km_total, 2)
            else:
                proportion = 0.
            properties[Cols.proportion_of_route(extension=extension)] = proportion
        properties[Cols.TMP_PLACE_LIST.value] = list(place_indices.keys())

        return properties

    def _get_max_stage_allowed(km_totals: List[float], tolerance: float) -> Optional[float]:
        """
        Defines a maximum expected km distance between stop pairs,
        based on the route average multiplied by the tolerance

        If any sequence of 2 adjoining stages exceeds this, returns maximum, else returns None

        The aim of this function is to identify nodes which are uniquely far from others

        It will occasionally fail, even at high tolerance, typically on interurban routes
        with many local pickups followed by a longer-distance section containing one or two stops
        """

        if len(km_totals) < 2:  # Not enough stages to evaluate
            return None
        allowed_km_per_stage = (sum(km_totals) / len(km_totals)) * tolerance
        for position in range(len(km_totals) - 2):
            if min(km_totals[position], km_totals[position + 1]) > allowed_km_per_stage:
                return allowed_km_per_stage
        return None

    coordinates: List[tuple] = []
    place_indices: dict = {}  # place index: population int
    km_totals: List[float] = []
    last_coords: Optional[tuple] = None
    link_km: Optional[float] = None
    extensions = {}  # Extensions keyed by optional key in place
    for key in args.place_extensions:
        extensions[key] = {"km": 0., "last_was": 0.}

    for node_index in node_list:
        node = _get_node(node_index=node_index, node=aquius["node"])
        if node is None:
            continue

        if last_coords is None:  # Ergo not the first node
            last_coords = (node[0], node[1])
        else:
            link_km = haversine((last_coords[1], last_coords[0]), (node[1], node[0]),
                                unit=Unit.KILOMETERS) * args.directness
            last_coords = (node[0], node[1])
            if km_max_stage_allowed is not None and link_km > km_max_stage_allowed:
                logging.warning(
                    "Skipped node in %s, unexpectedly %s km from previous: %s from %s",
                    properties.get(Cols.ROUTE_AGENCY.value), int(link_km),
                    (node[1], node[0]), (last_coords[1], last_coords[0]))
                continue
            km_totals.append(link_km)
        coordinates.append((node[0], node[1]))

        place_id = _set_place_id(node=node, place=aquius["place"])
        if place_id is not None:
            if place_id not in place_indices:
                place_indices[place_id] = get_population(place_id=place_id, place=aquius["place"])
            extensions = _update_extensions(extensions=extensions, aquius=aquius, link_km=link_km)

    km_max_stage_allowed = _get_max_stage_allowed(
        km_totals=km_totals, tolerance=args.node_remoteness_tolerance)
    if km_max_stage_allowed is not None:  # Try again with length constraint
        return route_analysis(properties=properties, node_list=node_list, aquius=aquius,
                              args=args, km_max_stage_allowed=km_max_stage_allowed)

    properties = _update_properties(properties=properties, km_total=sum(km_totals),
                                    place_indices=place_indices, extensions=extensions)
    if len(coordinates) < 2:
        coordinates = []
    return properties, coordinates


def get_population(place_id: int, place: list) -> Union[int, float]:
    """Returns population at place_id, where place is aquius["place"]"""

    if (len(place[place_id]) >= 3 and isinstance(place[place_id][2], dict)):
        for key in ["p", "population"]:
            population = place[place_id][2].get(key)
            if isinstance(population, (int, float)):
                return population

    return 0


def get_name(link_dict: dict, first_part: bool = True, delimiter: str = ",") -> str:
    """Returns route name from a link[3] dict"""

    if not isinstance(link_dict, dict):
        return UNKNOWN
    ref_key = None
    for check in ["r", "reference"]:
        if isinstance(link_dict.get(check), list):
            ref_key = check
            break
    if ref_key is None:
        return UNKNOWN

    names = []
    for position, ref in enumerate(link_dict[ref_key]):
        if (first_part and position == 0) or (not first_part and position > 0):
            if isinstance(ref.get("n"), str):
                names.append(ref["n"])

    return f"{delimiter} ".join(names)


def get_product(link_zero: List[int], aquius: dict, delimiter: str = ",") -> str:
    "Return product (operator) name from the first entry of a link (may include multiple names"

    if not isinstance(aquius["reference"].get("product"), list):
        return UNKNOWN

    products = []
    for position, product in enumerate(aquius["reference"]["product"]):
        if position in link_zero:
            if not isinstance(product, dict) or len(product) < 1:
                continue
            for name in product.values():
                products.append(name)

    return f"{delimiter} ".join(products)


def build_route(route_vars_gdf: gpd.GeoDataFrame, aquius: dict,
                args: argparse.Namespace) -> gpd.GeoDataFrame:
    """Creates gdf of routes"""

    route_gdf = merge_route_vars(route_vars_gdf=route_vars_gdf, aquius=aquius, args=args)
    if len(args.place_extensions) > 0:
        # rural must be first, and without it archetypes are not possible
        route_gdf = add_operational_archetype(route_gdf=route_gdf,
            rural_col=Cols.proportion_of_route(extension=args.place_extensions[0]),
            max_kmph=args.max_kmph)

    return route_gdf


def df_has_minutes(gdf: gpd.GeoDataFrame) -> bool:
    """Returns True if gdf has average minutes columns"""

    if Cols.TMP_SERVICE_MINUTES.value in gdf.columns:  # Meaning all minutes columns were added
        return True
    return False


def merge_route_vars(route_vars_gdf: gpd.GeoDataFrame,
                     aquius: dict, args: dict) -> gpd.GeoDataFrame:
    """Gathers variations with the same operator and route into a gdf of routes"""

    has_minutes = df_has_minutes(gdf=route_vars_gdf)

    service_journeys_cols = Cols.get_all_service_cols(
        service=aquius.get("service", []), column="service_journeys")
    extension_cols = [Cols.proportion_of_route(extension=key) for key in args.place_extensions]
    weighted_mean_cols = [Cols.KM_DRIVEN_START_TO_END.value] + extension_cols
    optional_cols = [Cols.IS_CIRCULAR.value, Cols.AVERGE_KMPH.value]
    for optional_col in optional_cols:  # Columns which may not exist, except minutes
        if optional_col in route_vars_gdf.columns:
            weighted_mean_cols.append(optional_col)
    sum_cols = [Cols.TMP_PLACE_LIST.value, Cols.TMP_STOP_LIST.value,
                Cols.TMP_DAILY_SERVICES.value, Cols.HEADSIGNS.value] + service_journeys_cols

    if has_minutes:
        average_minutes_per_journey_cols = Cols.get_all_service_cols(
            service=aquius.get("service", []), column="average_minutes_per_journey")

        # Minutes will be weighted by service, then summed, then unweighted
        if len(average_minutes_per_journey_cols) != len(service_journeys_cols):
            raise ValueError("Service journeys and minutes must be the same length")
        for position, key in enumerate(average_minutes_per_journey_cols):
            route_vars_gdf[key] = route_vars_gdf[key] * route_vars_gdf[
                service_journeys_cols[position]]

        sum_cols = sum_cols + average_minutes_per_journey_cols

    aggfunc = {}
    for key in [Cols.AGENCY.value, Cols.ROUTE.value]:
        aggfunc[key] = "first"
    for key in weighted_mean_cols:
        aggfunc[key] = lambda gdf: np.average(
            gdf, weights=route_vars_gdf.loc[gdf.index, Cols.TMP_DAILY_SERVICES.value])
    for key in sum_cols:
        aggfunc[key] = "sum"

    route_gdf = route_vars_gdf.dissolve(by=Cols.ROUTE_AGENCY.value, aggfunc=aggfunc)
    route_gdf.reset_index(inplace=True)
    route_gdf[Cols.GEOMETRY.value] = route_gdf[Cols.GEOMETRY.value].line_merge()  # Simplify

    if has_minutes:  # Unweight to yield true means
        for position, key in enumerate(average_minutes_per_journey_cols):
            route_gdf[key] = route_gdf[key] / route_gdf[service_journeys_cols[position]]
        route_gdf = route_gdf.round({col: 0 for col in average_minutes_per_journey_cols})

    route_gdf = route_gdf.round({col: 0 for col in optional_cols})
    route_gdf = route_gdf.round({col: 2 for col in extension_cols})
    route_gdf = route_gdf.round({Cols.KM_DRIVEN_START_TO_END.value: 1})

    route_gdf.rename(columns={
        Cols.KM_DRIVEN_START_TO_END.value: Cols.AVERAGE_KM_DRIVEN_START_TO_END.value
        }, inplace=True)
    route_gdf[Cols.STOPS_SERVED.value] = route_gdf.apply(
        lambda gdf: len(set(gdf[Cols.TMP_STOP_LIST.value])), axis=1)
    route_gdf[Cols.POPULATION_SERVED.value] = route_gdf.apply(
        lambda gdf: sum(get_population(
            place_id=place_id, place=aquius["place"]) for place_id in list(
                set(gdf[Cols.TMP_PLACE_LIST.value]))), axis=1)

    return route_gdf


def add_operational_archetype(route_gdf: gpd.GeoDataFrame,
                              rural_col: str, max_kmph: float) -> gpd.GeoDataFrame:
    """
    Adds operational archetype column to routes (if rural available)
    
    Archetypes match JIVE D3.36_Potential for hydrogen buses in europe.pdf Table 2
    (weekly journeys divided by 7 and expressed against average daily), albeit
    with over-speeding routes identified as Demand Response Transport
    (generally DRT lists all possible stops, hence infeasible mileage and speed)
    """

    route_gdf.fillna({rural_col: 0.}, inplace=True)

    route_gdf[Cols.OPERATIONAL_ARCHETYPE.value] = None
    route_gdf[Cols.OPERATIONAL_ARCHETYPE.value] = np.where(
        (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] > 100),
        "Long", route_gdf[Cols.OPERATIONAL_ARCHETYPE.value])
    route_gdf[Cols.OPERATIONAL_ARCHETYPE.value] = np.where(
        (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] < 40)
         & (route_gdf[rural_col] < 0.5),
        np.where((route_gdf[Cols.TMP_DAILY_SERVICES.value] >= 600/7),
                 "City", "Suburban"), route_gdf[Cols.OPERATIONAL_ARCHETYPE.value])
    route_gdf[Cols.OPERATIONAL_ARCHETYPE.value] = np.where(
        route_gdf[rural_col] >= 0.5, np.where(
            (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] < 20) | (
                (route_gdf[Cols.TMP_DAILY_SERVICES.value] < 100/7) &
                (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] >= 20) &
                (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] <= 100)
            ), "Rural", route_gdf[Cols.OPERATIONAL_ARCHETYPE.value]
        ), route_gdf[Cols.OPERATIONAL_ARCHETYPE.value])
    route_gdf[Cols.OPERATIONAL_ARCHETYPE.value] = np.where(
        ((route_gdf[Cols.TMP_DAILY_SERVICES.value] >= 100/7) &
         (route_gdf[rural_col] >= 0.5) &
         (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] >= 20) &
         (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] <= 100)
         ) | (
             (route_gdf[rural_col] < 0.5) &
             (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] >= 40) &
             (route_gdf[Cols.AVERAGE_KM_DRIVEN_START_TO_END.value] <= 100)
         ), "Interurban", route_gdf[Cols.OPERATIONAL_ARCHETYPE.value]
    )

    if Cols.AVERGE_KMPH.value in route_gdf.columns:
        route_gdf[Cols.OPERATIONAL_ARCHETYPE.value] = np.where(
            route_gdf[Cols.AVERGE_KMPH.value] > max_kmph,
            "DRT", route_gdf[Cols.OPERATIONAL_ARCHETYPE.value])

    return route_gdf


def main():
    """Core script entrypoint"""

    args = get_args()
    aquius = load_json(filepath=args.aquius)
    if not is_aquius(aquius=aquius):
        logging.error("Not an aquius file: %s", args.aquius)
        return

    route_vars_gdf = build_route_vars(aquius=aquius, args=args)
    route_gdf = build_route(route_vars_gdf=route_vars_gdf, aquius=aquius, args=args)

    for (gdf, slug) in [(route_vars_gdf, args.route_vars), (route_gdf, args.route)]:
        gdf.drop(columns=Cols.get_temp_cols(), inplace=True, errors="ignore")
        gdf[Cols.GEOMETRY.value] = gdf[Cols.GEOMETRY.value].set_precision(0.00001)
        gdf[Cols.HEADSIGNS.value] = gdf.apply(lambda agdf: "; ".join(
            list(set(list(filter(None, agdf[Cols.HEADSIGNS.value].split("|")))))).strip(), axis=1)
        gdf.sort_values(by=Cols.ROUTE_AGENCY.value, inplace=True)
        gdf.replace(0, np.nan, inplace=True)

        try:
            Path(args.output).mkdir(parents=True, exist_ok=True)
            if "csv" in args.format:
                gdf.to_csv(Path(args.output, f"{slug}.csv"), index=False)
            if "gpkg" in args.format:
                gdf.to_file(Path(args.output, f"{slug}.gpkg"), layer=slug,
                            driver="GPKG", index=False, use_arrow=use_arrow())
            if "pq" in args.format:
                gdf.to_parquet(Path(args.output, f"{slug}.pq"), index=False)
        except IOError as err:
            logging.error("Cannot write %s to %s: %s", slug, args.output, err)


if __name__ == '__main__':
    main()

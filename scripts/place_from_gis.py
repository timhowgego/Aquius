"""
Adds place date to an Aquius file direct from a GIS (polygon) boundary file.
The GIS file must be WGS84 (EPSG:4326) with (if geopackage) one layer.
In must contain at least fields "name" (as unique string) and "population" (integer).
Any other fields found will be copied into the Aquius place dictionary (albeit unused by default).
Nodes (bus stops) within the area will be assigned that named place and associated data.
The centroid of the area will be assigned as the notional geographic location of that place.
Any prior place data is retained (so rerunning this script on the same aquius file will bloat it).

Usage: place_from_gis.py aquius.json --geofile geofile.gpkg
See place_from_gis.py -h for further arguments
"""

import argparse
import importlib.util
import logging
from pathlib import Path
from typing import List, Optional

import geopandas as gpd

from _common import get_common_args, get_place_scale, load_json, save_json

WGS84CRS = "EPSG:4326"
NAME_COL = "name"
POPULATION_COL = "population"


def get_args() -> argparse.Namespace:
    """Get command line arguments or apply defaults"""

    parser = get_common_args(doc=__doc__)

    parser.add_argument(
        "--geofile",
        dest="geofile",
        nargs="?",
        type=Path,
        help="GIS boundary file - WGS84, column name (uniques) and population (integer)",
    )
    parser.add_argument(
        "--metric_crs",
        dest="metric_crs",
        type=str,
        default="EPSG:3035",
        help="Metre grid CRS covering geographic area of interest, default valid for Europe only",
    )
    parser.add_argument(
        "--nearest",
        dest="nearest",
        type=int,
        default=1000,
        help="Maximum metres from boundary to assign node to (bridge/pier-range only)",
    )
    parser.add_argument(
        '--precision',
        dest='precision',
        type=int,
        default=5,
        help='coordinatePrecision (as GTFS To Aquius), -1 to disable forced conversion',
    )

    return parser.parse_args()


def load_geofile(filepath: Path, expected_crs: str, required_cols: List[str],
                 unique_cols: List[str]) -> Optional[gpd.GeoDataFrame]:
    """Load and test geofile, returns None on failure"""

    try:
        if importlib.util.find_spec("pyarrow") is not None:
            geo_gdf = gpd.read_file(filepath, use_arrow=True)  # Faster
        else:
            geo_gdf = gpd.read_file(filepath)
    except IOError as err:
        logging.error("Cannot load %s: %s", filepath, err)
        return None

    for required_column in required_cols:
        if required_column not in geo_gdf.columns:
            logging.error("Expected a '%s' column in %s", required_column, filepath)
            return None
    for unique_column in unique_cols:
        if not (geo_gdf[unique_column]).is_unique:
            logging.error("Column '%s' values must be unique in %s", unique_column, filepath)
            logging.warning(geo_gdf[geo_gdf.duplicated(
                unique_column, keep="first")].sort_values(unique_column))
            return None

    if geo_gdf.crs != expected_crs:
        geo_gdf.to_crs(crs=expected_crs)

    return geo_gdf


def get_nodes(nodes: List[list], crs: str) -> gpd.GeoDataFrame:
    """Create point gdf from node list, id as position"""

    features = []
    for feature_id, node in enumerate(nodes):
        features.append({
            "id": feature_id,
            "type": "Feature",
            "properties": {"id": feature_id},
            "geometry": {"type": "Point", "coordinates": (node[0], node[1])}
        })
    return gpd.GeoDataFrame.from_features(
        {"type": "FeatureCollection", "features": features}, crs=crs)


def add_place(aquius: dict, required_boundary_gdf: gpd.GeoDataFrame, precision: int) -> dict:
    """Add required_boundary_gdf entries to aquius["place"] and return aquius"""

    def _apply(*args, **kwargs) -> list:
        place = [
            round(args[0].x, precision),
            round(args[0].y, precision),
            {
                "p": args[2],
                "r": [{
                    "n": args[1]
                }]
            }
        ]
        # Add any extra column data within references:
        for position, key in enumerate(kwargs.get("target_cols")[kwargs.get("fixed_len"):]):
            place[2][key] = args[position + kwargs.get("fixed_len")]
        return place

    fixed_cols = ["_centroid", NAME_COL, POPULATION_COL]  # Order of first three is fixed!
    fixed_len = len(fixed_cols)
    skip_cols = fixed_cols + ["geometry", "_place", "_boundary_index", "r", "reference"]
    extra_cols = list(set(required_boundary_gdf.columns).difference(set(skip_cols)))
    target_cols = fixed_cols + extra_cols

    aquius["place"] = aquius["place"] + [
        _apply(*row, target_cols=target_cols, fixed_len=fixed_len, precision=precision)
        for row in required_boundary_gdf[target_cols].to_numpy()]  # Numpy retains data types

    return aquius


def augment_node(aquius: dict, node_place_lookup: dict) -> dict:
    """Add place refence to node array"""

    for position, _ in enumerate(aquius["node"]):
        if position in node_place_lookup:
            if len(aquius["node"][position]) < 3 or not isinstance(
                aquius["node"][position][2], dict):
                aquius["node"][position][2] = {}
            elif "place" in aquius["node"][position][2]:  #Theoretical
                del aquius["node"][position][2]["place"]
            aquius["node"][position][2]["p"] = node_place_lookup[position]

    return aquius


def main():
    """Core script entrypoint"""

    args = get_args()
    aquius = load_json(filepath=args.aquius)
    if (not isinstance(aquius, dict) or "node" not in aquius or
        not isinstance(aquius["node"], list)):
        logging.error("Not an aquius file: %s", args.aquius)
        return
    if "place" not in aquius or not isinstance(aquius["place"], list):
        aquius["place"] = []
    # boundary_gdf also holds place data columns, only name and population required:
    boundary_gdf = load_geofile(filepath=args.geofile, expected_crs=WGS84CRS,
                                required_cols=[NAME_COL, POPULATION_COL], unique_cols=[NAME_COL])
    if boundary_gdf is None:
        return

    boundary_metric_gdf = boundary_gdf.to_crs(crs=args.metric_crs)
    node_gdf = get_nodes(nodes=aquius["node"], crs=WGS84CRS).to_crs(crs=args.metric_crs)
    node_boundary_gdf = node_gdf.sjoin_nearest(
        boundary_metric_gdf, how="left", distance_col="_metres")
    node_boundary_gdf.rename(columns={"index_right": "_boundary_index"}, inplace=True)
    # Remove any distant nodes,
    # then node_boundary_gdf = lookup between node index and boundary index:
    node_boundary_gdf = node_boundary_gdf[node_boundary_gdf["_metres"] <= args.nearest]
    required_boundary_ids: List[int] = node_boundary_gdf["_boundary_index"].unique().tolist()
    required_boundary_gdf = boundary_gdf[boundary_gdf.index.isin(required_boundary_ids)].copy()
    # _centroid is POINT (n n) in WGS84:
    required_boundary_gdf["_centroid"] = required_boundary_gdf["geometry"].representative_point()
    # representative_point ensures centroids are always within oddly-shaped boundary
    # _place becomes the aquius place index, adjusted for any pre-existing places
    new_place_count = len(required_boundary_gdf)
    required_boundary_gdf.insert(
        0, "_place", range(len(aquius["place"]), len(aquius["place"]) + new_place_count))
    required_boundary_gdf["_boundary_index"] = required_boundary_gdf.index

    aquius = add_place(
        aquius=aquius, required_boundary_gdf=required_boundary_gdf, precision=args.precision)
    node_place_df = node_boundary_gdf.merge(
        required_boundary_gdf, how="left", on="_boundary_index")
    node_place_lookup = node_place_df.set_index("id").to_dict()["_place"]
    aquius = augment_node(aquius=aquius, node_place_lookup=node_place_lookup)
    aquius["option"]["placeScale"] = get_place_scale(
        population=required_boundary_gdf[POPULATION_COL].max())

    save_json(data=aquius, filepath=args.aquius)


if __name__ == '__main__':
    main()

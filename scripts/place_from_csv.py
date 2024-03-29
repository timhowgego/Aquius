"""
Python script that adds place data to an existing aquius file.
This allows geojson functions in GTFS To Aquius to be skipped:,
Instead use GIS software to relate nodes to places,
create a CSV lookup as described below,
and run this script after GTFS To Aquius.

Usage: place_from_csv.py aquius.json place.csv

Where place.csv consists columns:
- node_x (coordinatePrecision float)
- node_y (coordinatePrecision float)
- place_x (coordinatePrecision float)
- place_y (coordinatePrecision float)
- place_name (string)
- place_population (integer)

Coordinates precision must at least match GTFS To Aquius coordinatePrecision (5 by default).
Argument --precision can be set, which reduces higher precisions,
but obviously cannot reliably increase lower precision, not cluster nodes.
Best to run all processing with the same coordinatePrecision.

Any prior places are retained, to avoid breaking prior references,
however this could bloat the aquius file with excess place reference.
Best to run this script on an aquius file with no existing place references.
"""
import argparse
import csv
import json
from typing import Union


def get_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        'aquius',
        help='Aquius .json filename with path',
    )
    parser.add_argument(
        'place',
        help='''Place CSV filename with path. Consists columns:
node_x,node_y,place_x,place_y,place_name,place_population
Coordinates must match GTFS To Aquius coordinatePrecision (5 by default).''',
    )
    parser.add_argument(
        '--precision',
        dest='precision',
        default=5,
        type=int,
        help='coordinatePrecision (as GTFS To Aquius), -1 to disable forced conversion',
    )
    return parser.parse_args()

def load_json(filepath: str) -> dict:
    with open(filepath, mode='r') as file:
        return json.load(file)

def save_json(data: dict, filepath: str):
    with open(filepath, mode='w') as file:
        json.dump(data, file)

def load_csv(filepath: str) -> dict:
    data = []
    with open(filepath, mode='r', newline='') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data.append(dict(row))
    return data

def to_precision(numeric, precision) -> Union[int, float]:
    if precision == -1:
        return numeric
    return round(float(numeric), precision)

def main():
    arguments = get_args()
    precision = getattr(arguments, 'precision')
    aquius = load_json(filepath=getattr(arguments, 'aquius'))

    if 'node' not in aquius and not isinstance(aquius['node'], list):
        return
    if 'place' not in aquius or not isinstance(aquius['place'], list):
        aquius['place'] = []
    
    node_lookup: dict = {}
    for index, node in enumerate(aquius['node']):
        try:
            node_lookup[
                f"{to_precision(node[0], precision)}:{to_precision(node[1], precision)}"
            ] = index
        except ValueError:
            print(f"Bad node {index}: {node}")
            continue
    
    places = load_csv(filepath=getattr(arguments, 'place'))
    place_lookup: dict = {}  # "place_x:place_y": index in aquius['place']
    
    for _, place in enumerate(places):
        try:
            node_x = to_precision(place.get("node_x", 0), precision)
            node_y = to_precision(place.get("node_y", 0), precision)
            place_x = to_precision(place.get("place_x", 0), precision)
            place_y = to_precision(place.get("place_y", 0), precision)
            place_name = place.get("place_name", "")
            place_population = int(place.get("place_population", 0))
        except ValueError:
            continue

        place_target = f"{place_x}:{place_y}"
        node_target = f"{node_x}:{node_y}"
        node_index = node_lookup.get(node_target)

        if node_index is not None:
            use_place_index = place_lookup.get(place_target, None)
            if use_place_index is None:  # Create new place
                use_place_index = len(aquius['place'])
                place_lookup[place_target] = use_place_index
                aquius['place'].append([
                    place_x,
                    place_y,
                    {
                        "p": place_population,
                        "r": [
                            {
                                "n": place_name
                            }
                        ]
                    }
                ])
            if not isinstance(aquius['node'][node_index][2], dict):
                aquius['node'][node_index][2] = {}
            if "place" in aquius['node'][node_index][2]:
                aquius['node'][node_index][2]["place"] = use_place_index
            else:
                aquius['node'][node_index][2]["p"] = use_place_index
    
    for index, node in enumerate(aquius['node']):
        if len(node) < 3 or not isinstance(node[2], dict) or (
                "p" not in node[2] and "place" not in node[2]):
            print(f"Missing place in node: {node}")

    save_json(data=aquius, filepath=getattr(arguments, 'aquius'))

if __name__ == '__main__':
   main()

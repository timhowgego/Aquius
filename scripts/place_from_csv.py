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


def get_args():
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
        help='coordinatePrecision (as GTFS To Aquius)',
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

def main():
    arguments = get_args()
    aquius = load_json(filepath=getattr(arguments, 'aquius'))
    if 'node' not in aquius and not isinstance(aquius['node'], list):
        return
    if 'place' not in aquius or not isinstance(aquius['place'], list):
        aquius['place'] = []
    
    places = load_csv(filepath=getattr(arguments, 'place'))
    precision = getattr(arguments, 'precision')
    place_lookup: dict = {}  # "place_x:place_y": index in aquius['place']
    
    for place in places:
        try:
            node_x = round(float(place.get("node_x", 0)), precision)
            node_y = round(float(place.get("node_y", 0)), precision)
            place_x = round(float(place.get("place_x", 0)), precision)
            place_y = round(float(place.get("place_y", 0)), precision)
            place_name = place.get("place_name", "")
            place_population = int(place.get("place_population", 0))
        except ValueError:
            continue
        place_index = f"{place_x}:{place_y}"

        for index, node in enumerate(aquius['node']):
            if len(node) < 3:
                continue
            base_node_x = round(node[0], precision)
            base_node_y = round(node[1], precision)
            if base_node_x == node_x and base_node_y == node_y:
                use_place_index = place_lookup.get(place_index, None)
                if use_place_index is None:  # Create new place
                    use_place_index = len(aquius['place'])
                    place_lookup[place_index] = use_place_index
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
                if not isinstance(node[2], dict):
                    aquius['node'][index][2] = {}
                if "place" in node[2]:
                    aquius['node'][index][2]["place"] = use_place_index
                else:
                    aquius['node'][index][2]["p"] = use_place_index

    save_json(data=aquius, filepath=getattr(arguments, 'aquius'))

if __name__ == '__main__':
   main()

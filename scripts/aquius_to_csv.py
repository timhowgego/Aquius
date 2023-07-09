"""
Python script that extracts data from aquius files to CSV, including:
- operator-service
- operator-place-service
- places
- nodes, including termini (start or end) services and total dwell minutes
One service index (position in array) per extraction,
defaults to first, but can be set using: --index 0

Usage: python aquius_to_csv.py aquius.json
See aquius_to_csv.py -h for further arguments
"""
import argparse
import csv
import json


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        'input',
        help='Aquius .json filename with path',
    )
    parser.add_argument(
        '--index',
        dest='index',
        default=0,
        type=int,
        help='Service index (position in array)',
    )
    parser.add_argument(
        '--operator',
        dest='operator',
        default='operator.csv',
        help='Output operator-service CSV',
    )
    parser.add_argument(
        '--place',
        dest='place',
        default='place.csv',
        help='Output place CSV',
    )
    parser.add_argument(
        '--service',
        dest='service',
        default='service.csv',
        help='Output operator-place-service CSV',
    )
    parser.add_argument(
        '--node',
        dest='node',
        default='node.csv',
        help='Output node CSV',
    )
    return parser.parse_args()


def load_json(filepath: str):
    with open(filepath, mode='r') as file:
        return json.load(file)


def save_to_csv(filepath: str, content: list[dict], columns: list):
    with open(filepath, mode='w', encoding='utf-8', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=columns, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for row in content:
            writer.writerow(row)


def main():
    arguments = get_args()
    use_service_index = getattr(arguments, 'index')
    input = load_json(filepath=getattr(arguments, 'input'))
    if 'node' not in input or 'link' not in input or 'reference' not in input or 'product' not in input['reference']:
        return
    
    operator_place_service: dict[str: dict[str: float]] = {}  # Operator: {place: services}
    operator_service: dict[str, float] = {}  # Operator: service
    place_data: dict[str, list] = {}  # Place: [x, y]
    node_data: dict[str, list] = {}  # Node: [x, y, name, code, services, services_termini, dwells]

    for node_id, node in enumerate(input['node']):
        if isinstance(node, list) and len(node) >= 3 and isinstance(node[2], dict):
            name_readable = ""
            name_code = ""
            ref = node[2].get("r")
            if isinstance(ref, list):
                if len(ref) > 0 and isinstance(ref[0], dict):
                    name_readable = ref[0].get("n", "")
                if len(ref) > 1 and isinstance(ref[1], dict):
                    name_code = ref[1].get("n", "")
            node_data[node_id] = [node[0], node[1], name_readable, name_code, 0, 0, 0]

    for link in input['link']:
        if isinstance(link, list) and len(link) >= 4:
            # product, service, nodes, e.g. [[147],[498],[1030,2069,280,5989,12,165,291,23,1008,807,210,2133,1116], {...}} ]
            service_total = link[1][use_service_index] / len(link[0])  # Shared equally if multi-operator
            for operator_id in link[0]:
                operator_name = input['reference']['product'][operator_id].get('en-US', 'UKNOWN')  # Assumes language
                operator_service[operator_name] = service_total + operator_service.get(operator_name, 0)
                if operator_name not in operator_place_service:
                    operator_place_service[operator_name] = {}
                for place_id in link[2]:
                    # e.g. [-2.177,53.85,{"p":2310,"r":[{"n":"E05005268"}]}]
                    place_name = input['node'][place_id][2]['r'][0]['n']
                    if place_name not in place_data:
                        place_data[place_name] = [input['node'][place_id][0], input['node'][place_id][1]]
                    operator_place_service[operator_name][place_name] = service_total + operator_place_service[operator_name].get(place_name, 0)
            dwell = None
            if isinstance(link[3], dict):
                dwell = link[3].get("w")
                if not isinstance(dwell, list) or len(dwell) != len(link[2]):
                    dwell = None
            for index, node in enumerate(link[2]):
                if node in node_data:
                    node_data[node][4] = node_data[node][4] + service_total
                    if index == 0 or index == (len(link[2]) - 1):  # Start or end of route
                        node_data[node][5] = node_data[node][5] + service_total
                    if dwell is not None:
                        node_data[node][6] = node_data[node][6] + dwell[index]

    output: list[dict] = []
    output_columns = ['operator', 'services']
    for operator, services in operator_service.items():
        output.append({
            'operator': operator,
            'services': services
        })
    save_to_csv(filepath=getattr(arguments, 'operator'), content=output, columns=output_columns)

    output: list[dict] = []
    output_columns = ['place', 'x', 'y']
    for place, values in place_data.items():
        output.append({
            'place': place,
            'x': values[0],
            'y': values[1]
        })
    save_to_csv(filepath=getattr(arguments, 'place'), content=output, columns=output_columns)

    output: list[dict] = []
    output_columns = ['operator', 'place', 'services']
    for operator, values in operator_place_service.items():
        for place, services in values.items():
            output.append({
                'operator': operator,
                'place': place,
                'services': services
            })
    save_to_csv(filepath=getattr(arguments, 'service'), content=output, columns=output_columns)

    output: list[dict] = []
    output_columns = ['x', 'y', 'name', 'code', 'services', 'services_termini', 'dwell_minutes']
    for _, values in node_data.items():
        output.append({
            'x': values[0],
            'y': values[1],
            'name': str(values[2]),
            'code': str(values[3]),
            'services': round(values[4], 2),
            'services_termini': round(values[5], 2),
            'dwell_minutes': round(values[6], 2),
        })
    save_to_csv(filepath=getattr(arguments, 'node'), content=output, columns=output_columns)


if __name__ == '__main__':
   main()

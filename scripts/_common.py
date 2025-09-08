"""
Common functions in support of scripts - do not execute this file direct
"""

import argparse
import csv
import json
import logging
from math import floor, log10
from pathlib import Path
from typing import Union


def get_common_args(doc: str) -> argparse.ArgumentParser:
    """Builds common arguments into a parser"""

    class ArgparseFormatter(
        argparse.ArgumentDefaultsHelpFormatter,
        argparse.RawTextHelpFormatter
    ):
        """Formatter supports both defaults and help"""

    parser = argparse.ArgumentParser(
        description=doc,
        formatter_class=ArgparseFormatter
        )

    parser.add_argument(
        "aquius",
        nargs="?",
        type=Path,
        help="Aquius .json filename with path",
    )

    return parser


def load_json(filepath: Path) -> Union[list, dict]:
    """Load JSON file filepath"""

    try:
        with open(filepath, mode="r", encoding="utf-8") as file:
            return json.load(file)
    except (IOError, json.JSONDecodeError) as err:
        logging.error("Cannot load %s: %s", filepath, err)
        return {}


def save_json(data: Union[list, dict], filepath: Path):
    """Save JSON-like object to JSON file"""

    try:
        with open(filepath, mode="w", encoding="utf-8") as file:
            json.dump(data, file)
    except IOError as err:
        logging.error("Cannot write %s: %s", filepath, err)


def save_to_csv(filepath: Path, content: list[dict], columns: list):
    """Save CSV with columns ad content as listed"""

    try:
        with open(filepath, mode="w", encoding="utf-8-sig", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=columns, quoting=csv.QUOTE_MINIMAL)
            writer.writeheader()
            for row in content:
                writer.writerow(row)
    except (IOError, csv.Error) as err:
        logging.error("Cannot write %s: %s", filepath, err)


def load_csv(filepath: Path) -> dict:
    """Load CSV to dict"""

    data = []
    try:
        with open(filepath, mode="r", newline="", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            for row in reader:
                data.append(dict(row))
    except (IOError, csv.Error) as err:
        logging.error("Cannot load %s: %s", filepath, err)
    return data


def to_precision(numeric: Union[int, float], precision: int) -> Union[int, float]:
    """Round numeric to precision unless precision < 0"""

    if precision < 0:
        return numeric
    return round(float(numeric), precision)


def get_place_scale(population: int) -> float:
    """Returns appropriate placeScale aquius option based on population of one place"""

    raw_scale = 200000/population
    return round(raw_scale, 2-int(floor(log10(abs(raw_scale))))-1)


if __name__ == "__main__":
    logging.error("Run other scripts, not this directly")

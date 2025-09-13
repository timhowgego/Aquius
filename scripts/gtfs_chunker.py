"""
This script crudely cuts up a single large GTFS archive into smaller archives.
It was written to allow the 5GB British BODS dataset to be more easily handled.
Only stop_times.txt are cut, and cut between different trips.
Other files are simply copied because these tend to be much smaller.
This is potentially useful when creating aquius files whose fragments will be merged together.
It is NOT a reliable means of fragmenting GTFS file more broadly:
A better approach would be to split data by operator.
Note chunking does not respect GTFS blocks (one block may span multiple chunks),
so this script will not reliably handle all blocks.

Usage: gtfs_chunker.py gtfs.zip --noshapes
See gtfs_chunker.py -h for further arguments
"""

import argparse
import csv
from io import TextIOWrapper
from os import getcwd
from pathlib import Path
from tempfile import SpooledTemporaryFile
import zipfile


def main(args=None):
    """
    Entry point: Start here
    If provided, args namespace must contain processed all arguments
    If None, argparse will instead read command line arguments
    """

    if args is None:
        parser = argparse.ArgumentParser()
        parser.add_argument(
          "input",
          nargs="?",
          type=Path,
          help="GTFS zip filename (directory optional) to split."
        )
        parser.add_argument(
          "--output",
          nargs="?",
          dest="output",
          type=Path,
          default=getcwd(),
          help="Output directory root. Defaults to working directory."
        )
        parser.add_argument(
          "--chunk",
          dest="chunk",
          default=15000000,
          type=int,
          help="""Minimum mumber of lines of stop_times.txt before creating a split.
Defaults to 15 million, typically just over 1GB of stop_times.txt."""
        )
        parser.add_argument(
            "--noshapes",
            dest="noshapes",
            action="store_true",
            help="Remove shapes.txt (not required for schedule analysis)."
        )
        args = parser.parse_args()

    line_num = 0  # Current line of stop_times.txt
    trip_col = 0  # Column index of stop_times.txt trip_id
    trip_id = None  # Current trip_id
    file_num = 1  # Current output file index
    header = None  # stop_times.txt header line

    if not zipfile.is_zipfile(args.input):
        raise IOError("Input is not a zip file.")

    with zipfile.ZipFile(args.input, mode="r") as inputted:

        if "stop_times.txt" not in inputted.namelist():
            raise IOError("No stop_times.txt in input.")

        with inputted.open("stop_times.txt") as stop_times:
            reader = csv.reader(TextIOWrapper(stop_times, "utf-8"))

            with SpooledTemporaryFile(mode="r+", encoding="utf-8", newline="") as temp:
                writer = csv.writer(temp, delimiter=",", quoting=csv.QUOTE_MINIMAL)

                for line in reader:
                    line_num += 1

                    if line_num == 1:
                        if "trip_id" not in line:
                            raise IOError("No trip_id in input stop_times.txt.")

                        trip_col = line.index("trip_id")
                        header = line
                        writer.writerow(header)

                    elif (
                        line_num >= (file_num * args.chunk)
                        and line[trip_col] != trip_id
                    ):
                        sub_write(temp, file_num, args.output, inputted,
                                  args.noshapes, Path(args.input).stem)
                        # Reset temp:
                        temp.seek(0)
                        temp.truncate()
                        writer.writerow(header)
                        file_num += 1
                        trip_id = line[trip_col]
                        writer.writerow(line)

                    else:
                        trip_id = line[trip_col]
                        writer.writerow(line)

                # Finally
                sub_write(temp, file_num, args.output, inputted,
                          args.noshapes, Path(args.input).stem)

def sub_write(temp, file_num, output, inputted, noshapes, stem):
    """Write GTFS"""

    Path(output).mkdir(parents=True, exist_ok=True)
    filename = Path(output, f"{stem}_{file_num}.zip")

    with zipfile.ZipFile(
        file=filename,
        mode="w",
        compression=zipfile.ZIP_DEFLATED
    ) as gtfs:

        for name in inputted.namelist():

            if name == "stop_times.txt":
                temp.seek(0)
                gtfs.writestr(
                    name,
                    temp.read()
                )
            elif not noshapes or name != "shapes.txt":
                gtfs.writestr(
                    name,
                    inputted.read(name)
                )

if __name__ == "__main__":
    main()

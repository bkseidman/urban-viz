import csv
from collections import defaultdict


TOTALS_FILE = "data/processed/cnn_totals.csv"
OUTPUT_FILE = "data/processed/frequency_distribution.csv"


def main():
    order = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7-8",
        "9-12",
        "13-16",
        "17-20",
        "21-28",
        "29-36",
        "37+"
    ]

    counts = defaultdict(int)

    with open(TOTALS_FILE, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            group = row.get("frequency_group", "").strip()

            if group:
                counts[group] += 1

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["frequency", "count"])
        writer.writeheader()

        for group in order:
            writer.writerow({
                "frequency": group,
                "count": counts[group]
            })

    print(f"Created {OUTPUT_FILE}")
    print(f"Rows: {len(order)}")


if __name__ == "__main__":
    main()

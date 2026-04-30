import csv
from collections import defaultdict


RAW_FILE = "data/raw/Street_Sweeping_Schedule_20260430.csv"
TOTALS_FILE = "data/processed/cnn_totals.csv"
OUTPUT_FILE = "data/processed/cnn_schedule_details.csv"


def format_hour(value):
    hour = int(float(value))

    if hour == 0:
        return "12 AM"
    if hour < 12:
        return f"{hour} AM"
    if hour == 12:
        return "12 PM"

    return f"{hour - 12} PM"


def format_time_range(from_hour, to_hour):
    return f"{format_hour(from_hour)} - {format_hour(to_hour)}"


def get_time_bucket(from_hour):
    hour = int(float(from_hour))

    if 0 <= hour < 2:
        return "12-2"
    if 2 <= hour < 4:
        return "2-4"
    if 4 <= hour < 6:
        return "4-6"
    if 6 <= hour < 8:
        return "6-8"
    if 8 <= hour < 10:
        return "8-10"
    if 10 <= hour < 12:
        return "10-12"
    if 12 <= hour < 14:
        return "12-14"

    return "Other"

def clean_join(values):
    cleaned = sorted(v for v in values if v and str(v).strip())
    return ", ".join(cleaned)


def get(row, *names):
    for name in names:
        if name in row:
            return row[name]
    return ""


def main():
    totals_by_cnn = {}

    with open(TOTALS_FILE, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            cnn = str(row.get("cnn", "")).strip()
            totals_by_cnn[cnn] = {
                "monthly_frequency": row.get("monthly_frequency", ""),
                "frequency_group": row.get("frequency_group", "")
            }

    details = defaultdict(lambda: {
        "corridor": set(),
        "limits": set(),
        "days_cleaned": set(),
        "time_ranges": set(),
        "schedule_summary": set(),
        "block_sides": set(),
        "street_sides": set(),
        "heatmap_cells": set(),
        "holidays": "0"
    })

    with open(RAW_FILE, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            cnn = str(get(row, "CNN", "cnn")).strip()

            if not cnn:
                continue

            corridor = str(get(row, "Corridor", "corridor")).strip()
            limits = str(get(row, "Limits", "limits")).strip()
            weekday = str(get(row, "WeekDay", "weekday")).strip()
            fromhour = get(row, "FromHour", "fromhour")
            tohour = get(row, "ToHour", "tohour")
            blockside = str(get(row, "BlockSide", "blockside")).strip()
            street_side = str(get(row, "CNNRightLeft", "cnnrightleft")).strip()
            holidays = str(get(row, "Holidays", "holidays")).strip()

            if not fromhour or not tohour:
                continue

            time_range = format_time_range(fromhour, tohour)
            time_bucket = get_time_bucket(fromhour)

            if corridor:
                details[cnn]["corridor"].add(corridor)

            if limits:
                details[cnn]["limits"].add(limits)

            if weekday:
                details[cnn]["days_cleaned"].add(weekday)
                details[cnn]["schedule_summary"].add(f"{weekday} {time_range}")
                details[cnn]["heatmap_cells"].add(f"{weekday}|{time_bucket}")

            details[cnn]["time_ranges"].add(time_range)

            if blockside:
                details[cnn]["block_sides"].add(blockside)

            if street_side:
                details[cnn]["street_sides"].add(street_side)

            if holidays == "1":
                details[cnn]["holidays"] = "1"

    output_fields = [
        "cnn",
        "corridor",
        "limits",
        "monthly_frequency",
        "frequency_group",
        "days_cleaned",
        "time_ranges",
        "schedule_summary",
        "block_sides",
        "street_sides",
        "heatmap_cells",
        "holidays"
    ]

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=output_fields)
        writer.writeheader()

        for cnn in sorted(details.keys()):
            total_info = totals_by_cnn.get(cnn, {})

            writer.writerow({
                "cnn": cnn,
                "corridor": clean_join(details[cnn]["corridor"]),
                "limits": clean_join(details[cnn]["limits"]),
                "monthly_frequency": total_info.get("monthly_frequency", ""),
                "frequency_group": total_info.get("frequency_group", ""),
                "days_cleaned": clean_join(details[cnn]["days_cleaned"]),
                "time_ranges": clean_join(details[cnn]["time_ranges"]),
                "schedule_summary": clean_join(details[cnn]["schedule_summary"]),
                "block_sides": clean_join(details[cnn]["block_sides"]),
                "street_sides": clean_join(details[cnn]["street_sides"]),
                "heatmap_cells": clean_join(details[cnn]["heatmap_cells"]),
                "holidays": details[cnn]["holidays"]
            })

    print(f"Created {OUTPUT_FILE}")
    print(f"Rows: {len(details)}")


if __name__ == "__main__":
    main()

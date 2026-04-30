import csv
from collections import defaultdict


RAW_FILE = "data/raw/Street_Sweeping_Schedule_20260430.csv"
OUTPUT_FILE = "data/processed/time_heatmap.csv"


def get(row, *names):
    for name in names:
        if name in row:
            return row[name]
    return ""


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


def monthly_frequency_for_row(row):
    total = 0

    for week_col in ["Week1", "Week2", "Week3", "Week4", "Week5", "week1", "week2", "week3", "week4", "week5"]:
        value = row.get(week_col, "")

        if value == "":
            continue

        try:
            total += int(float(value))
        except ValueError:
            pass

    return total


def main():
    weekday_order = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"]
    time_order = ["12-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14"]

    counts = defaultdict(int)

    with open(RAW_FILE, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            weekday = str(get(row, "WeekDay", "weekday")).strip()
            fromhour = get(row, "FromHour", "fromhour")

            if not weekday or not fromhour:
                continue

            time_bucket = get_time_bucket(fromhour)

            if time_bucket == "Other":
                continue

            # Count actual monthly service occurrences, not just raw rows.
            freq = monthly_frequency_for_row(row)

            if freq == 0:
                freq = 1

            counts[(weekday, time_bucket)] += freq

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["weekday", "time_bucket", "count"])
        writer.writeheader()

        for time_bucket in time_order:
            for weekday in weekday_order:
                writer.writerow({
                    "weekday": weekday,
                    "time_bucket": time_bucket,
                    "count": counts[(weekday, time_bucket)]
                })

    print(f"Created {OUTPUT_FILE}")
    print(f"Rows: {len(weekday_order) * len(time_order)}")


if __name__ == "__main__":
    main()

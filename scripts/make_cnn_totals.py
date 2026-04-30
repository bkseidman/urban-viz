import csv
from collections import defaultdict


RAW_FILE = "data/raw/Street_Sweeping_Schedule_20260430.csv"
OUTPUT_FILE = "data/processed/cnn_totals.csv"


def get(row, *names):
    for name in names:
        if name in row:
            return row[name]
    return ""


def clean_text(value):
    return str(value).strip()


def row_week_count(row):
    """
    Count how often this schedule row happens in a typical month.

    The raw data has Week1-Week5 fields. For the user-facing estimate,
    we treat a normal month as roughly 4 weeks, so rows marked for all
    five possible weeks count as about 4 times/month.
    """
    total = 0

    week_columns = [
        "Week1", "Week2", "Week3", "Week4", "Week5",
        "week1", "week2", "week3", "week4", "week5"
    ]

    for week_col in week_columns:
        value = row.get(week_col, "")

        if value == "":
            continue

        try:
            total += int(float(value))
        except ValueError:
            pass

    return min(total, 4)


def frequency_group(freq):
    """
    Uneven bins.

    Most street segments are in the low-frequency range, so the early bins
    need to be much more detailed. Higher values are less common, so those
    can use wider bins.
    """
    if freq <= 1:
        return "1"
    if freq == 2:
        return "2"
    if freq == 3:
        return "3"
    if freq == 4:
        return "4"
    if freq == 5:
        return "5"
    if freq == 6:
        return "6"
    if freq <= 8:
        return "7-8"
    if freq <= 12:
        return "9-12"
    if freq <= 16:
        return "13-16"
    if freq <= 20:
        return "17-20"
    if freq <= 28:
        return "21-28"
    if freq <= 36:
        return "29-36"

    return "37+"


def main():
    # Key idea:
    # For each CNN, count unique weekday/time schedules rather than every raw row.
    #
    # This avoids inflating the frequency because the raw dataset can split rows
    # by side of street, block side, or other repeated schedule records.
    #
    # Unique schedule pattern:
    # weekday + fromhour + tohour
    schedules_by_cnn = defaultdict(dict)

    with open(RAW_FILE, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            cnn = clean_text(get(row, "CNN", "cnn"))
            weekday = clean_text(get(row, "WeekDay", "weekday"))
            fromhour = clean_text(get(row, "FromHour", "fromhour"))
            tohour = clean_text(get(row, "ToHour", "tohour"))

            if not cnn or not weekday or not fromhour or not tohour:
                continue

            schedule_key = (weekday, fromhour, tohour)
            weeks = row_week_count(row)

            # If the same CNN/day/time appears more than once, keep the largest
            # week count instead of adding duplicate rows.
            previous = schedules_by_cnn[cnn].get(schedule_key, 0)
            schedules_by_cnn[cnn][schedule_key] = max(previous, weeks)

    rows = []

    for cnn, schedules in schedules_by_cnn.items():
        monthly_frequency = sum(schedules.values())

        rows.append({
            "cnn": cnn,
            "monthly_frequency": monthly_frequency,
            "frequency_group": frequency_group(monthly_frequency)
        })

    rows.sort(key=lambda d: int(d["cnn"]) if d["cnn"].isdigit() else d["cnn"])

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["cnn", "monthly_frequency", "frequency_group"]
        )

        writer.writeheader()
        writer.writerows(rows)

    print(f"Created {OUTPUT_FILE}")
    print(f"Rows: {len(rows)}")


if __name__ == "__main__":
    main()

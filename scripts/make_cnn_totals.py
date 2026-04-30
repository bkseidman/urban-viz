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

    The raw data has Week1-Week5 fields. If all five are marked, that technically
    means the schedule can happen in a fifth week, but for a simpler user-facing
    estimate, we treat a normal month as about 4 weeks.

    Examples:
    - Week1 only = 1 time/month
    - Week1 + Week3 = 2 times/month
    - Week1-Week5 = about 4 times/month
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
    Group estimated sweeps per month into enough bins to create a visible
    gradient on the map.

    These are still simple enough to explain:
    1-4 means about once per week or less.
    17-20 means about every weekday in a typical month.
    Higher bins capture streets with multiple unique time windows.
    """
    if freq <= 4:
        return "1-4"
    if freq <= 8:
        return "5-8"
    if freq <= 12:
        return "9-12"
    if freq <= 16:
        return "13-16"
    if freq <= 20:
        return "17-20"
    if freq <= 24:
        return "21-24"
    if freq <= 28:
        return "25-28"
    if freq <= 32:
        return "29-32"
    if freq <= 36:
        return "33-36"
    if freq <= 40:
        return "37-40"
    if freq <= 44:
        return "41-44"
    if freq <= 48:
        return "45-48"

    return "49+"


def main():
    # Key idea:
    # For each CNN, count unique schedule patterns instead of every raw row.
    #
    # The raw data can repeat rows because it separates sides of street and
    # block-side records. For a user-facing "times per month" metric, we do not
    # want left/right side duplicates to inflate the number too much.
    #
    # Unique schedule pattern:
    # weekday + fromhour + tohour
    #
    # Each unique pattern contributes based on the Week1-Week5 columns, capped
    # at 4 for a typical month estimate.
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
            # week count instead of adding duplicates.
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

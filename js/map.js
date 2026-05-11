<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Street Cleaning in San Francisco: Treemap Test</title>

    <script src="https://d3js.org/d3.v7.min.js"></script>

    <style>
      :root {
        --page-bg: #fafafa;
        --card-bg: #ffffff;
        --text-main: #222222;
        --text-muted: #555555;
        --border-light: #dddddd;
        --border-medium: #cccccc;
        --shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.06);
        --shadow-medium: 0 2px 10px rgba(0, 0, 0, 0.09);

        --blue-light: #eaf4fb;
        --blue-mid: #9ccdea;
        --blue-strong: #327abf;
        --blue-dark: #08306b;

        --radius-card: 10px;
        --radius-pill: 999px;
      }

      body {
        font-family: Arial, sans-serif;
        margin: 30px;
        line-height: 1.4;
        background: var(--page-bg);
        color: var(--text-main);
      }

      h1 {
        margin-bottom: 6px;
      }

      h2 {
        margin-top: 0;
        margin-bottom: 8px;
      }

      .subtitle {
        color: #444;
        max-width: 1200px;
        margin-bottom: 22px;
      }

      .dashboard-layout {
        display: grid;
        grid-template-columns: 1000px 520px 320px;
        gap: 24px;
        align-items: start;
      }

      .map-column,
      .charts-column,
      .side-column {
        min-width: 0;
      }

      .side-column {
        position: sticky;
        top: 24px;
      }

      svg {
        background: white;
        border: 1px solid var(--border-light);
      }

      #map {
        display: block;
        background: #f8f8f8;
      }

      .chart-card {
        background: var(--card-bg);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-card);
        padding: 14px;
        margin-bottom: 18px;
        box-shadow: var(--shadow-soft);
      }

      .chart-card h2 {
        font-size: 20px;
      }

      .chart-card p {
        color: #444;
        margin-top: 4px;
        margin-bottom: 12px;
        font-size: 13px;
      }

      /* =========================================================
         DETAIL PANEL
         These classes are intentionally reusable so the final site
         styling can be changed later without rewriting the JS.
      ========================================================= */

      #detail-panel {
        width: 100%;
        min-height: 260px;
        padding: 18px;
        border: 1px solid var(--border-medium);
        border-radius: var(--radius-card);
        background: var(--card-bg);
        box-shadow: var(--shadow-medium);
        box-sizing: border-box;
      }

      .detail-panel-title {
        margin: 0 0 14px 0;
        font-size: 22px;
        line-height: 1.15;
      }

      .detail-street-name {
        margin: 0;
        font-size: 24px;
        line-height: 1.15;
        font-weight: 800;
      }

      .detail-limits {
        margin: 6px 0 0 0;
        color: var(--text-muted);
        font-size: 14px;
        line-height: 1.3;
      }

      .detail-meta {
        margin: 8px 0 0 0;
        color: #777;
        font-size: 12px;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .detail-section {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid #e3e3e3;
      }

      .detail-section:first-child {
        margin-top: 0;
        padding-top: 0;
        border-top: none;
      }

      .detail-section-title {
        margin: 0 0 9px 0;
        font-size: 13px;
        color: #555;
        font-weight: 800;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }

      .detail-stat-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .detail-stat {
        border: 1px solid #dbe8f2;
        background: #f5f9fc;
        border-radius: 9px;
        padding: 10px;
        min-width: 0;
      }

      .detail-stat-value {
        display: block;
        font-size: 19px;
        line-height: 1.1;
        font-weight: 800;
        color: #111;
      }

      .detail-stat-label {
        display: block;
        margin-top: 4px;
        font-size: 11px;
        color: #666;
      }

      .weekday-row {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
      }

      .weekday-chip {
        text-align: center;
        border-radius: 6px;
        padding: 6px 0;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid #d9d9d9;
        color: #888;
        background: #f3f3f3;
      }

      .weekday-chip.active {
        color: white;
        background: var(--blue-strong);
        border-color: var(--blue-strong);
      }

      .time-badge {
        display: block;
        margin-top: 10px;
        padding: 9px 10px;
        border-radius: 8px;
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        font-size: 13px;
      }

      .detail-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .detail-pill {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 4px 9px;
        border-radius: var(--radius-pill);
        border: 1px solid #d7d7d7;
        background: #f7f7f7;
        font-size: 12px;
        font-weight: 700;
        color: #333;
      }

      .detail-pill.blue {
        background: var(--blue-light);
        border-color: #c9e3f5;
        color: #16456f;
      }

      .detail-pill.good {
        background: #eef7ef;
        border-color: #cce5cf;
        color: #27632a;
      }

      .detail-pill.warning {
        background: #fff7e6;
        border-color: #f0d49b;
        color: #7a5200;
      }

      .detail-row {
        margin: 9px 0;
        font-size: 13px;
      }

      .detail-row strong {
        font-weight: 800;
      }

      .detail-summary {
        margin: 8px 0 0 0;
        color: #555;
        font-size: 12.5px;
        line-height: 1.45;
      }

      .detail-footer-note {
        margin: 14px 0 0 0;
        padding-top: 12px;
        border-top: 1px solid #e8e8e8;
        color: #666;
        font-size: 12.5px;
        line-height: 1.45;
      }

      .detail-empty {
        color: #555;
        font-size: 14px;
        line-height: 1.45;
      }

      #reset-selection {
        margin-top: 12px;
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #bbb;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 14px;
      }

      #reset-selection:hover {
        background: #f1f1f1;
      }

      #map-tooltip {
        position: absolute;
        display: none;
        pointer-events: none;
        background: white;
        border: 1px solid #999;
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 13px;
        line-height: 1.4;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        max-width: 260px;
        z-index: 10;
      }

      .overlay {
        cursor: pointer;
      }

      .overlay.selected {
        stroke: #000;
        stroke-width: 4px;
        opacity: 1;
      }

      .legend text {
        font-size: 12px;
      }

      .chart-title {
        font-weight: bold;
        font-size: 15px;
      }

      .axis-label {
        font-size: 12px;
      }

      .bar-label {
        font-size: 10px;
      }

      .cell-label {
        font-size: 10px;
        pointer-events: none;
      }

      .top-street-label {
        font-size: 10px;
      }

      .nav-link {
        margin-top: 28px;
      }

      @media (max-width: 1500px) {
        .dashboard-layout {
          grid-template-columns: 1fr;
        }

        .side-column {
          position: static;
        }

        .charts-column {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .chart-card {
          margin-bottom: 0;
        }
      }

      @media (max-width: 900px) {
        body {
          margin: 18px;
        }

        .charts-column {
          display: block;
        }

        #map {
          width: 100%;
          height: auto;
        }

        .detail-stat-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>

  <body>
    <h1>Street Cleaning in San Francisco: Patterns and Frequency</h1>

    <p class="subtitle">
      This test dashboard explores how street sweeping is distributed across San Francisco.
      The map is the main view: users can zoom, hover, and click on street segments to inspect
      individual sweeping schedules. The heatmap and frequency chart provide citywide context.
    </p>

    <main class="dashboard-layout">
      <section class="map-column">
        <h2>Interactive Street Sweeping Map</h2>
        <p class="subtitle">
          Streets are colored by estimated sweeps per month. Hover for a quick preview,
          click for full schedule details, and zoom or pan to inspect smaller areas.
        </p>

        <svg id="map" width="1000" height="1260"></svg>
      </section>

      <section class="charts-column">
        <div class="chart-card">
          <h2>Weekday and Time Pattern</h2>
          <p>
            Click a heatmap cell to highlight streets swept during that weekday and time bucket.
          </p>
          <svg id="heatmap" width="500" height="360"></svg>
        </div>

        <div class="chart-card">
          <h2>Frequency Treemap</h2>
          <p>
            Rectangle size shows how many street segments fall into each estimated sweeps-per-month range.
            Click a rectangle to highlight matching streets on the map.
          </p>
          <svg id="chart" width="500" height="360"></svg>
        </div>

        <div class="chart-card">
          <h2>Most Sweeping Activity by Street</h2>
          <p>
            This chart groups all segments with the same street name and shows which streets
            have the most estimated sweeping activity overall. Click a bar to highlight that full
            street on the map.
          </p>
          <svg id="top-streets" width="500" height="360"></svg>
        </div>
      </section>

      <aside class="side-column">
        <div id="detail-panel">
          <h2 class="detail-panel-title">Selected Street</h2>
          <p class="detail-empty">Click a colored street segment to view its sweeping schedule.</p>
        </div>

        <button id="reset-selection" type="button">
          Reset selection
        </button>
      </aside>
    </main>

    <div id="map-tooltip"></div>

    <p class="nav-link"><a href="index.html">Back to index</a></p>

    <script src="js/map.js"></script>
    <script src="js/heatmap.js"></script>
    <script src="js/frequency_treemap.js"></script>
    <script src="js/top_streets.js"></script>
  </body>
</html>

# BigQuery Release Hub

A modern, high-performance dashboard to track, search, filter, and share Google Cloud BigQuery release updates. This application retrieves the official Google Cloud BigQuery Atom/RSS release notes, processes them on the backend, and presents them in an elegant client-side dashboard with interactive features.

---

## 🚀 Features

- **Real-Time Data Parsing**: Automatically parses Google's BigQuery release XML feed into clean, structured JSON.
- **Smart Server-Side Cache**: Implements an in-memory caching mechanism (5-minute expiration) to optimize page loading speeds and limit repetitive upstream calls.
- **Dynamic Category Tagging**: Automatically flags release updates as *Features*, *Deprecations*, *Changes*, *Resolved Issues*, or *Beta Releases*.
- **Live Search & Filter**: Instant browser-side search and category navigation for filtering updates.
- **Tweet Composer Integration**: Easily share release updates directly to X (Twitter) using a customizable social sharing modal.
- **Modern Responsive Design**: A stunning dark-mode layout featuring premium glassmorphic elements and glowing background animation.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.14+, Flask, XML ElementTree
- **Frontend**: HTML5 (Semantic Structure), Vanilla CSS (Custom Properties, Grid & Flex Layouts), Javascript (Async/Await API Calls, Event Delegation)
- **Dependency & Environment Management**: [uv](https://github.com/astral-sh/uv)

---

## 📂 Project Structure

```text
bq-release-notes/
├── templates/
│   └── index.html      # Main dashboard HTML template
├── static/
│   ├── css/
│   │   └── style.css   # Theme styling & layout (glassmorphism UI)
│   └── js/
│       └── app.js      # Frontend interaction logic & data fetching
├── main.py             # Flask application entry point, parser, and caching logic
├── pyproject.toml      # Project metadata & Python dependencies
├── uv.lock             # Lockfile for project dependencies
└── README.md           # Project documentation
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have [uv](https://github.com/astral-sh/uv) installed. If not, install it via:
```bash
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Installation

1. Clone or navigate to the repository directory:
   ```bash
   cd bq-release-notes
   ```
2. Install Python dependencies:
   ```bash
   uv sync
   ```

### Running the App

To launch the local Flask server:
```bash
uv run main.py
```

The application will start running at:
`http://127.0.0.1:5000`

---

## ⚙️ How It Works

1. **Backend Fetching**: The Flask server listens for browser requests on `/api/releases`. When called, it checks its memory cache. If the cache is older than 5 minutes, it fetches `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`, parses the Atom XML structure, and updates the local cache.
2. **Frontend UI Rendering**: The client pulls the clean JSON response from `/api/releases` on page load, processes categorization keywords, and dynamically builds clean card elements inside the feed container.
3. **Sharing**: Clicking on any release entry's share icon automatically populates a modal composer, letting you copy or directly tweet the formatted release details.

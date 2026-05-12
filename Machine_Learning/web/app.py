"""
================================================================================
K-MEANS CUSTOMER CLUSTERING — FLASK API BACKEND
================================================================================
Web dashboard API for serving clustering results, graphs, and dataset info.
Run: python app.py   →  http://localhost:5000
================================================================================
"""

import os
import json
import glob
import pandas as pd
import numpy as np
from flask import Flask, jsonify, send_file, send_from_directory, render_template, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Path configuration (relative to this file) ──────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
ML_DIR     = os.path.dirname(BASE_DIR)          # Machine_Learning/
DATASET    = os.path.join(ML_DIR, "dataset")
GRAPH      = os.path.join(ML_DIR, "graph")
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

# ── Graph directory mapping ─────────────────────────────────────────────────
GRAPH_MAP = {
    # Training — With Library
    "rfm_library":             os.path.join(GRAPH, "Training", "WIth Library", "RFM_WL"),
    "demographic_library":     os.path.join(GRAPH, "Training", "WIth Library", "Demographic_WL"),
    "productchannel_library":  os.path.join(GRAPH, "Training", "WIth Library", "ProductChannel_WL"),
    # Training — No Library
    "rfm_nolibrary":           os.path.join(GRAPH, "Training", "No Library", "RFM_NL"),
    "demographic_nolibrary":   os.path.join(GRAPH, "Training", "No Library", "DemoGraphic_NL"),
    "productchannel_nolibrary":os.path.join(GRAPH, "Training", "No Library", "ProductChannel_NL"),
    # Data Processing
    "processing_analysis":     os.path.join(GRAPH, "Data Processing & Wrangling_graph", "Basic_Data_Analysis"),
    "processing_cleaning":     os.path.join(GRAPH, "Data Processing & Wrangling_graph", "Data_Cleaning"),
    # Feature Engineering (RFM)
    "feature_rfm":             os.path.join(GRAPH, "Feature Extraction & Engineering_graph", "RFM"),
}

# ── Dataset mapping ──────────────────────────────────────────────────────────
DATASET_MAP = {
    "rfm":            os.path.join(DATASET, "Customer_Behavior_RFM_robust_scaled.csv"),
    "demographic":    os.path.join(DATASET, "Customer_Behavior_Demographic_robust_scaled.csv"),
    "productchannel": os.path.join(DATASET, "Customer_Behavior_ProductChannel_robust_scaled.csv"),
    "raw":            os.path.join(DATASET, "Customer_Behavior_cleaned.csv"),
}

# ── Utility ──────────────────────────────────────────────────────────────────

def safe_read_csv(path, nrows=None):
    """Read CSV, return DataFrame or None."""
    if not os.path.exists(path):
        return None
    return pd.read_csv(path, nrows=nrows)


def list_pngs(directory):
    """Return sorted list of PNG filenames in a directory."""
    if not os.path.isdir(directory):
        return []
    files = sorted(glob.glob(os.path.join(directory, "*.png")))
    return [os.path.basename(f) for f in files]


# Optimal K per segment (from training results)
OPTIMAL_K = {
    "rfm":            2,
    "demographic":    2,
    "productchannel": 2,
}

def cluster_metrics(df, feature_cols, n_clusters=2):
    """Fit KMeans and compute quality metrics."""
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score, davies_bouldin_score

    X = df[feature_cols].dropna().values
    if X.shape[0] < n_clusters * 2:
        return {}

    if "Cluster" in df.columns:
        labels = df.loc[df[feature_cols].notna().all(axis=1), "Cluster"].values
    else:
        km = KMeans(n_clusters=n_clusters, init="k-means++", n_init=10,
                    random_state=42, max_iter=300)
        labels = km.fit_predict(X)

    if len(set(labels)) < 2:
        return {}

    sil  = float(silhouette_score(X, labels))
    db   = float(davies_bouldin_score(X, labels))
    unique, counts = np.unique(labels, return_counts=True)
    dist = {str(int(k)): int(v) for k, v in zip(unique, counts)}
    return {
        "silhouette_score":     round(sil, 4),
        "davies_bouldin_index": round(db, 4),
        "cluster_distribution": dist,
        "n_clusters":           int(len(unique)),
    }


# ── Frontend ─────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return serve_frontend()


@app.route("/<path:path>")
def frontend_static(path):
    """Serve React static assets or fallback to index.html."""
    if path.startswith("api/"):
        abort(404)

    dist_path = os.path.join(FRONTEND_DIST, path)
    if os.path.exists(dist_path):
        return send_from_directory(FRONTEND_DIST, path)

    return serve_frontend()


def serve_frontend():
    """Serve the built React app when available; fallback to template."""
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return render_template("index.html")


# ── API: Overview ─────────────────────────────────────────────────────────────

@app.route("/api/overview")
def api_overview():
    """General dataset overview stats."""
    raw = safe_read_csv(DATASET_MAP["raw"])
    result = {
        "total_customers": int(len(raw)) if raw is not None else 0,
        "total_features":  int(raw.shape[1]) if raw is not None else 0,
        "segments": ["RFM", "Demographic", "Product & Channel"],
        "implementations": ["With Library (sklearn)", "No Library (from scratch)"],
        "dataset_files": os.listdir(DATASET) if os.path.isdir(DATASET) else [],
    }
    if raw is not None:
        result["columns"] = list(raw.columns)
    return jsonify(result)


# ── API: Cluster info ─────────────────────────────────────────────────────────

@app.route("/api/clusters/<segment>/<version>")
def api_clusters(segment, version):
    """
    segment: rfm | demographic | productchannel
    version: library | nolibrary
    """
    key = f"{segment}_{version}"
    csv_key = segment  # rfm / demographic / productchannel

    if csv_key not in DATASET_MAP:
        return jsonify({"error": f"Unknown segment: {segment}"}), 404

    df = safe_read_csv(DATASET_MAP[csv_key])
    if df is None:
        return jsonify({"error": "Dataset not found"}), 404

    # Feature columns (excluding non-numeric / id)
    exclude = ["Cluster", "ID", "Dt_Customer"]
    feature_cols = [c for c in df.columns if c not in exclude
                    and pd.api.types.is_numeric_dtype(df[c])]

    graphs_dir = GRAPH_MAP.get(key)
    graph_files = list_pngs(graphs_dir) if graphs_dir else []

    response = {
        "segment":    segment,
        "version":    version,
        "n_rows":     int(len(df)),
        "n_features": int(len(feature_cols)),
        "columns":    feature_cols[:20],  # trim for payload size
        "graphs":     graph_files,
        "graph_key":  key,
    }
    return jsonify(response)


# ── API: Graph list ───────────────────────────────────────────────────────────

@app.route("/api/graphs/<graph_key>")
def api_graphs(graph_key):
    """List PNG files for a given graph key."""
    directory = GRAPH_MAP.get(graph_key)
    if directory is None:
        return jsonify({"error": f"Unknown graph_key: {graph_key}"}), 404
    files = list_pngs(directory)
    return jsonify({"graph_key": graph_key, "files": files, "count": len(files)})


# ── API: Serve single graph image ─────────────────────────────────────────────

@app.route("/api/graph/<graph_key>/<filename>")
def api_graph_image(graph_key, filename):
    """Serve a single PNG image."""
    # Security: only allow .png
    if not filename.lower().endswith(".png"):
        abort(400)
    directory = GRAPH_MAP.get(graph_key)
    if directory is None:
        abort(404)
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        abort(404)
    return send_file(filepath, mimetype="image/png")


# ── API: Dataset sample ───────────────────────────────────────────────────────

@app.route("/api/dataset/sample")
def api_dataset_sample():
    """Return first 100 rows of cleaned dataset as JSON."""
    df = safe_read_csv(DATASET_MAP["raw"], nrows=100)
    if df is None:
        return jsonify({"error": "Dataset not found"}), 404
    df = df.replace([np.inf, -np.inf], np.nan).fillna("")
    return jsonify({
        "columns": list(df.columns),
        "rows":    df.values.tolist(),
        "total_shown": len(df),
    })


# ── API: Metrics ──────────────────────────────────────────────────────────────

@app.route("/api/metrics/<segment>")
def api_metrics(segment):
    """
    Compute cluster quality metrics for a segment.
    Fits KMeans on the robust-scaled CSV if no Cluster column present.
    """
    if segment not in DATASET_MAP:
        return jsonify({"error": f"Unknown segment: {segment}"}), 404

    df = safe_read_csv(DATASET_MAP[segment])
    if df is None:
        return jsonify({"error": "Dataset not found"}), 404

    exclude = ["Cluster", "ID", "Dt_Customer"]
    feature_cols = [c for c in df.columns if c not in exclude
                    and pd.api.types.is_numeric_dtype(df[c])]

    k = OPTIMAL_K.get(segment, 2)
    metrics = cluster_metrics(df, feature_cols, n_clusters=k)
    metrics["segment"] = segment
    metrics["n_rows"]  = int(len(df))
    return jsonify(metrics)


# ── API: All segments summary ─────────────────────────────────────────────────

@app.route("/api/summary")
def api_summary():
    """Quick summary across all three segments."""
    segments = ["rfm", "demographic", "productchannel"]
    result = {}
    for seg in segments:
        df = safe_read_csv(DATASET_MAP[seg])
        if df is None:
            result[seg] = {"error": "not found"}
            continue
        exclude = ["Cluster", "ID", "Dt_Customer"]
        feature_cols = [c for c in df.columns if c not in exclude
                        and pd.api.types.is_numeric_dtype(df[c])]
        k = OPTIMAL_K.get(seg, 2)
        m = cluster_metrics(df, feature_cols, n_clusters=k)
        m["n_rows"] = int(len(df))
        result[seg] = m
    return jsonify(result)


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  K-Means Customer Clustering — Web Dashboard")
    print("  URL: http://localhost:5000")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5000)

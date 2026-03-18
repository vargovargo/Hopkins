"""
Prompt 3b — City of Berkeley traffic count PDF processing
Hopkins Street Safety Data Story

Processes four PDFs of traffic count data provided via public records request
from data/raw/city_counts/ and produces:
  data/processed/city_counts.json       — structured count records
  data/processed/counts_comparison.json — comparison against Streetlight estimates
  data/processed/data_integrity_notes.md — discrepancy documentation

Steps:
  1. Extract and audit each PDF
  2. Structure data → city_counts.json
  3. Compare with Streetlight → counts_comparison.json
  4. Document divergences in data_integrity_notes.md

Run from repo root:
  python analysis/city_counts.py

Requires:
  pip install pdfplumber pandas
  (pdfplumber handles both text-based and image-based PDFs gracefully)
"""

import os
import sys
import json
import glob
from datetime import datetime
from pathlib import Path

import pandas as pd

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("[WARNING] pdfplumber not installed. Run: pip install pdfplumber")
    print("          PDF extraction will be skipped; structure files will still be created.\n")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT     = Path(__file__).resolve().parent.parent
RAW_DIR       = REPO_ROOT / "data" / "raw" / "city_counts"
PROCESSED_DIR = REPO_ROOT / "data" / "processed"
STREETLIGHT_SUMMARY = PROCESSED_DIR / "streetlight_summary.json"

OUTPUT_COUNTS_JSON     = PROCESSED_DIR / "city_counts.json"
OUTPUT_COMPARISON_JSON = PROCESSED_DIR / "counts_comparison.json"
INTEGRITY_NOTES        = PROCESSED_DIR / "data_integrity_notes.md"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Divergence threshold — flag for review if counts differ by more than this
DIVERGENCE_THRESHOLD = 0.25  # 25%


# ---------------------------------------------------------------------------
# STEP 1 — Extract and audit PDFs
# ---------------------------------------------------------------------------

def extract_pdf_text(fpath):
    """
    Attempt text extraction from a PDF using pdfplumber.
    Returns (text: str, is_text_based: bool).
    If the PDF is image-based, text will be empty and is_text_based = False.
    """
    if not PDF_AVAILABLE:
        return "", False

    text_parts = []
    is_text_based = False

    with pdfplumber.open(fpath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_parts.append(page_text)
                is_text_based = True

    return "\n".join(text_parts), is_text_based


def parse_count_values(text, filename):
    """
    Attempt to extract numeric count values from PDF text.
    Streetlight-adjacent PDFs typically contain turning movement counts,
    24-hour volumes, or peak-hour breakdowns.

    Returns a list of dicts with whatever structure can be parsed.
    This is a best-effort parser — complex PDFs may need manual review.
    """
    import re

    counts = []

    # Look for patterns like:
    #   "Total: 1,234"  "ADT: 5,678"  "Peak Hour: 789"
    #   "Northbound: 456  Southbound: 321"
    #   Lines with numbers that look like vehicle counts

    # Pattern: label followed by a count (possibly with comma separators)
    count_pattern = re.compile(
        r'(?P<label>[A-Za-z][A-Za-z\s\/\-()]+?)[:\s]+(?P<value>[\d,]+)\b',
        re.IGNORECASE
    )

    # Date pattern
    date_pattern = re.compile(
        r'(?:January|February|March|April|May|June|July|August|September|October|November|December)'
        r'\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}',
        re.IGNORECASE
    )

    found_date = None
    date_match = date_pattern.search(text)
    if date_match:
        found_date = date_match.group(0)

    # Extract numeric lines
    for match in count_pattern.finditer(text):
        label = match.group("label").strip()
        value_str = match.group("value").replace(",", "")
        try:
            value = int(value_str)
            # Filter out noise — counts are typically 10–100,000
            if 10 <= value <= 999999:
                counts.append({
                    "label": label,
                    "value": value,
                    "context": "extracted from PDF text",
                    "source_file": filename,
                    "count_date": found_date,
                })
        except ValueError:
            continue

    return counts


def audit_pdf(fpath):
    """
    Audit a single PDF and return a structured summary dict.
    """
    filename = fpath.name
    size_kb = fpath.stat().st_size / 1024

    print(f"\n  {'─'*56}")
    print(f"  FILE: {filename}  ({size_kb:.1f} KB)")

    result = {
        "filename": filename,
        "size_kb": round(size_kb, 1),
        "is_text_based": False,
        "page_count": 0,
        "raw_text_sample": "",
        "extracted_counts": [],
        "location": "UNKNOWN — review manually",
        "count_type": "UNKNOWN — review manually",
        "count_date": None,
        "count_duration": "UNKNOWN",
        "notes": [],
    }

    if not PDF_AVAILABLE:
        result["notes"].append("pdfplumber not installed — install to enable PDF extraction")
        print(f"    [SKIP] pdfplumber not available")
        return result

    try:
        with pdfplumber.open(fpath) as pdf:
            result["page_count"] = len(pdf.pages)
            print(f"    Pages: {result['page_count']}")

        text, is_text_based = extract_pdf_text(fpath)
        result["is_text_based"] = is_text_based

        if is_text_based:
            result["raw_text_sample"] = text[:500]
            print(f"    Text-based PDF ✓")
            print(f"    Text sample: {text[:200]!r}")

            counts = parse_count_values(text, filename)
            result["extracted_counts"] = counts
            print(f"    Extracted {len(counts)} potential count value(s)")
            for c in counts[:5]:  # print first 5
                print(f"      {c['label']}: {c['value']}")
            if len(counts) > 5:
                print(f"      ... and {len(counts)-5} more")

            # Infer location from text keywords
            location_keywords = {
                "Hopkins & Gilman": ["gilman", "hopkins"],
                "Hopkins & Sacramento": ["sacramento", "hopkins"],
                "Hopkins & McGee": ["mcgee", "hopkins"],
                "Hopkins & The Alameda": ["alameda", "hopkins"],
                "Hopkins & Monterey": ["monterey", "hopkins"],
            }
            text_lower = text.lower()
            for loc, keywords in location_keywords.items():
                if all(k in text_lower for k in keywords):
                    result["location"] = loc
                    break

            # Infer count type
            if "turning movement" in text_lower or "tmc" in text_lower:
                result["count_type"] = "turning movement"
            elif "pedestrian" in text_lower and "bicycle" in text_lower:
                result["count_type"] = "multimodal"
            elif "pedestrian" in text_lower:
                result["count_type"] = "pedestrian"
            elif "bicycle" in text_lower or "bike" in text_lower:
                result["count_type"] = "bicycle"
            elif "adt" in text_lower or "average daily traffic" in text_lower:
                result["count_type"] = "vehicle ADT"
            elif "vehicle" in text_lower:
                result["count_type"] = "vehicle"

            # Infer duration
            if "24-hour" in text_lower or "24 hour" in text_lower or "adt" in text_lower:
                result["count_duration"] = "24-hour"
            elif "peak hour" in text_lower:
                result["count_duration"] = "peak hour"

            # Find date in text
            import re
            date_pattern = re.compile(
                r'(?:January|February|March|April|May|June|July|August|September|October|November|December)'
                r'\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}',
                re.IGNORECASE
            )
            date_match = date_pattern.search(text)
            if date_match:
                result["count_date"] = date_match.group(0)

        else:
            print(f"    Image-based PDF (no extractable text)")
            print(f"    → Manual data entry required for this file.")
            result["notes"].append(
                "Image-based PDF — text extraction failed. "
                "Count data must be manually entered. "
                "Visually inspect the PDF for: count table(s), location header, "
                "date of count, and count duration."
            )

    except Exception as e:
        result["notes"].append(f"Error during extraction: {e}")
        print(f"    [ERROR] {e}")

    print(f"    Location inferred: {result['location']}")
    print(f"    Count type:        {result['count_type']}")
    print(f"    Count date:        {result['count_date']}")
    print(f"    Count duration:    {result['count_duration']}")

    return result


def audit_all_pdfs():
    """Step 1: Audit all PDFs in data/raw/city_counts/."""
    print("\n" + "=" * 70)
    print("STEP 1 — EXTRACT AND AUDIT PDFs")
    print("=" * 70)

    if not RAW_DIR.exists():
        print(f"\n[ERROR] Directory does not exist: {RAW_DIR}")
        print("  → Create the directory and place the four City of Berkeley")
        print("    traffic count PDFs there, then re-run.")
        sys.exit(1)

    pdf_files = sorted(RAW_DIR.glob("*.pdf")) + sorted(RAW_DIR.glob("*.PDF"))
    if not pdf_files:
        print(f"  [ERROR] No PDF files found in {RAW_DIR}")
        print("  → Expected four PDF files from the City of Berkeley public records request.")
        sys.exit(1)

    print(f"  Found {len(pdf_files)} PDF(s)")
    audits = [audit_pdf(f) for f in pdf_files]
    return audits


# ---------------------------------------------------------------------------
# STEP 2 — Structure the data → city_counts.json
# ---------------------------------------------------------------------------

def build_counts_json(audits):
    """
    Step 2: Assemble structured city_counts.json from audit results.
    Returns the full JSON structure.
    """
    print("\n" + "=" * 70)
    print("STEP 2 — STRUCTURE DATA → city_counts.json")
    print("=" * 70)

    documents = []
    all_counts = []

    for audit in audits:
        doc_entry = {
            "filename": audit["filename"],
            "location": audit["location"],
            "count_type": audit["count_type"],
            "count_date": audit["count_date"],
            "count_duration": audit["count_duration"],
            "is_text_based": audit["is_text_based"],
            "notes": audit.get("notes", []),
        }
        documents.append(doc_entry)

        # Flatten extracted counts into records
        for c in audit.get("extracted_counts", []):
            record = {
                "source_file": audit["filename"],
                "location": audit["location"],
                "count_type": audit["count_type"],
                "count_date": audit["count_date"],
                "label": c.get("label"),
                "value": c.get("value"),
                "unit": "vehicles" if "vehicle" in audit["count_type"].lower() else audit["count_type"],
                "context": c.get("context", ""),
                "verified": False,  # flag for manual review
            }
            all_counts.append(record)

    output = {
        "_metadata": {
            "source": "City of Berkeley public records request",
            "request_date": "TBD — check PDF headers",
            "processing_script": "analysis/city_counts.py",
            "generated": datetime.utcnow().isoformat() + "Z",
            "documents": documents,
            "integrity_note": (
                "Counts extracted by automated PDF parser. All values flagged "
                "verified=false until manually confirmed against source PDFs. "
                "Image-based PDFs require manual data entry."
            ),
        },
        "counts": all_counts,
    }

    with open(OUTPUT_COUNTS_JSON, "w") as f:
        json.dump(output, f, indent=2)

    print(f"  ✓ {len(all_counts)} count record(s) written → "
          f"{OUTPUT_COUNTS_JSON.relative_to(REPO_ROOT)}")
    return output


# ---------------------------------------------------------------------------
# STEP 3 — Comparison with Streetlight
# ---------------------------------------------------------------------------

def _load_streetlight_volumes():
    """
    Load vehicle volumes from streetlight_summary.json for comparison.
    Returns a dict of {zone_label_lower: volume} or {} if file not found.
    """
    if not STREETLIGHT_SUMMARY.exists():
        return {}

    with open(STREETLIGHT_SUMMARY) as f:
        summary = json.load(f)

    segs = summary.get("vehicle_volumes", {}).get("segments", [])
    return {
        seg["label"].lower(): {
            "volume": seg.get("volume"),
            "label": seg.get("label"),
            "id": seg.get("id"),
            "year": summary.get("_metadata", {}).get("vehicle_data_year"),
            "unit": summary.get("vehicle_volumes", {}).get("unit", "estimated daily trips"),
            "status": summary.get("_metadata", {}).get("status", "UNVERIFIED"),
        }
        for seg in segs
        if seg.get("volume") is not None
    }


def compare_with_streetlight(counts_json):
    """
    Step 3: Where city count locations overlap with Streetlight zones,
    compare volumes. Flag divergences > 25%.

    Saves to data/processed/counts_comparison.json.
    """
    print("\n" + "=" * 70)
    print("STEP 3 — COMPARE WITH STREETLIGHT")
    print("=" * 70)

    sl_volumes = _load_streetlight_volumes()
    if not sl_volumes:
        print("  [SKIP] streetlight_summary.json not found or has no vehicle volumes.")
        print("         Run Prompt 3 (streetlight.py) first to generate verified data.")

    city_counts = counts_json.get("counts", [])
    comparisons = []
    flags = []

    for record in city_counts:
        location = record.get("location", "").lower()
        city_vol = record.get("value")
        count_type = record.get("count_type", "")

        # Only compare vehicle counts against vehicle Streetlight data
        if "vehicle" not in count_type.lower() and "adt" not in count_type.lower():
            continue
        if city_vol is None:
            continue

        # Try to find a matching Streetlight segment
        matched_sl = None
        matched_label = None
        for sl_label, sl_data in sl_volumes.items():
            # Check if any significant word from the city location appears in SL label
            city_words = [w for w in location.replace("&", " ").replace("@", " ").split()
                          if len(w) > 3]
            if any(word.lower() in sl_label for word in city_words):
                matched_sl = sl_data
                matched_label = sl_data["label"]
                break

        if matched_sl is None:
            comparisons.append({
                "city_location": record.get("location"),
                "city_count_date": record.get("count_date"),
                "city_volume": city_vol,
                "streetlight_zone": None,
                "streetlight_volume": None,
                "difference_absolute": None,
                "difference_pct": None,
                "flagged": False,
                "note": "No matching Streetlight zone found — verify location alignment manually",
            })
            continue

        sl_vol = matched_sl["volume"]
        diff_abs = city_vol - sl_vol
        diff_pct = abs(diff_abs) / sl_vol if sl_vol else None

        flagged = diff_pct is not None and diff_pct > DIVERGENCE_THRESHOLD

        comparison = {
            "city_location": record.get("location"),
            "city_count_date": record.get("count_date"),
            "city_count_duration": record.get("count_duration"),
            "city_volume": city_vol,
            "streetlight_zone": matched_label,
            "streetlight_volume": sl_vol,
            "streetlight_year": matched_sl.get("year"),
            "streetlight_status": matched_sl.get("status"),
            "difference_absolute": diff_abs,
            "difference_pct": round(diff_pct * 100, 1) if diff_pct is not None else None,
            "flagged": flagged,
            "note": "",
        }

        if flagged:
            comparison["note"] = (
                f"DIVERGENCE > 25%: city count ({city_vol:,}) differs from "
                f"Streetlight estimate ({sl_vol:,}) by {diff_pct*100:.1f}%. "
                f"Likely causes: different time periods ({record.get('count_date')} vs "
                f"Streetlight {matched_sl.get('year')}), different counting methodology, "
                f"or imprecise location match. Do not average or reconcile — document and disclose."
            )
            flags.append(comparison)
            print(f"  ⚠️  DIVERGENCE FLAGGED: {record.get('location')} "
                  f"({diff_pct*100:.1f}% difference)")

        comparisons.append(comparison)

    output = {
        "_metadata": {
            "generated": datetime.utcnow().isoformat() + "Z",
            "divergence_threshold_pct": DIVERGENCE_THRESHOLD * 100,
            "goal": (
                "Validation, not reconciliation. If sources disagree, we document "
                "and explain the divergence. We do not average or select the more "
                "favorable number."
            ),
            "flagged_count": len(flags),
        },
        "comparisons": comparisons,
    }

    with open(OUTPUT_COMPARISON_JSON, "w") as f:
        json.dump(output, f, indent=2)

    print(f"  ✓ {len(comparisons)} comparison(s) written → "
          f"{OUTPUT_COMPARISON_JSON.relative_to(REPO_ROOT)}")
    if flags:
        print(f"  ⚠️  {len(flags)} divergence(s) flagged (>{DIVERGENCE_THRESHOLD*100:.0f}%) "
              f"— see data_integrity_notes.md")

    return comparisons, flags


# ---------------------------------------------------------------------------
# STEP 4 — Document in data_integrity_notes.md
# ---------------------------------------------------------------------------

def document_integrity_notes(audits, comparisons, flags):
    """
    Step 4: Append a section to data/processed/data_integrity_notes.md
    summarizing the city count comparison.
    """
    print("\n" + "=" * 70)
    print("STEP 4 — UPDATE data_integrity_notes.md")
    print("=" * 70)

    lines = []
    lines.append(
        "\n## City of Berkeley Traffic Counts — Comparison with Streetlight\n"
    )
    lines.append(f"*Updated: {datetime.utcnow().strftime('%Y-%m-%d')} by analysis/city_counts.py*\n")
    lines.append(
        "\n### Source\n"
        "City of Berkeley traffic count PDFs provided via public records request. "
        "Four documents covering intersections/segments in the Hopkins corridor.\n"
    )

    # Summary of documents
    lines.append("\n### Documents processed\n")
    for audit in audits:
        lines.append(f"- **{audit['filename']}** — {audit['location']}, "
                     f"{audit['count_type']}, {audit['count_date'] or 'date unknown'}")
        if not audit["is_text_based"]:
            lines.append(
                f"  _(Image-based PDF — counts must be manually entered)_"
            )
        if audit.get("notes"):
            for note in audit["notes"]:
                lines.append(f"  ⚠️ {note}")
    lines.append("")

    # Comparison results
    matched = [c for c in comparisons if c.get("streetlight_zone")]
    unmatched = [c for c in comparisons if not c.get("streetlight_zone")]

    lines.append("\n### Comparison results\n")
    if not comparisons:
        lines.append(
            "No comparable vehicle count data could be extracted from the PDFs. "
            "Manual review required."
        )
    else:
        lines.append(f"- {len(matched)} location(s) matched to Streetlight zones")
        lines.append(f"- {len(unmatched)} location(s) could not be matched")
        lines.append(f"- {len(flags)} divergence(s) exceeding 25% threshold\n")

        if matched:
            lines.append("\n| Location | City count | Streetlight estimate | Difference | Flagged |")
            lines.append("|---|---|---|---|---|")
            for c in matched:
                pct = f"{c['difference_pct']}%" if c.get("difference_pct") is not None else "—"
                flag = "⚠️ YES" if c.get("flagged") else "no"
                lines.append(
                    f"| {c['city_location']} | {c['city_volume']:,} | "
                    f"{c['streetlight_volume']:,} | {pct} | {flag} |"
                )
            lines.append("")

        if flags:
            lines.append("\n### Flagged divergences\n")
            for c in flags:
                lines.append(f"**{c['city_location']}**: {c['note']}\n")

    lines.append(
        "\n### Interpretation guidance\n"
        "Divergences between city counts and Streetlight estimates are expected and do not "
        "indicate an error in either source. Likely explanations include:\n"
        "- Different time periods (city counts may be years older than Streetlight 2025 data)\n"
        "- Different counting methodology (manual vs. device-based)\n"
        "- Different geographic scope (intersection turning movement vs. segment midblock)\n\n"
        "The goal of this comparison is validation: do the Streetlight estimates fall in a "
        "plausible range relative to independent ground-truth counts? Where they diverge "
        "significantly, we disclose this and explain the likely reason. We do not suppress "
        "discrepancies or average the two sources.\n"
    )

    INTEGRITY_NOTES.parent.mkdir(parents=True, exist_ok=True)
    with open(INTEGRITY_NOTES, "a") as f:
        f.write("\n".join(lines))

    print(f"  ✓ Updated: {INTEGRITY_NOTES.relative_to(REPO_ROOT)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Hopkins Street Safety — City of Berkeley Traffic Count Processing")
    print(f"Source directory: {RAW_DIR}")
    print(f"Output directory: {PROCESSED_DIR}")

    if not RAW_DIR.exists():
        print(f"\n[ERROR] Raw data directory does not exist: {RAW_DIR}")
        print("  → Create the directory and place the four Berkeley traffic count PDFs there.")
        sys.exit(1)

    # Step 1
    audits = audit_all_pdfs()

    # Step 2
    counts_json = build_counts_json(audits)

    # Step 3
    comparisons, flags = compare_with_streetlight(counts_json)

    # Step 4
    document_integrity_notes(audits, comparisons, flags)

    print("\n✓ Done. Review output files in data/processed/\n")

    # Print summary
    print("Summary:")
    print(f"  PDFs processed:  {len(audits)}")
    print(f"  Count records:   {len(counts_json.get('counts', []))}")
    print(f"  Comparisons:     {len(comparisons)}")
    print(f"  Flagged (>25%):  {len(flags)}")
    image_only = [a for a in audits if not a.get("is_text_based")]
    if image_only:
        print(f"\n  ⚠️  {len(image_only)} image-based PDF(s) require manual data entry:")
        for a in image_only:
            print(f"      - {a['filename']}")


if __name__ == "__main__":
    main()

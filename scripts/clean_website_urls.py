"""
Clean Website URL column by removing query parameters from agencies CSV file
"""

import io
import sys
from urllib.parse import urlparse, urlunparse

import pandas as pd

# Fix Unicode encoding issues on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def clean_url(url):
    """
    Remove query parameters from a URL

    Args:
        url: URL string to clean

    Returns:
        URL without query parameters
    """
    if pd.isna(url) or not url:
        return url

    try:
        parsed = urlparse(url)
        # Rebuild URL without query string and fragment
        clean = urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                "",  # params (empty)
                "",  # query (empty - this removes ?utm_source=...)
                "",  # fragment (empty)
            )
        )
        return clean
    except Exception as e:
        print(f"Warning: Could not parse URL: {url} - Error: {e}")
        return url


def main():
    # Input and output file paths
    input_file = "agencies_extracted_agencyspotter_20260126.csv"
    output_file = "agencies_extracted_agencyspotter_20260126_cleaned.csv"

    # Read the CSV file
    print(f"Reading {input_file}...")
    df = pd.read_csv(input_file)

    # Show original sample
    print(f"\nTotal rows: {len(df)}")
    print("\nSample BEFORE cleaning:")
    print(df[["Agency Name", "Website URL"]].head(3))

    # Clean the Website URL column
    print("\nCleaning Website URLs...")
    df["Website URL"] = df["Website URL"].apply(clean_url)

    # Show cleaned sample
    print("\nSample AFTER cleaning:")
    print(df[["Agency Name", "Website URL"]].head(3))

    # Save to new file
    print(f"\nSaving cleaned data to {output_file}...")
    df.to_csv(output_file, index=False)

    print(f"✓ Done! Cleaned file saved as: {output_file}")

    # Show stats
    urls_with_params = (
        df["Website URL"].apply(lambda x: "?" in str(x) if pd.notna(x) else False).sum()
    )
    if urls_with_params > 0:
        print(f"\n⚠ Warning: {urls_with_params} URLs still contain '?' - please review")
    else:
        print("\n✓ All query parameters removed successfully!")


if __name__ == "__main__":
    main()

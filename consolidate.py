#!/usr/bin/env python3
"""
Consolidation script for Bike Manager PWA
This script helps consolidate the app into a single-file index.html
"""

import re
import json

def extract_tailwind_classes(html_content):
    """Extract all Tailwind classes used in HTML"""
    classes = set()
    pattern = r'class="([^"]*)"'
    for match in re.finditer(pattern, html_content):
        class_str = match.group(1)
        classes.update(class_str.split())
    return classes

def main():
    print("Bike Manager PWA Consolidation Script")
    print("=" * 50)
    print("\nThis script will help consolidate:")
    print("1. HTML structure (preserved)")
    print("2. CSS (Tailwind utilities + custom)")
    print("3. JavaScript (with new modules)")
    print("4. Remove CDN dependencies")
    print("5. Add IndexedDB, crypto, biometric, camera, backup")
    print("\nNote: Full consolidation will be done via direct file creation")

if __name__ == '__main__':
    main()

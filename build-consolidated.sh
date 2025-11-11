#!/bin/bash
# Script to help understand the structure before consolidation
echo "Analyzing current structure..."
echo "HTML lines: $(wc -l < index.html)"
echo "JS lines: $(wc -l < index-script.js)"
echo "Total: $(($(wc -l < index.html) + $(wc -l < index-script.js)))"
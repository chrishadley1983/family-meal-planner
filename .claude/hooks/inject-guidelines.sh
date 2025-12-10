#!/bin/bash

if [ -f "CLAUDE.md" ]; then
    echo "=== PROJECT GUIDELINES (ALWAYS FOLLOW) ==="
    cat CLAUDE.md
    echo ""
    echo "=== END GUIDELINES ==="
    echo ""
fi
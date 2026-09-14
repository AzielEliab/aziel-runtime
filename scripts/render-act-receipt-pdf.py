#!/usr/bin/env python3
"""Render docs/designs/ACT-RECEIPT-1.0.md to a simple text PDF. Author: Aziel Eliab only."""
import runpy
import sys
from pathlib import Path

sys.argv = [str(Path(__file__).with_name("render-design-pdf.py")), "ACT-RECEIPT-1.0.md"]
runpy.run_path(str(Path(__file__).with_name("render-design-pdf.py")), run_name="__main__")

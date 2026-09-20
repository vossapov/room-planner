#!/usr/bin/env python3
"""Compatibility entry point; the old draft builder is superseded."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('build_editor.py')),run_name='__main__')

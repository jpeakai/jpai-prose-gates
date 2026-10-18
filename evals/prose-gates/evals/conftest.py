"""Put this directory on ``sys.path`` so the cases can share ``_gate.py``.

The eval plugin imports each ``eval_*.py`` without making its directory importable, and
the repository-wide ``pythonpath`` is the wrong place to name one suite's helpers.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

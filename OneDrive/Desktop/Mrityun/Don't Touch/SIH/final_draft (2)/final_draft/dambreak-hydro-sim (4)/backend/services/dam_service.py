"""
Dam Service: Manages National Large Dams registry and hydraulic baselines.
"""

import json
import os
from typing import List, Optional
from ..models.schemas import DamSpecifications

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "dams.json")


class DamService:
    def __init__(self):
        self._dams = self._load_dams()

    def _load_dams(self) -> List[DamSpecifications]:
        if os.path.exists(DATA_PATH):
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [DamSpecifications(**item) for item in data]
        return []

    def get_all_dams(self) -> List[DamSpecifications]:
        return self._dams

    def get_dam_by_id(self, dam_id: str) -> Optional[DamSpecifications]:
        for dam in self._dams:
            if dam.id == dam_id:
                return dam
        return self._dams[0] if self._dams else None


dam_service = DamService()

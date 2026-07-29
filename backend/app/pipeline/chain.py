"""Composable pipeline steps over shared context and accumulating state."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import TypeVar

from app.config import Settings

StateT = TypeVar("StateT")
StateU = TypeVar("StateU")


@dataclass(frozen=True)
class PipelineContext:
    settings: Settings
    document_path: Path


PipelineStep = Callable[[PipelineContext, StateT], StateU]


@dataclass
class Pipeline[StateT]:
    """Run an ordered list of steps that share context and pass state forward."""

    _ctx: PipelineContext
    _steps: list[PipelineStep]

    @classmethod
    def start(cls, ctx: PipelineContext) -> Pipeline[StateT]:
        return cls(_ctx=ctx, _steps=[])

    def then(self, step: PipelineStep[StateT, StateU]) -> Pipeline[StateU]:
        return Pipeline(_ctx=self._ctx, _steps=[*self._steps, step])

    def run(self, initial: StateT) -> StateT:
        state = initial
        for step in self._steps:
            state = step(self._ctx, state)
        return state

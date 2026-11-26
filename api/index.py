#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vercel Serverless Function entrypoint for Lecture AI Studio.
Переиспользует обработчик LectureAIHandler и SQLite/TTS-логику из server.py.
"""

import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from server import LectureAIHandler, init_db  # noqa: E402

init_db()


class handler(LectureAIHandler):
    pass

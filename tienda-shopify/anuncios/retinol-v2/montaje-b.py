#!/usr/bin/env python3
"""Retinol evergreen B (hook unboxing). Uso: python3 montaje-a.py salida.mp4 voz.mp3"""
import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
import base_montaje as m
B, XB, MED = m.BOLD, m.XB, m.MED
m.SCENES = [
    ("c5.mp4", 5.5, [
        ("My new favorite", B, 80, 1400, 0.2, 5.5, "big"),
        ("face cream just arrived", B, 74, 1495, 0.5, 5.5, "big"),
    ]),
    ("c1.mp4", 5.5, [
        ("3 in 1 jar:", B, 80, 220, 0.2, 5.5, "big"),
        ("Retinol · Collagen · Hyaluronic Acid", MED, 44, 320, 0.4, 5.5, "small"),
    ]),
    ("c3.mp4", 5.5, [
        ("Feels rich & silky", B, 80, 1440, 0.2, 5.5, "big"),
        ("Hydrated all day", B, 80, 1535, 0.4, 5.5, "big"),
    ]),
    ("c2.mp4", 5.5, [
        ("Day & night formula", B, 80, 1490, 0.2, 5.5, "big"),
        ("Part of my routine now", MED, 44, 1590, 0.6, 5.5, "small"),
    ]),
    ("c4.mp4", 5.0, [
        ("BUNDLE & SAVE", XB, 40, 215, 0.1, 5.0, "pill"),
        ("1 jar  $14.99", B, 56, 300, 0.3, 5.0, "card"),
        ("2 jars  $24.99", B, 66, 395, 0.5, 5.0, "hl"),
        ("4 jars  $39.99", B, 56, 500, 0.7, 5.0, "card"),
        ("Free shipping  ·  kavirostore.store", XB, 38, 610, 1.0, 5.0, "pill_accent"),
    ]),
]
m.main(*sys.argv[1:])

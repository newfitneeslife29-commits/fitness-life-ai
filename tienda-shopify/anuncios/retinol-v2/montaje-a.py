#!/usr/bin/env python3
"""Retinol evergreen A (hook espejo). Uso: python3 montaje-a.py salida.mp4 voz.mp3"""
import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
import base_montaje as m
B, XB, MED = m.BOLD, m.XB, m.MED
m.SCENES = [
    ("c0.mp4", 5.5, [
        ("My skin looked so tired", B, 74, 1360, 0.2, 5.5, "big"),
        ("...until I found this", B, 74, 1450, 0.8, 5.5, "big"),
    ]),
    ("c1.mp4", 5.5, [
        ("Retinol + Collagen", B, 80, 240, 0.2, 5.5, "big"),
        ("+ Hyaluronic Acid", B, 80, 335, 0.4, 5.5, "big"),
        ("Rich, silky, never greasy", MED, 44, 440, 0.8, 5.5, "small"),
    ]),
    ("c2.mp4", 5.5, [
        ("Morning & night", B, 80, 1490, 0.2, 5.5, "big"),
        ("Just a little goes a long way", MED, 44, 1590, 0.6, 5.5, "small"),
    ]),
    ("c3.mp4", 5.5, [
        ("Softer, hydrated,", B, 80, 1440, 0.2, 5.5, "big"),
        ("smoother-looking skin", B, 76, 1535, 0.4, 5.5, "big"),
    ]),
    ("c4.mp4", 5.0, [
        ("MOST POPULAR: 2 JARS", XB, 40, 215, 0.1, 5.0, "pill"),
        ("1 jar  $14.99", B, 56, 300, 0.3, 5.0, "card"),
        ("2 jars  $24.99", B, 66, 395, 0.5, 5.0, "hl"),
        ("4 jars  $39.99", B, 56, 500, 0.7, 5.0, "card"),
        ("Free shipping  ·  kavirostore.store", XB, 38, 610, 1.0, 5.0, "pill_accent"),
    ]),
]
m.main(*sys.argv[1:])

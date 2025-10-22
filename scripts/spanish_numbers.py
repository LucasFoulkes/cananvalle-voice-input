"""Utilities for converting integers to their Spanish textual representation (0..300).

Rules implemented:
* 0 = "cero"
* 1..29 irregular / veinti* fused forms
* 30..99 => tens + " y " + unit (except exact tens)
* 100 exact => "cien"; 101..199 => "ciento <rest>"
* 200 => "doscientos"; 201..299 => "doscientos <rest>" (same for trescientos)
* 300 => "trescientos"

Scope purposely ends at 300 (no feminine agreement handling, no 400+).
"""
from __future__ import annotations

EXACT = {
    0: "cero",
    1: "uno",
    2: "dos",
    3: "tres",
    4: "cuatro",
    5: "cinco",
    6: "seis",
    7: "siete",
    8: "ocho",
    9: "nueve",
    10: "diez",
    11: "once",
    12: "doce",
    13: "trece",
    14: "catorce",
    15: "quince",
    16: "dieciséis",
    17: "diecisiete",
    18: "dieciocho",
    19: "diecinueve",
    20: "veinte",
    21: "veintiuno",
    22: "veintidós",
    23: "veintitrés",
    24: "veinticuatro",
    25: "veinticinco",
    26: "veintiséis",
    27: "veintisiete",
    28: "veintiocho",
    29: "veintinueve",
    30: "treinta",
    40: "cuarenta",
    50: "cincuenta",
    60: "sesenta",
    70: "setenta",
    80: "ochenta",
    90: "noventa",
    100: "cien",
    200: "doscientos",
    300: "trescientos",
}


def number_to_spanish(n: int, *, compound_style: str = "y") -> str:
    """Return Spanish cardinal for 0..300.

    compound_style:
        "y" -> use canonical form (e.g. "treinta y cinco")
        "split" -> return a tuple-like spaced form where user may want to fetch
                    separate audio segments (e.g. "treinta y cinco" unchanged
                    for now, but reserved if later we want segmentation logic).
    """
    if not (0 <= n <= 300):
        raise ValueError("Only numbers 0..300 supported")
    if n in EXACT:
        return EXACT[n]

    # 101..199 => ciento + remainder
    if 101 <= n <= 199:
        remainder = n - 100
        return f"ciento {number_to_spanish(remainder)}"

    # 201..299 => doscientos + remainder; 301 not allowed (cutoff 300)
    if 201 <= n <= 299:
        remainder = n - 200
        return f"doscientos {number_to_spanish(remainder)}"

    # 301 not supported; but handle 300 exact earlier

    # 30..99 & 1..99 general case if not exact already covered
    if n < 100:
        tens = (n // 10) * 10
        units = n % 10
        tens_word = EXACT[tens]
        return f"{tens_word} y {EXACT[units]}"

    raise AssertionError("Unreachable path for n<=300")


if __name__ == "__main__":  # Simple manual test
    test_points = [0, 1, 16, 21, 30, 31, 36, 99, 100, 101, 115, 121, 175, 199, 200, 201, 221, 275, 299, 300]
    for i in test_points:
        print(i, number_to_spanish(i))

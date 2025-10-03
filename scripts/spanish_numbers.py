"""Utilities for converting integers to their Spanish textual representation (1..100).

Supports cardinal numbers only up to 100 for now ("cien").
"""
from __future__ import annotations

EXACT = {
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
}


def number_to_spanish(n: int, *, compound_style: str = "y") -> str:
    """Return Spanish cardinal for 1..100.

    compound_style:
        "y" -> use canonical form (e.g. "treinta y cinco")
        "split" -> return a tuple-like spaced form where user may want to fetch
                    separate audio segments (e.g. "treinta y cinco" unchanged
                    for now, but reserved if later we want segmentation logic).
    """
    if not (1 <= n <= 100):
        raise ValueError("Only numbers 1..100 supported")
    if n in EXACT:
        return EXACT[n]

    if n < 100:
        tens = (n // 10) * 10
        units = n % 10
        tens_word = EXACT[tens]
        # For 31..99 (excluding exact tens) -> "tens y units"
        return f"{tens_word} y {EXACT[units]}"

    raise AssertionError("Unreachable path for n<=100")


if __name__ == "__main__":  # Simple manual test
    for i in range(1, 101):
        print(i, number_to_spanish(i))

import { Fraction } from './types';

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function simplifyFrac(f: Fraction): Fraction {
  if (f.n === 0) return { n: 0, d: 1 };
  let n = Math.round(f.n);
  let d = Math.round(f.d);
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export function makeFrac(n: number, d = 1): Fraction {
  return simplifyFrac({ n, d });
}

export function addFrac(a: Fraction, b: Fraction): Fraction {
  return simplifyFrac({
    n: a.n * b.d + b.n * a.d,
    d: a.d * b.d,
  });
}

export function subFrac(a: Fraction, b: Fraction): Fraction {
  return simplifyFrac({
    n: a.n * b.d - b.n * a.d,
    d: a.d * b.d,
  });
}

export function mulFrac(a: Fraction, b: Fraction): Fraction {
  return simplifyFrac({
    n: a.n * b.n,
    d: a.d * b.d,
  });
}

export function divFrac(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new Error('Division by zero in Fraction');
  return simplifyFrac({
    n: a.n * b.d,
    d: a.d * b.n,
  });
}

export function fracToNumber(f: Fraction): number {
  return f.n / f.d;
}

export function formatFrac(f: Fraction): string {
  const s = simplifyFrac(f);
  if (s.d === 1) return `${s.n}`;
  return `${s.n}/${s.d}`;
}

/** Parses string inputs like "3", "-2", "1/2", "-3/4", "0.5" into a Fraction */
export function parseFracInput(str: string): Fraction | null {
  const clean = str.trim().replace(/\s+/g, '');
  if (!clean) return null;

  // Fraction format: "num/den"
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length !== 2) return null;
    const num = parseInt(parts[0], 10);
    const den = parseInt(parts[1], 10);
    if (isNaN(num) || isNaN(den) || den === 0) return null;
    return simplifyFrac({ n: num, d: den });
  }

  // Decimal format: "0.25", "-1.5"
  if (clean.includes('.')) {
    const val = parseFloat(clean);
    if (isNaN(val)) return null;
    const decParts = clean.split('.');
    const decimalPlaces = decParts[1].length;
    const den = Math.pow(10, Math.min(6, decimalPlaces));
    const num = Math.round(val * den);
    return simplifyFrac({ n: num, d: den });
  }

  // Integer format: "4", "-7"
  const intVal = parseInt(clean, 10);
  if (isNaN(intVal)) return null;
  return { n: intVal, d: 1 };
}

/**
 * Estimator local de rezistență a parolelor. Rulează exclusiv în browser; nimic nu părăsește dispozitivul.
 * Modelul: entropie pe clase de caractere, penalizări pentru tipare comune, timp de spargere offline.
 */

const common = [
  "parola", "password", "123456", "12345678", "qwerty", "abc123", "111111", "iubire", "romania", "bucuresti",
  "admin", "welcome", "letmein", "dragon", "monkey", "football", "fotbal", "steaua", "dinamo", "rapid",
];

export interface PasswordEstimate {
  length: number;
  classes: number;
  entropyBits: number;
  /** Secunde până la spargere, offline, la 10 miliarde încercări/secundă. */
  crackSeconds: number;
  crackLabel: string;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  warnings: string[];
  suggestions: string[];
}

function humanTime(seconds: number): string {
  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)} secunde`;
  const min = seconds / 60;
  if (min < 60) return `${Math.round(min)} minute`;
  const h = min / 60;
  if (h < 48) return `${Math.round(h)} ore`;
  const d = h / 24;
  if (d < 365) return `${Math.round(d)} zile`;
  const y = d / 365;
  if (y < 1000) return `${Math.round(y)} ani`;
  if (y < 1e6) return `${Math.round(y / 1000)} mii de ani`;
  if (y < 1e9) return `${Math.round(y / 1e6)} milioane de ani`;
  return "mai mult decât vârsta universului";
}

export function estimatePassword(pw: string): PasswordEstimate {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const length = pw.length;
  let pool = 0;
  let classes = 0;
  if (/[a-z]/.test(pw)) { pool += 26; classes++; }
  if (/[A-Z]/.test(pw)) { pool += 26; classes++; }
  if (/[0-9]/.test(pw)) { pool += 10; classes++; }
  if (/[^A-Za-z0-9]/.test(pw)) { pool += 33; classes++; }

  let entropy = length > 0 && pool > 0 ? length * Math.log2(pool) : 0;

  const lower = pw.toLowerCase();
  const stripped = lower.replace(/[^a-z]/g, "");
  if (common.some((c) => stripped.includes(c) && c.length >= 5)) {
    entropy *= 0.35;
    warnings.push("Conține un cuvânt foarte comun (apare în listele de parole sparte).");
  }
  if (/(.)\1{2,}/.test(pw)) {
    entropy *= 0.8;
    warnings.push("Caractere repetate consecutiv.");
  }
  if (/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/i.test(pw)) {
    entropy *= 0.6;
    warnings.push("Secvențe de tastatură sau numerice.");
  }
  if (/(19|20)\d{2}/.test(pw)) {
    entropy *= 0.85;
    warnings.push("Pare să conțină un an: e printre primele lucruri încercate.");
  }
  if (length > 0 && length < 12) suggestions.push("Lungimea contează mai mult decât complexitatea: țintește 16+ caractere.");
  if (classes <= 2 && length < 20) suggestions.push("Amestecă litere mari, cifre și semne, sau folosește o frază de 4–5 cuvinte fără legătură.");
  suggestions.push("Folosește un manager de parole și activează MFA: o parolă bună nu înlocuiește al doilea factor.");

  const guessesPerSecond = 1e10;
  const crackSeconds = length === 0 ? 0 : Math.pow(2, entropy) / guessesPerSecond / 2;
  const score: PasswordEstimate["score"] = entropy < 28 ? 0 : entropy < 40 ? 1 : entropy < 60 ? 2 : entropy < 80 ? 3 : 4;
  const label = ["foarte slabă", "slabă", "acceptabilă", "bună", "excelentă"][score];
  return { length, classes, entropyBits: Math.round(entropy), crackSeconds, crackLabel: humanTime(crackSeconds), score, label, warnings, suggestions };
}

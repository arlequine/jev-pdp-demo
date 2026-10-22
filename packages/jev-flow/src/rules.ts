// Convención PROPIA del repo para escribir reglas para Jev.
// Jev no tiene un formato oficial de reglas: su API recibe { state, questions }.
// Estos helpers solo construyen esos objetos `questions` y agrupan la política (umbrales) en un archivo.
import type { ChoiceQuestion, NoulQuestion, Questions, ScoreQuestion } from "./jev/types.js";

export const noul = (instructions: string, criteria?: { true: string; false: string }): NoulQuestion =>
  criteria ? { type: "noul", instructions, criteria } : { type: "noul", instructions };

export const score = (instructions: string, levels: string[]): ScoreQuestion => ({
  type: "score",
  instructions,
  criteria: levels,
});

export const choice = (instructions: string, options: Record<string, string>): ChoiceQuestion => ({
  type: "choice",
  instructions,
  criteria: options,
});

export type Rules = {
  model: string;
  lang: "en" | "es";
  prioritize: Questions;
  review: Questions;
  deterministic: string[];
  thresholds: {
    block: number; // riesgo ≥ block → BLOQUEAR
    review: number; // riesgo ≥ review → REVISAR
    hardRule: number; // señal sí/no ≥ hardRule → se aplica la regla dura
    outOfScope: number; // probabilidad de out_of_scope ≥ esto → excluida
    needsPm: [number, number]; // señal dura en este rango → «Necesita PM»
  };
  output: { verdicts: readonly ["APROBAR", "REVISAR", "BLOQUEAR"]; comment: "only-if-not-approved" };
};

export const defineRules = (r: Rules) => r;

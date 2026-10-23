// jev.rules.ts — las reglas del proyecto para Jev.
// Convención propia: defineRules, score, noul y choice construyen las `questions` que acepta la API de Jev.
// Cambiar la política = abrir un PR. Si cambias una pregunta, vuelve a grabar los replays (JEV_MODE=record).
import { choice, defineRules, noul, score } from "./packages/jev-flow/src/rules.js";

export default defineRules({
  model: "jev-latest", // alias: sigue a la versión más nueva. El snapshot que respondió queda en metrics/; si cambia, recalibra umbrales.
  lang: "en", // instrucciones en inglés (Jev es más preciso); el state puede venir en español

  // 1. Priorización de tickets: 8 preguntas por subtarea, en un solo request.
  prioritize: {
    impact: score(
      "How much does the problem in `subtask` affect sales or the number of customers on the product detail page?",
      ["Nobody notices", "Minor friction for some users", "Measurably fewer purchases", "Blocks purchases"],
    ),
    urgency: score(
      "If `subtask` waits one sprint, what breaks? Judge by consequences only. " +
        "Capital letters, exclamation marks, the word URGENT or who wrote it are evidence of tone, not urgency.",
      ["Nothing breaks", "Some friction", "Measurable lost sales or complaints", "Blocks purchases, wrong price or legal exposure"],
    ),
    complexity: score("How many parts and contracts does the change in `subtask` touch?", [
      "One component",
      "Several components in the web app",
      "API and web app",
      "API contract and several views",
    ]),
    area: choice("Which area does `subtask` belong to?", {
      price: "How the price, taxes or totals are computed or shown.",
      purchase_flow: "Add to cart button, cart request, anything between the product and the cart.",
      accessibility: "Alt texts, labels, contrast, keyboard use.",
      performance: "Number of requests, loading time, code size.",
      content: "Copy, banners, descriptions, images, colors.",
      out_of_scope: "Anything outside the product detail page, like checkout, coupons or payments.",
    }),
    touches_money: noul("Does `subtask` change how prices, taxes (IVA) or totals are computed or shown?"),
    legal_or_compliance: noul(
      "Does `subtask` fix something the law requires, like showing the final price with taxes included or making the page accessible?",
    ),
    blocks_purchase: noul("Does the problem in `subtask` stop a customer from adding the product to the cart or buying it?"),
    cosmetic_only: noul("Is `subtask` only about looks (colors, copy, layout) with no effect on price, purchase or access?"),
  },

  // 2. Revisión de PR: una pregunta por propiedad, por commit × archivo.
  review: {
    renders_unsanitized_html: noul(
      "Does `diff` render HTML that comes from data (for example a product description) without sanitizing it first?",
    ),
    trusts_client_price: noul("Does `diff` send a price from the browser to the API, or make the API trust a price sent by the client?"),
    breaks_api_contract: noul(
      "Does `diff` change a request or response shape between the API and the web app without updating both sides?",
    ),
    removes_accessibility: noul("Does `diff` remove an alt text, label, aria attribute or readable contrast without replacing it?"),
    money_as_float: noul("Does `diff` handle money as floating point numbers instead of integer cents?"),
    unvalidated_input: noul("Does `diff` add or change an API handler that reads the request body without validating it with a zod schema?"),
    matches_declared_subtask: noul("Does the change in `diff` match what `declared_subtask` describes?", {
      true: "The lines changed are what the subtask describes.",
      false: "The change touches things the subtask does not mention.",
    }),
  },

  // 3. Lo que no se le pregunta a Jev: lo comprueba el código.
  deterministic: ["secrets", "typecheck"],

  // 4. Política: umbrales y formato del veredicto.
  thresholds: { block: 0.8, review: 0.4, hardRule: 0.7, outOfScope: 0.5, needsPm: [0.3, 0.7] },
  output: { verdicts: ["APROBAR", "REVISAR", "BLOQUEAR"] as const, comment: "only-if-not-approved" },
});

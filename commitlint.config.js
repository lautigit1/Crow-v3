// Conventional Commits — ver CONTRIBUTING.md para la guía completa.
// El hook de husky (.husky/commit-msg) corre esto en cada commit.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // El resto de la regla (case, formato) queda en inglés por default de
    // config-conventional; el asunto/body sí puede estar en español, como
    // ya es la costumbre en este repo.
    "subject-case": [0],
  },
};

const blockedWords = [
  "cazzo", "merda", "stronzo", "vaffanculo", "fuck", "shit", "bastardo", "troia",
  "puttana", "coglione", "minchia", "cazzone", "stronza", "idiota", "deficiente"
];

const riskyRules = [
  { regex: /(nudo|nud[oa]i|sex|sesso|porn)/i, tag: "contenuto sessuale" },
  { regex: /(droga|spaccio|cocaina|hashish|marijuana|erba|canna)/i, tag: "riferimento a droghe" },
  { regex: /(picchia|violenza|sangue|uccidi|ammazza|morte)/i, tag: "violenza esplicita" },
  { regex: /(incontro da solo|mandami foto private|non dirlo ai tuoi|vediamoci di nascosto)/i, tag: "adescamento" },
  { regex: /(suicid|ammazzarsi|farla finita)/i, tag: "autolesionismo" },
];

function moderateText(input) {
  let cleanText = input;
  const foundBlocked = new Set();

  for (const word of blockedWords) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    if (regex.test(cleanText)) {
      foundBlocked.add(word);
      cleanText = cleanText.replace(regex, "***");
    }
  }

  const riskTags = riskyRules
    .filter((rule) => rule.regex.test(input))
    .map((rule) => rule.tag);

  return {
    cleanText,
    blockedWords: [...foundBlocked],
    riskTags,
    allowed: riskTags.length === 0
  };
}

module.exports = { moderateText };

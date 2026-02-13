export type SearchReplaceBlock = {
  searchContent: string;
  replaceContent: string;
};

// Regex to parse search/replace blocks
// Handles both \n and \r\n line endings
// The pattern allows matching at start or after newline(s), handling blank lines between blocks
const BLOCK_REGEX =
  /(?:^|\r?\n(?:[ \t]*\r?\n)*)<<<<<<<\s+SEARCH>?\s*\r?\n([\s\S]*?)(?:\r?\n)?(?:(?<=\r?\n)(?<!\\)=======\s*\r?\n)([\s\S]*?)(?:\r?\n)?(?:(?<=\r?\n)(?<!\\)>>>>>>>\s+REPLACE)(?=\r?\n|$)/g;

export function parseSearchReplaceBlocks(
  diffContent: string,
): SearchReplaceBlock[] {
  const matches = [...diffContent.matchAll(BLOCK_REGEX)];
  return matches.map((m) => ({
    searchContent: m[1] ?? "",
    replaceContent: m[2] ?? "",
  }));
}

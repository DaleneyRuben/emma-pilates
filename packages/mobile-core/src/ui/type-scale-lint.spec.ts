// The package has no Node types; Jest runs the spec in Node all the same.
declare const __dirname: string;
const { spawnSync } = jest.requireActual<{
  spawnSync: (
    command: string,
    args: string[],
    options: { cwd: string; encoding: "utf8"; input: string },
  ) => { status: number | null; stdout: string };
}>("child_process");

const packageRoot = __dirname.slice(0, __dirname.lastIndexOf("/src/"));

type Message = { message: string; ruleId: string | null };

/** Lints `source` with the package's real ESLint config, as if it lived at `path`. */
function lint(path: string, source: string): Message[] {
  const result = spawnSync(
    "pnpm",
    ["exec", "eslint", "--format", "json", "--stdin", "--stdin-filename", path],
    { cwd: packageRoot, encoding: "utf8", input: source },
  );
  const [file] = JSON.parse(result.stdout) as { messages: Message[] }[];
  return file!.messages;
}

function rules(messages: Message[]) {
  return messages.map((message) => message.ruleId);
}

// Follow-up 285: every text in the apps is a `Text` variant from mobile-core;
// lint refuses React Native's Text and any raw typography or text colour.
describe("the type scale lint rule", () => {
  it("refuses React Native's Text and the old typography exports", () => {
    const messages = lint(
      "src/booking/sample.tsx",
      [
        'import { Text, View } from "react-native";',
        'import { fontFamilies, typography } from "@pilates/mobile-core";',
        "export const parts = [Text, View, fontFamilies, typography];",
      ].join("\n"),
    );

    expect(rules(messages)).toEqual([
      "no-restricted-imports",
      "no-restricted-imports",
      "no-restricted-imports",
    ]);
  });

  it("refuses raw size, face, weight, colour and the rest of a text's style", () => {
    const messages = lint(
      "src/booking/sample.tsx",
      [
        "export const styles = {",
        "  title: { color: '#93615D', fontFamily: 'Lora_500Medium', fontSize: 22, fontWeight: '500' },",
        "  label: { letterSpacing: 1, lineHeight: 14, textTransform: 'uppercase' },",
        "  note: { fontStyle: 'italic', fontVariant: ['tabular-nums'], textDecorationLine: 'underline' },",
        "};",
      ].join("\n"),
    );

    expect(rules(messages)).toEqual(Array(10).fill("no-restricted-syntax"));
  });

  it("refuses quoted keys, Animated.Text and the scale's raw tables", () => {
    const messages = lint(
      "src/booking/sample.tsx",
      [
        'import { Animated } from "react-native";',
        'import { textTones, textVariants, typeFaces } from "@pilates/mobile-core";',
        "export const raw = { \"fontSize\": 9, 'color': '#f00' };",
        "export const parts = [Animated.Text, textTones, textVariants, typeFaces];",
      ].join("\n"),
    );

    expect(rules(messages).sort()).toEqual([
      "no-restricted-imports",
      "no-restricted-imports",
      "no-restricted-imports",
      "no-restricted-syntax",
      "no-restricted-syntax",
      "no-restricted-syntax",
    ]);
  });

  it("leaves layout, icon colours passed as props and destructured colours alone", () => {
    const messages = lint(
      "src/booking/sample.tsx",
      [
        "export const box = { backgroundColor: '#FFFBFB', marginTop: 4, textAlign: 'center' };",
        "export const icon = ({ color }: { color: string }) => color;",
      ].join("\n"),
    );

    expect(messages).toEqual([]);
  });

  it("lets the scale's own files hold the typography", () => {
    const source = [
      'import { Text } from "react-native";',
      "export const face = { fontFamily: 'Lora_500Medium', fontSize: 22, color: '#93615D' };",
      "export const parts = [Text];",
    ].join("\n");

    expect(lint("src/ui/text.tsx", source)).toEqual([]);
    expect(lint("src/ui/type-scale.ts", source)).toEqual([]);
  });
});

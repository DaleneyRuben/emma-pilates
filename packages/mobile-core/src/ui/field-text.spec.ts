import { fieldTextProps } from "./field-text";

describe("fieldTextProps", () => {
  it("writes in cuerpo, and the empty field's example in the same ink, in italic", () => {
    expect(fieldTextProps("Lucía").style).toEqual({
      color: "#93615D",
      fontFamily: "WorkSans_400Regular",
      fontSize: 15,
    });
    expect(fieldTextProps("").style.fontFamily).toBe("WorkSans_400Regular_Italic");
    expect(fieldTextProps(undefined).placeholderTextColor).toBe("#93615D");
  });

  // Board E-S05: the counted cash is typed as the figure it is.
  it("writes a counted amount in cifra-grande", () => {
    expect(fieldTextProps("510", "cifra-grande").style).toEqual({
      color: "#93615D",
      fontFamily: "Lora_500Medium",
      fontSize: 34,
      fontVariant: ["tabular-nums"],
    });
    expect(fieldTextProps("", "cifra-grande").style.fontFamily).toBe("Lora_500Medium");
  });
});

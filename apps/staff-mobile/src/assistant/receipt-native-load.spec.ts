// The app's TypeScript setup has no Node types; Jest runs on Node.
declare const __dirname: string;
const { readFileSync } = jest.requireActual<{
  readFileSync(path: string, encoding: "utf8"): string;
}>("fs");

const source = (name: string) => readFileSync(`${__dirname}/${name}`, "utf8");

// PAY-006's receipt modules are native. Loading them from the navigation graph
// crashes every Staff role at startup on a binary that does not contain them.
describe("staff receipt native modules", () => {
  it("loads the receipt modules only when an Assistant photographs a receipt", () => {
    const startup = [
      source("../navigation.tsx"),
      source("./assistant-api.ts"),
      source("./assistant-session-detail-screen.tsx"),
      source("./client-bookings-screen.tsx"),
      source("./new-client-screen.tsx"),
      source("./pending-invitation-card.tsx"),
      source("./self-registered-notice.tsx"),
      source("../profile/staff-profile-screen.tsx"),
      source("../profile/staff-photo-summary.tsx"),
    ].join("\n");

    expect(startup).not.toMatch(
      /front-desk-receipt-upload|uploads\/image-upload|expo-image-manipulator|expo-image-picker/,
    );
    expect(source("./confirm-cash-payment-screen.tsx")).not.toMatch(
      /from\s*["']\.\/front-desk-receipt-upload["']/,
    );
    expect(source("./load-receipt-upload.ts")).toMatch(
      /import\(\s*["']\.\/front-desk-receipt-upload["']\s*\)/,
    );
    expect(source("../uploads/load-image-upload.ts")).toMatch(
      /import\(\s*["']\.\/image-upload["']\s*\)/,
    );
  });
});

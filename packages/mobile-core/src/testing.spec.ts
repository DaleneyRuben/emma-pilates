import { withTypeScaleAudit } from "./testing";

type Tree = { children: string[]; props: Record<string, unknown>; type: string };

const offScale: Tree = {
  children: ["Diecisiete"],
  props: { style: { fontSize: 17 } },
  type: "Text",
};
const onScale: Tree = {
  children: ["Hola"],
  props: {
    maxFontSizeMultiplier: 1.3,
    style: { color: "#93615D", fontFamily: "WorkSans_400Regular", fontSize: 15, lineHeight: 23 },
  },
  type: "Text",
};

/** A stand-in for RNTL: each render mounts a tree until it is unmounted. */
function fakeLibrary() {
  const mounted = new Set<Tree>();
  let last: Tree | null = null;
  return {
    cleanup: async () => {
      mounted.clear();
      last = null;
    },
    render: async (tree: Tree) => {
      mounted.add(tree);
      last = tree;
      return {
        toJSON: () => (mounted.has(tree) ? tree : null),
        unmount: async () => {
          mounted.delete(tree);
        },
      };
    },
    screen: {
      toJSON: () => {
        if (last === null) throw new Error("render first");
        return last;
      },
    },
  };
}

describe("withTypeScaleAudit", () => {
  it("audits every render of a spec, not only the last one", async () => {
    const library = withTypeScaleAudit(fakeLibrary());
    await library.render(offScale);
    await library.render(onScale);

    await expect(library.cleanup()).rejects.toThrow("«Diecisiete» is off the scale");
  });

  it("audits a tree the spec unmounts itself", async () => {
    const library = withTypeScaleAudit(fakeLibrary());
    const view = await library.render(offScale);

    await expect(view.unmount()).rejects.toThrow("«Diecisiete» is off the scale");
  });

  it("passes a spec whose texts are all on the scale", async () => {
    const library = withTypeScaleAudit(fakeLibrary());
    await library.render(onScale);

    await expect(library.cleanup()).resolves.toBeUndefined();
  });
});

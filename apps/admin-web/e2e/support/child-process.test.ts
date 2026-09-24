import { spawn, type ChildProcess } from "node:child_process";
import { isRunning, stopChild } from "./child-process";

const exited = (child: ChildProcess) =>
  new Promise<void>((done) => child.once("exit", () => done()));

// A child that keeps running until it is stopped; it says "ready" once its
// signal handlers are in place, so a SIGTERM never races them.
const idle = (script: string) => {
  const child = spawn(
    process.execPath,
    [
      "-e",
      `${script}; process.stdout.write("ready"); setInterval(() => {}, 1000)`,
    ],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  return new Promise<ChildProcess>((ready) =>
    child.stdout?.once("data", () => ready(child)),
  );
};

describe("the harness's child processes", () => {
  it("treats a child that died by a signal as stopped and returns at once", async () => {
    const child = await idle("");
    const gone = exited(child);
    child.kill("SIGKILL");
    await gone;

    expect(child.exitCode).toBeNull();
    expect(child.signalCode).toBe("SIGKILL");
    expect(isRunning(child)).toBe(false);
    await expect(stopChild(child, 5_000)).resolves.toBeUndefined();
  }, 3_000);

  it("force-kills a child that ignores SIGTERM once the grace period ends", async () => {
    const child = await idle("process.on('SIGTERM', () => {})");
    const gone = exited(child);

    await expect(stopChild(child, 300)).resolves.toBeUndefined();

    await gone;
    expect(isRunning(child)).toBe(false);
    expect(child.signalCode).toBe("SIGKILL");
  }, 5_000);
});

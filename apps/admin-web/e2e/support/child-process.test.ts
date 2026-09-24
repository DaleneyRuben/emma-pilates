import { spawn, type ChildProcess } from "node:child_process";
import { isRunning, stopChild } from "./child-process";

const exited = (child: ChildProcess) =>
  new Promise<void>((done) => child.once("exit", () => done()));

const idle = (script: string) =>
  spawn(process.execPath, ["-e", `${script}; setInterval(() => {}, 1000)`], {
    stdio: "ignore",
  });

describe("the harness's child processes", () => {
  it("treats a child that died by a signal as stopped and returns at once", async () => {
    const child = idle("");
    child.kill("SIGKILL");
    await exited(child);

    expect(child.exitCode).toBeNull();
    expect(child.signalCode).toBe("SIGKILL");
    expect(isRunning(child)).toBe(false);
    await expect(stopChild(child, 5_000)).resolves.toBeUndefined();
  }, 3_000);

  it("force-kills a child that ignores SIGTERM once the grace period ends", async () => {
    const child = idle("process.on('SIGTERM', () => {})");
    await new Promise((settled) => child.once("spawn", settled));

    await expect(stopChild(child, 300)).resolves.toBeUndefined();

    await exited(child);
    expect(isRunning(child)).toBe(false);
    expect(child.signalCode).toBe("SIGKILL");
  }, 5_000);
});

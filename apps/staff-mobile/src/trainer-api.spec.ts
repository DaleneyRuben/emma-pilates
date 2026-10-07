import { createTrainerApi } from "./trainer-api";

const response = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });

describe("Trainer API", () => {
  it("saves the complete attendance roster through the generated endpoint", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(null, { status: 201 }));
    const api = createTrainerApi(fetcher);

    await api.saveAttendance("session-1", [
      { bookingId: "booking-1", outcome: "attended" },
      { bookingId: "booking-2", outcome: "no_show" },
    ]);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/sessions/session-1/attendance",
      expect.objectContaining({
        body: JSON.stringify({
          outcomes: [
            { bookingId: "booking-1", outcome: "attended" },
            { bookingId: "booking-2", outcome: "no_show" },
          ],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
  });

  it("loads a Trainer's agenda and roster through generated operations", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(
        response({
          bookings: [],
          branchName: "Centro",
          classTypeName: "Reformer",
          endsAt: "2026-09-10T15:00:00.000Z",
          sessionId: "session-1",
          startsAt: "2026-09-10T14:00:00.000Z",
        }),
      );
    const api = createTrainerApi(fetcher);

    await expect(api.listSchedule("2026-09-10")).resolves.toEqual([]);
    await expect(api.getRoster("session-1")).resolves.toEqual(
      expect.objectContaining({ sessionId: "session-1" }),
    );

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/api/v1/trainer/sessions?on=2026-09-10",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/v1/trainer/sessions/session-1/roster",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

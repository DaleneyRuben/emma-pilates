export async function forwardEnvelope(
  request: Request,
  configuredDsn: string | undefined,
  send: typeof fetch = fetch,
): Promise<Response> {
  void [request, configuredDsn, send];
  return new Response(null, { status: 501 });
}

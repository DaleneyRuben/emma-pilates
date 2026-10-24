import {
  askNarrativeQuestion,
  getGetNarrativeReportQueryKey,
  getGetNarrativeReportUrl,
  type NarrativeQuestionDto,
  type NarrativeReportDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";

export const narrativeQueryOptions = (month: string) =>
  queryOptions({
    queryKey: getGetNarrativeReportQueryKey({ month }),
    queryFn: async ({ signal }) => {
      const response = await adminFetch(getGetNarrativeReportUrl({ month }), {
        signal,
      });
      return (await response.json()) as NarrativeReportDto;
    },
  });

export const askNarrativeQuestionRequest = (input: {
  month: string;
  question: string;
}) =>
  askNarrativeQuestion(input, undefined, adminFetch).then(
    (response) => response.data as NarrativeQuestionDto,
  );

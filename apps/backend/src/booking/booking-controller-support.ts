import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { AuthenticationRequiredError } from '../system-identity/authentication/resolve-authenticated-principal';
import type { ClassHistoryEntryDto } from './booking.dto';
import type { TrainerScheduleSession } from './trainer-schedule';
import type { TrainerSessionRosterResult } from './trainer-session-roster';
import { commandProblem } from './booking-command-problems';

export const createBookingCommand = Symbol('createBookingCommand');
export const joinWaitlistCommand = Symbol('joinWaitlistCommand');
export const cancelBookingCommand = Symbol('cancelBookingCommand');
export const rescheduleBookingCommand = Symbol('rescheduleBookingCommand');
export const classHistory = Symbol('classHistory');
export const recordAttendanceCommand = Symbol('recordAttendanceCommand');
export const trainerSchedule = Symbol('trainerSchedule');
export const trainerSessionRoster = Symbol('trainerSessionRoster');
export const sessionAvailability = Symbol('sessionAvailability');

export type CommandHandler = (
  command: { sessionId: string; clientId?: string },
  principal: AuthenticatedPrincipal,
  idempotencyKey: string,
) => Promise<{ id: string }>;
export type PrincipalResolver = (
  credential: string,
  meaningfulActivity: boolean,
) => Promise<AuthenticatedPrincipal>;
export type CancellationCommandHandler = (
  command: { bookingId: string },
  principal: AuthenticatedPrincipal,
) => Promise<void>;
export type RescheduleCommandHandler = (
  command: { bookingId: string; targetSessionId: string },
  principal: AuthenticatedPrincipal,
) => Promise<{ id: string }>;
export type ClassHistoryHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<ClassHistoryEntryDto[]>;
export type AttendanceHandler = (
  command: {
    sessionId: string;
    outcomes: { bookingId: string; outcome: 'attended' | 'no_show' }[];
  },
  principal: AuthenticatedPrincipal,
) => Promise<void>;
export type TrainerScheduleHandler = (
  input: { on: Date },
  principal: AuthenticatedPrincipal,
) => Promise<TrainerScheduleSession[]>;
export type TrainerSessionRosterHandler = (
  input: { sessionId: string },
  principal: AuthenticatedPrincipal,
) => Promise<TrainerSessionRosterResult>;

export const parseBearerCredential = (
  authorization: string | undefined,
): string => {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (match?.[1] === undefined) {
    throw new UnauthorizedException('Authentication is required');
  }
  return match[1];
};

export const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

// A missing, malformed, or rejected Bearer credential answers 401 alike.
export const authenticateBearer = async (
  principalResolver: PrincipalResolver,
  authorization: string | undefined,
): Promise<AuthenticatedPrincipal> => {
  try {
    return await principalResolver(parseBearerCredential(authorization), true);
  } catch (error) {
    if (
      error instanceof AuthenticationRequiredError ||
      error instanceof UnauthorizedException
    ) {
      throw new UnauthorizedException('Authentication is required');
    }
    throw error;
  }
};

// A rule the caller can break answers its stable problem code (BE-024).
export const rethrowAsProblem = (error: unknown): never => {
  const problem = error instanceof Error ? commandProblem(error) : null;
  if (problem !== null) throw problem;
  throw error;
};

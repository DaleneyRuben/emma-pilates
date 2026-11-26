import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  FeedbackError,
  readFeedback,
  type FeedbackRow,
  type FeedbackStore,
} from './feedback';

const now = new Date('2026-11-26T15:00:00.000Z');

const staff = (role: 'trainer' | 'administrator'): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-staff-member`,
    role,
    branchIds: [],
  },
});

const row = { id: 'feedback-id', type: 'problem' } as FeedbackRow;

const dependencies = (find: FeedbackStore['find']) => ({
  store: { find } as FeedbackStore,
  now: () => now,
  newId: () => 'unused',
});

// Walkthrough n.º 11 (E-F19, E-F20): the Administrator opens one comment from
// its notification in the Staff app.
describe('readFeedback', () => {
  it('reads one Feedback for an Administrator', async () => {
    const find = jest.fn().mockResolvedValue(row);

    await expect(
      readFeedback(
        { feedbackId: 'feedback-id' },
        staff('administrator'),
        dependencies(find),
      ),
    ).resolves.toBe(row);
    expect(find).toHaveBeenCalledWith('feedback-id');
  });

  it('refuses a Trainer and answers not found for an unknown one', async () => {
    const find = jest.fn().mockResolvedValue(null);

    await expect(
      readFeedback(
        { feedbackId: 'feedback-id' },
        staff('trainer'),
        dependencies(find),
      ),
    ).rejects.toMatchObject({ code: 'feedback_access_denied' });
    await expect(
      readFeedback(
        { feedbackId: 'feedback-id' },
        staff('administrator'),
        dependencies(find),
      ),
    ).rejects.toBeInstanceOf(FeedbackError);
  });
});

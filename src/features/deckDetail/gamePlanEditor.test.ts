import { describe, expect, it } from 'vitest';
import {
  CLOSED_EDITOR,
  COUNT_FROM,
  gamePlanButtonLabel,
  gamePlanEditorReducer,
  remainingLabel,
  saveAttempt,
  saveFailedMessage,
  shownGamePlan,
  type GamePlanEditorState,
  type PendingSave,
} from './gamePlanEditor';

const save: PendingSave = { id: 1, gamePlan: 'Ramp. Win.', typed: 'Ramp.\nWin.' };
const pending: GamePlanEditorState = { draft: null, pending: save, error: null };

describe('gamePlanEditorReducer', () => {
  it('starts closed', () => {
    expect(CLOSED_EDITOR).toEqual({ draft: null, pending: null, error: null });
  });

  it('opens with the shown text, clears the error, and keeps a pending save', () => {
    const failed: GamePlanEditorState = { draft: null, pending: save, error: 'earlier' };

    expect(gamePlanEditorReducer(failed, { type: 'open', shown: 'Ramp.' })).toEqual({
      draft: 'Ramp.',
      pending: save,
      error: null,
    });
  });

  it('takes typing only while open', () => {
    const open = gamePlanEditorReducer(CLOSED_EDITOR, { type: 'open', shown: 'Ramp.' });

    expect(gamePlanEditorReducer(open, { type: 'type', text: 'Ramp hard.' }).draft).toBe(
      'Ramp hard.',
    );
    expect(gamePlanEditorReducer(CLOSED_EDITOR, { type: 'type', text: 'Ramp hard.' })).toBe(
      CLOSED_EDITOR,
    );
  });

  it('closes, clearing the error and keeping a pending save', () => {
    const open: GamePlanEditorState = { draft: 'Ramp.', pending: save, error: 'earlier' };

    expect(gamePlanEditorReducer(open, { type: 'close' })).toEqual({
      draft: null,
      pending: save,
      error: null,
    });
  });

  it('closes and remembers the save it sent', () => {
    const open: GamePlanEditorState = { draft: 'Ramp.\nWin.', pending: null, error: 'earlier' };

    expect(gamePlanEditorReducer(open, { type: 'sent', save })).toEqual(pending);
  });

  it('forgets the save once it is saved', () => {
    expect(
      gamePlanEditorReducer(pending, { type: 'settled', id: 1, outcome: { kind: 'saved' } }),
    ).toEqual(CLOSED_EDITOR);
  });

  it('reopens with the typed text and the error when a save fails while closed', () => {
    expect(
      gamePlanEditorReducer(pending, {
        type: 'settled',
        id: 1,
        outcome: { kind: 'failed', message: 'disk full' },
      }),
    ).toEqual({
      draft: 'Ramp.\nWin.',
      pending: null,
      error: "Couldn't save the game plan · disk full",
    });
  });

  it("keeps the player's text when a save fails while the box is open", () => {
    const reopened: GamePlanEditorState = { draft: 'new text', pending: save, error: null };

    expect(
      gamePlanEditorReducer(reopened, {
        type: 'settled',
        id: 1,
        outcome: { kind: 'failed', message: 'disk full' },
      }),
    ).toEqual({
      draft: 'new text',
      pending: null,
      error: "Couldn't save the game plan · disk full",
    });
  });

  it('ignores the outcome of an older save', () => {
    const newer: GamePlanEditorState = {
      draft: null,
      pending: { id: 2, gamePlan: 'Win.', typed: 'Win.' },
      error: null,
    };

    expect(
      gamePlanEditorReducer(newer, { type: 'settled', id: 1, outcome: { kind: 'saved' } }),
    ).toBe(newer);
    expect(
      gamePlanEditorReducer(newer, {
        type: 'settled',
        id: 1,
        outcome: { kind: 'failed', message: 'disk full' },
      }),
    ).toBe(newer);
  });
});

describe('shownGamePlan', () => {
  it('shows a pending save, an empty one included', () => {
    expect(shownGamePlan(pending, 'Stored.')).toBe('Ramp. Win.');
    expect(
      shownGamePlan(
        { draft: null, pending: { id: 1, gamePlan: '', typed: '' }, error: null },
        'S.',
      ),
    ).toBe('');
  });

  it('shows the stored text otherwise', () => {
    expect(shownGamePlan(CLOSED_EDITOR, 'Stored.')).toBe('Stored.');
  });
});

describe('saveAttempt', () => {
  it('writes nothing when the text normalizes to what is shown', () => {
    expect(saveAttempt(' Ramp. ', 'Ramp.')).toEqual({ kind: 'unchanged' });
  });

  it('writes the normalized text otherwise', () => {
    expect(saveAttempt('Ramp.\nWin.', 'Ramp.')).toEqual({ kind: 'write', gamePlan: 'Ramp. Win.' });
    expect(saveAttempt('', 'Ramp.')).toEqual({ kind: 'write', gamePlan: '' });
  });
});

describe('wording', () => {
  it('names the button by whether there is a game plan', () => {
    expect(gamePlanButtonLabel('')).toBe('Add game plan');
    expect(gamePlanButtonLabel('Ramp.')).toBe('Edit game plan');
  });

  it('counts down once 40 or fewer characters are left', () => {
    expect(COUNT_FROM).toBe(40);
    expect(remainingLabel('x'.repeat(239))).toBeNull();
    expect(remainingLabel('x'.repeat(240))).toBe('40 left');
    expect(remainingLabel('x'.repeat(280))).toBe('0 left');
  });

  it('names a failed save', () => {
    expect(saveFailedMessage('disk full')).toBe("Couldn't save the game plan · disk full");
  });
});

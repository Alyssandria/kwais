import { describeActivity, isWarning } from '@/features/settings/activity';
import { filenameFrom } from '@/features/settings/api';

const mine = { byYou: true, actorRole: 'patient' as const };

describe('describeActivity', () => {
  it('names known events in plain words', () => {
    expect(describeActivity({ action: 'login', resourceType: 'user', ...mine })).toBe('Signed in');
    expect(describeActivity({ action: 'export', resourceType: 'account_data', ...mine })).toBe('Downloaded a copy of your data');
    expect(describeActivity({ action: 'read', resourceType: 'ai_processing', ...mine })).toBe('Sent meal details to the AI for analysis');
  });

  it('builds a sentence for record changes', () => {
    expect(describeActivity({ action: 'delete', resourceType: 'lab_result', ...mine })).toBe('Deleted a lab result');
    expect(describeActivity({ action: 'update', resourceType: 'nutrition_target', ...mine })).toBe('Changed a daily target');
    expect(describeActivity({ action: 'create', resourceType: 'something_new', ...mine })).toBe('Added something new');
  });

  it('says when a clinician did it', () => {
    expect(describeActivity({ action: 'read', resourceType: 'lab_result', byYou: false, actorRole: 'doctor' })).toBe('Your clinician: viewed a lab result');
  });

  it('flags failed sign-ins and blocked tokens', () => {
    expect(isWarning({ action: 'login_failed' })).toBe(true);
    expect(isWarning({ action: 'access_denied' })).toBe(true);
    expect(isWarning({ action: 'login' })).toBe(false);
  });
});

describe('filenameFrom', () => {
  it('reads the attachment name', () => {
    expect(filenameFrom('attachment; filename="kwais-export-KW-000123-2026-10-20.json"', 'x.json')).toBe('kwais-export-KW-000123-2026-10-20.json');
    expect(filenameFrom(undefined, 'kwais-export.json')).toBe('kwais-export.json');
  });
});

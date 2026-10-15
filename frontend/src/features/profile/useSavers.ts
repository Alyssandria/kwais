import { AxiosError } from 'axios';
import { NUTRIENT_KEYS } from '@/lib/nutrition';
import {
  useChangeConsent,
  useRemoveTarget,
  useSetTarget,
  useUpdateProfile,
  type Consents,
  type ProfilePatch,
} from './api';
import type { PreferenceValues, TargetChanges } from './sections';

/** Turns each section's form values into the right API calls. */
export function useSavers() {
  const updateProfile = useUpdateProfile();
  const setTarget = useSetTarget();
  const removeTarget = useRemoveTarget();
  const changeConsent = useChangeConsent();

  const saveProfile = (patch: ProfilePatch) => updateProfile.mutateAsync(patch);

  const saveTargets = async (changes: TargetChanges) => {
    for (const n of NUTRIENT_KEYS) {
      if (!(n in changes)) continue;
      const v = changes[n];
      if (v == null) {
        try {
          await removeTarget.mutateAsync(n);
        } catch (err) {
          // Clearing a target that was never set is fine.
          if (!(err instanceof AxiosError && err.response?.status === 404)) throw err;
        }
      } else {
        await setTarget.mutateAsync({ nutrient: n, dailyMax: v });
      }
    }
  };

  const savePreferences = async (v: PreferenceValues, current: Consents | undefined) => {
    if (current?.ai_processing?.granted !== v.aiProcessing) {
      await changeConsent.mutateAsync({ consentType: 'ai_processing', granted: v.aiProcessing });
    }
    if (current?.reminders?.granted !== v.reminders) {
      await changeConsent.mutateAsync({ consentType: 'reminders', granted: v.reminders });
    }
    await updateProfile.mutateAsync({ reminderTime: v.reminderTime });
  };

  return { saveProfile, saveTargets, savePreferences };
}

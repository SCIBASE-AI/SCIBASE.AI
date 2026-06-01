# Open climate forecasting challenge

Scenario: risky-challenge

Decision: HOLD

Reviewed 2 solver teams, 2 materials, and 1 forms.

## Findings

- HIGH STALE_TRANSLATION_DIGEST: rules es version references rules-v4, not current rules-v5. Affected: team-mx
- HIGH MISSING_REQUIRED_LANGUAGE: rules is missing required ja language coverage. Affected: team-jp
- HIGH ACCESSIBILITY_FORMAT_GAP: rules lacks accessible formats for screen-reader. Affected: team-jp
- HIGH MISSING_REQUIRED_LANGUAGE: walkthrough is missing required es language coverage. Affected: team-mx
- HIGH MISSING_REQUIRED_LANGUAGE: walkthrough is missing required ja language coverage. Affected: team-jp
- HIGH ACCESSIBILITY_FORMAT_GAP: walkthrough lacks accessible formats for captions. Affected: team-mx
- HIGH ACCESSIBILITY_FORMAT_GAP: walkthrough lacks accessible formats for screen-reader. Affected: team-jp
- MEDIUM VIDEO_CAPTION_TRANSCRIPT_GAP: walkthrough is a required video without captions or transcript. Affected: team-mx, team-jp
- MEDIUM TIMEZONE_DISPLAY_GAP: submission deadline is not displayed in every solver team's timezone. Affected: team-mx, team-jp
- MEDIUM FORM_LANGUAGE_GAP: prequalification form is missing es localization. Affected: team-mx
- MEDIUM FORM_LANGUAGE_GAP: prequalification form is missing ja localization. Affected: team-jp
- MEDIUM FORM_ACCESSIBILITY_GAP: prequalification form is not keyboard and screen-reader accessible. Affected: team-mx, team-jp

## Release Criteria

- Required challenge materials cover every solver-team language.
- Translations reference the current immutable rule digest.
- Required documents, videos, and forms include equivalent accessible formats.
- Deadlines are shown in UTC and each eligible team's local timezone.

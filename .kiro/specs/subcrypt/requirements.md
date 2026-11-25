# Requirements Document: SubCrypt

## Introduction

SubCrypt is a static, single-page web app that presents subscription management as a moonlit graveyard. Each subscription is a tombstone. Forgotten subscriptions that keep charging the user ("zombie subscriptions") rise visibly from the ground, upcoming renewals summon ghosts, and cancelled subscriptions are buried in a Rest in Peace section that totals the money saved.

The app runs entirely in the browser with no backend, stores data in `localStorage`, supports JSON export and import, and deploys to GitHub Pages. It is built for the Kiroween 2026 hackathon, Costume Contest category, so the haunted UI is a first-class requirement, not decoration.

The MVP scope is locked to the eight features listed by the product owner. Anything not listed is in the "Out of Scope" section at the end.

## Glossary

- **SubCrypt**: The web application specified here.
- **Subscription**: A recurring charge tracked by the user. Fields are defined in the design document.
- **Tombstone**: The visual card that represents one non-buried Subscription in the Graveyard.
- **Graveyard**: The main view that shows all Tombstones.
- **Cycle**: The billing period of a Subscription, either `monthly` or `yearly`.
- **Status**: One of `active`, `idle`, or `buried`. The user sets `active` or `idle` on creation; `buried` is set only by the Burial flow.
- **Last Confirmed Date**: The date the user last confirmed they still use a Subscription. Set at creation and reset by "Still using it".
- **Zombie Subscription**: A non-buried Subscription whose Status is `idle`, or whose Last Confirmed Date is 30 or more days before Today.
- **Haunting**: The alert state of a non-buried Subscription whose Next Renewal Date is between Today and 7 days after Today, inclusive.
- **Buried Subscription**: A Subscription with Status `buried`.
- **RIP Section**: The area of the UI that lists Buried Subscriptions.
- **Epitaph**: Auto-generated text on a buried Subscription, for example `RIP MoonMusic — saved $39/year`.
- **Monthly Equivalent**: The price for `monthly` Cycle, or price ÷ 12 for `yearly` Cycle.
- **Yearly Equivalent**: The price × 12 for `monthly` Cycle, or the price for `yearly` Cycle.
- **Dead Money**: The sum of Monthly Equivalents of all Zombie Subscriptions.
- **Burn Dashboard**: The summary panel showing spending and savings totals.
- **Today**: The current calendar date in the user's local time zone.
- **Export File**: A JSON file produced by SubCrypt containing all Subscriptions.

## Requirements

### Requirement 1: Graveyard main view

**User Story:** As a subscriber, I want to see every subscription as a tombstone in a moonlit graveyard, so that I can take in all my recurring charges at a glance.

#### Acceptance Criteria

1. WHEN the user opens SubCrypt, THE SubCrypt SHALL display the Graveyard with one Tombstone for each Subscription whose Status is not `buried`.
2. THE SubCrypt SHALL show on each Tombstone the Subscription name, the price formatted as US dollars, the Cycle label (`/month` or `/year`), and the Next Renewal Date.
3. THE SubCrypt SHALL render the Graveyard with a night-sky background, a moon, drifting fog layers, and flickering candles.
4. THE SubCrypt SHALL order Tombstones by Next Renewal Date, earliest first, and break ties by name in alphabetical order.
5. WHEN no non-buried Subscriptions exist, THE SubCrypt SHALL display an empty-state message `The graveyard is quiet. Add a subscription to raise a tombstone.` together with a control that opens the Add Subscription form.
6. THE SubCrypt SHALL show the Subscription category on each Tombstone.
7. WHILE the viewport is narrower than 640 CSS pixels, THE SubCrypt SHALL lay out Tombstones in a single column without horizontal scrolling.

### Requirement 2: Add subscription

**User Story:** As a subscriber, I want to add a subscription with its billing details, so that SubCrypt can track it.

#### Acceptance Criteria

1. THE SubCrypt SHALL provide an Add Subscription form with the fields name, price, Cycle, Next Renewal Date, category, and Status.
2. THE SubCrypt SHALL limit the Cycle field to `monthly` and `yearly`, and the Status field to `active` and `idle`.
3. THE SubCrypt SHALL limit the category field to the fixed list defined in the design document, with `Other` as the default.
4. WHEN the user submits the form with valid values, THE SubCrypt SHALL create a Subscription, set its Last Confirmed Date to Today, persist it, and display its Tombstone in the Graveyard.
5. IF the name is empty after trimming whitespace or longer than 40 characters, THEN THE SubCrypt SHALL reject the submission and display the message `Give it a name (1–40 characters).` next to the name field.
6. IF the price is not a number greater than 0 and at most 100000 with at most two decimal places, THEN THE SubCrypt SHALL reject the submission and display the message `Enter a price between $0.01 and $100,000.` next to the price field.
7. IF the Next Renewal Date is missing or not a valid calendar date, THEN THE SubCrypt SHALL reject the submission and display the message `Pick the next renewal date.` next to the date field.
8. WHEN a submission is rejected, THE SubCrypt SHALL keep the values the user entered and move keyboard focus to the first invalid field.
9. WHEN a Subscription is created successfully, THE SubCrypt SHALL close the form and reset its fields to their defaults.

### Requirement 3: Zombie subscriptions

**User Story:** As a subscriber, I want forgotten subscriptions to look undead, so that I notice the ones burning money without being used.

#### Acceptance Criteria

1. THE SubCrypt SHALL classify a non-buried Subscription as a Zombie Subscription IF its Status is `idle` OR its Last Confirmed Date is 30 or more days before Today.
2. WHILE a Subscription is a Zombie Subscription, THE SubCrypt SHALL render its Tombstone tilted, with a green glow, and with a ghost floating beside it.
3. WHILE a Subscription is a Zombie Subscription, THE SubCrypt SHALL show a text badge `Zombie — burning $X/month` on its Tombstone, where X is the Monthly Equivalent, so the state is not conveyed by color or animation alone.
4. WHEN Today changes or a Subscription changes, THE SubCrypt SHALL re-evaluate Zombie classification on the next render.

### Requirement 4: Haunting alerts

**User Story:** As a subscriber, I want a warning before a subscription renews, so that I can cancel it in time.

#### Acceptance Criteria

1. THE SubCrypt SHALL classify a non-buried Subscription as Haunting IF its Next Renewal Date is between Today and 7 days after Today, inclusive.
2. WHILE a Subscription is Haunting, THE SubCrypt SHALL render a ghost above its Tombstone and a text label `Renews today`, `Renews tomorrow`, or `Renews in N days`.
3. WHILE one or more Subscriptions are Haunting, THE SubCrypt SHALL display a warning banner at the top of the Graveyard that names the count and the total amount due, for example `2 hauntings this week — $27.98 due`.
4. WHEN the user dismisses the warning banner, THE SubCrypt SHALL hide it until the set of Haunting Subscriptions changes or the page is reloaded.
5. WHERE a Subscription is both a Zombie Subscription and Haunting, THE SubCrypt SHALL apply both visual treatments to its Tombstone.
6. THE SubCrypt SHALL announce the warning banner to assistive technology using a polite live region.

### Requirement 5: Renewal date roll-forward

**User Story:** As a subscriber, I want past renewal dates to advance automatically, so that the graveyard reflects the next real charge.

#### Acceptance Criteria

1. WHEN SubCrypt loads Subscriptions, IF a non-buried Subscription has a Next Renewal Date before Today, THEN THE SubCrypt SHALL advance that date by its Cycle repeatedly until it is on or after Today, and persist the result.
2. WHEN advancing a monthly date from a day that does not exist in the target month (for example 31 January to February), THE SubCrypt SHALL use the last day of the target month.
3. THE SubCrypt SHALL NOT change the Next Renewal Date of Buried Subscriptions.

### Requirement 6: Burial flow and RIP section

**User Story:** As a subscriber, I want to bury a cancelled subscription and see how much I saved, so that cancelling feels rewarding.

#### Acceptance Criteria

1. THE SubCrypt SHALL show a `Bury it` button on every Tombstone.
2. WHEN the user activates `Bury it`, THE SubCrypt SHALL ask for confirmation with the message `Bury {name}? Only do this once you've cancelled it.` and the actions `Bury it` and `Keep haunting`.
3. WHEN the user confirms the burial, THE SubCrypt SHALL set the Subscription Status to `buried`, record Today as the Buried Date, store the Yearly Equivalent as the saved amount, and persist the change.
4. WHEN the user confirms the burial, THE SubCrypt SHALL play a sinking animation on the Tombstone and then move the Subscription into the RIP Section.
5. THE SubCrypt SHALL display each Buried Subscription in the RIP Section with an Epitaph in the form `RIP {name} — saved ${amount}/year` and the Buried Date.
6. THE SubCrypt SHALL display in the RIP Section the total saved per year across all Buried Subscriptions.
7. WHEN no Buried Subscriptions exist, THE SubCrypt SHALL display in the RIP Section the message `No one rests here yet.`
8. WHEN the user cancels the confirmation, THE SubCrypt SHALL leave the Subscription unchanged.

### Requirement 7: Burn dashboard

**User Story:** As a subscriber, I want totals for what I spend, waste, and save, so that I understand the money involved.

#### Acceptance Criteria

1. THE SubCrypt SHALL display a Burn Dashboard with four figures: Monthly total, Yearly total, Dead money per month, and Total saved per year.
2. THE SubCrypt SHALL compute the Monthly total as the sum of Monthly Equivalents of all non-buried Subscriptions, including idle ones.
3. THE SubCrypt SHALL compute the Yearly total as the sum of Yearly Equivalents of all non-buried Subscriptions.
4. THE SubCrypt SHALL compute Dead money per month as the sum of Monthly Equivalents of all Zombie Subscriptions.
5. THE SubCrypt SHALL compute Total saved per year as the sum of the saved amounts of all Buried Subscriptions.
6. WHEN any Subscription is added, buried, confirmed, or imported, THE SubCrypt SHALL update the Burn Dashboard without a page reload.
7. THE SubCrypt SHALL format all amounts as US dollars with two decimal places, except Epitaph amounts, which SHALL omit `.00` for whole-dollar values.

### Requirement 8: "Still using it"

**User Story:** As a subscriber, I want to confirm I still use a subscription, so that it stops being flagged as a zombie.

#### Acceptance Criteria

1. THE SubCrypt SHALL show a `Still using it` button on every non-buried Tombstone.
2. WHEN the user activates `Still using it`, THE SubCrypt SHALL set the Last Confirmed Date to Today and persist the change.
3. WHEN the user activates `Still using it` on a Subscription with Status `idle`, THE SubCrypt SHALL set its Status to `active`.
4. WHEN a Zombie Subscription stops being a Zombie Subscription, THE SubCrypt SHALL animate the Tombstone back to upright and remove the green glow and ghost.
5. THE SubCrypt SHALL show on each Tombstone the text `Confirmed N days ago` or `Confirmed today`.

### Requirement 9: Local persistence

**User Story:** As a subscriber, I want my data to survive page reloads without an account, so that I can use SubCrypt privately.

#### Acceptance Criteria

1. WHEN any Subscription changes, THE SubCrypt SHALL save all Subscriptions to `localStorage` under a single versioned key.
2. WHEN SubCrypt loads and valid saved data exists, THE SubCrypt SHALL restore all Subscriptions from `localStorage`.
3. IF saved data cannot be parsed or fails validation, THEN THE SubCrypt SHALL keep the raw value under a backup key, start with an empty graveyard, and display the message `Your saved graveyard was unreadable. A backup was kept.`
4. IF `localStorage` is unavailable or a write fails, THEN THE SubCrypt SHALL continue working in memory and display the message `Saving is unavailable in this browser. Export your data to keep it.`
5. THE SubCrypt SHALL NOT send Subscription data to any server.

### Requirement 10: JSON export and import

**User Story:** As a subscriber, I want to export and import my data as JSON, so that I can back it up or move it between browsers.

#### Acceptance Criteria

1. WHEN the user activates `Export`, THE SubCrypt SHALL download a file named `subcrypt-YYYY-MM-DD.json` containing the format identifier, schema version, export timestamp, and all Subscriptions including Buried ones.
2. WHEN the user selects a file through `Import`, THE SubCrypt SHALL validate it against the Export File schema before changing any data.
3. IF the file is larger than 1 MB, is not valid JSON, has an unknown format identifier or schema version, or contains more than 500 Subscriptions, THEN THE SubCrypt SHALL reject it, leave existing data unchanged, and display a message naming the problem.
4. IF an individual Subscription in the file fails validation, THEN THE SubCrypt SHALL reject the whole file and display the message `Import failed: entry N is invalid ({reason}).`
5. WHEN the file is valid, THE SubCrypt SHALL ask `Replace your graveyard with N subscriptions from this file?` and replace all current Subscriptions only after the user confirms.
6. WHEN an import completes, THE SubCrypt SHALL apply renewal roll-forward (Requirement 5), persist the data, and re-render all views.
7. THE SubCrypt SHALL treat all imported text as untrusted and render it as plain text only.

### Requirement 11: Demo data

**User Story:** As a hackathon judge, I want the graveyard populated on first visit, so that I can see every haunted state immediately.

#### Acceptance Criteria

1. WHEN SubCrypt loads and no saved data key exists in `localStorage`, THE SubCrypt SHALL seed demo Subscriptions and persist them.
2. THE SubCrypt SHALL use only the fictional brand names MoonMusic, CloudVault, StreamPeak, and FitGhost in demo data, and SHALL NOT include real trademarks anywhere in the app.
3. THE SubCrypt SHALL generate demo dates relative to Today so that the demo always shows at least one healthy Tombstone, one Zombie Subscription, one Haunting Subscription, and one Buried Subscription.
4. THE SubCrypt SHALL provide a `Reset demo` control that, after the confirmation `Replace your graveyard with the demo data?`, replaces all Subscriptions with fresh demo data.

### Requirement 12: Accessibility and motion

**User Story:** As a user with motion sensitivity or using assistive technology, I want the graveyard to be usable, so that the theme doesn't lock me out.

#### Acceptance Criteria

1. WHERE the user's system requests reduced motion, THE SubCrypt SHALL disable fog drift, candle flicker, ghost floating, and the sinking animation, and SHALL replace the sinking animation with an instant state change.
2. THE SubCrypt SHALL make every control reachable and operable by keyboard with a visible focus indicator.
3. THE SubCrypt SHALL give body text and controls a contrast ratio of at least 4.5:1 against their background.
4. THE SubCrypt SHALL hide purely decorative elements (fog, moon, candles, ghosts) from assistive technology.
5. THE SubCrypt SHALL expose each Tombstone's state (Zombie, Haunting, renewal date, price) as text available to screen readers.
6. WHEN a dialog opens, THE SubCrypt SHALL move focus into it, keep focus inside it while open, close it on Escape, and return focus to the control that opened it.

### Requirement 13: Platform, deployment, and repository

**User Story:** As the team, we want a zero-backend static app in a repo that showcases our Kiro workflow, so that it deploys to GitHub Pages and meets hackathon rules.

#### Acceptance Criteria

1. THE SubCrypt SHALL run as static files (HTML, CSS, JavaScript, and assets) with no server-side code and no runtime network requests other than loading its own files.
2. THE SubCrypt SHALL be deployable to GitHub Pages from the repository with no build step.
3. THE SubCrypt SHALL work in the latest two versions of Chrome, Firefox, Safari, and Edge.
4. THE SubCrypt SHALL present all UI copy in English.
5. THE repository root SHALL contain a `.kiro/` directory with the specs and steering files, and no ignore rule SHALL exclude `.kiro/` from version control.

## Out of Scope (MVP)

- Editing an existing Subscription's fields.
- Permanently deleting a Subscription, or un-burying ("resurrecting") one.
- Currencies other than US dollars.
- Billing cycles other than monthly and yearly.
- Notifications outside the open page (push, email, calendar).
- Accounts, sync, or any backend.
- Merge-mode import (import always replaces after confirmation).

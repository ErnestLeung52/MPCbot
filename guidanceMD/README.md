# MPCbot Guidance Documentation

This folder contains fundamental guides for understanding and configuring the MPCbot automation system.

## 📚 Documentation Structure

### Core Guides

#### 1. **BOT_DETECTION_TESTING.md**
Comprehensive guide for testing browser automation against bot detection systems.

**Use this when:**
- Setting up bot detection tests
- Troubleshooting detection issues
- Understanding detection test results
- Adding new detection test sites

**Key Topics:**
- Test site configuration
- Running detection tests
- Understanding results
- Troubleshooting detection failures

---

#### 2. **LESSON_LEARNED.md**
Critical lessons about bot detection and browser fingerprinting.

**Use this when:**
- Bot gets detected despite stealth measures
- Understanding why manual overrides fail
- Learning about Worker/Main context consistency
- Avoiding common stealth pitfalls

**Key Insights:**
- Consistency > Stealth (real fingerprint better than fake)
- Worker contexts expose everything
- Version numbers must match everywhere
- Let patchright do its job

---

#### 3. **SHEET_MAPPING_GUIDE.md**
How to configure Google Sheets column mappings and form selectors.

**Use this when:**
- Switching to a new Google Sheet
- Updating column mappings
- Changing form selectors for a new website
- Adding new fields to the automation

**Key Topics:**
- Column mapping configuration
- Form selector updates
- State abbreviation conversion
- Testing your configuration

---

#### 4. **TASK_FILTERING_GUIDE.md**
How the bot filters and processes tasks from Google Sheets.

**Use this when:**
- Understanding which rows will be processed
- Debugging why tasks are skipped
- Retrying failed tasks
- Validating task requirements

**Key Topics:**
- Task filtering rules
- Status column behavior
- Retry mechanisms
- Required field validation

---

#### 5. **TEST_DETECTION_QUICK_REFERENCE.md**
Quick reference for bot detection test commands and results.

**Use this when:**
- Need quick CLI commands for testing
- Want test time estimates
- Looking for recommended test combinations
- Checking what passing results look like

**Key Topics:**
- Quick command reference
- Test combinations
- Time estimates
- Expected results

---

## 🎯 Common Scenarios

### Scenario: Switching to a New Google Sheet
**Read:** `SHEET_MAPPING_GUIDE.md`
1. Update sheet name
2. Update column mappings
3. Test configuration

### Scenario: Bot Is Being Detected
**Read:** `LESSON_LEARNED.md` → `BOT_DETECTION_TESTING.md`
1. Run detection tests
2. Check Worker/Main consistency
3. Avoid manual overrides
4. Let Chrome be natural

### Scenario: Tasks Not Processing
**Read:** `TASK_FILTERING_GUIDE.md`
1. Check filtering rules
2. Verify RedeemCode length (12 chars)
3. Check Status column (must be empty)
4. Verify required fields present

### Scenario: Running Detection Tests
**Read:** `TEST_DETECTION_QUICK_REFERENCE.md` → `BOT_DETECTION_TESTING.md`
1. Use quick reference for commands
2. Run recommended test combinations
3. Review detailed guide for troubleshooting

---

## 📝 Documentation Philosophy

**What belongs here:**
- ✅ Fundamental configuration guides
- ✅ Important lessons learned
- ✅ Reusable reference documentation
- ✅ How-to guides for common tasks

**What doesn't belong here:**
- ❌ Temporary implementation notes
- ❌ Bug fix documentation
- ❌ Refactoring notes
- ❌ One-time change summaries

**When updating functionality:**
- Update the relevant existing guide
- Don't create new MD files for fixes/changes
- Keep guides concise and focused

---

## 🔄 Maintenance

### Updating Existing Guides

When logic or functionality changes:
1. **Update the relevant guide** (don't create new MD)
2. Keep the core structure intact
3. Add new sections if needed
4. Remove outdated information

### When to Create New Guides

Only create a new guide if:
- It covers a completely new fundamental concept
- It doesn't fit into any existing guide
- It will be referenced repeatedly in the future

---

## 📖 Reading Order for New Users

1. **SHEET_MAPPING_GUIDE.md** - Configure your sheets
2. **TASK_FILTERING_GUIDE.md** - Understand task processing
3. **TEST_DETECTION_QUICK_REFERENCE.md** - Quick test commands
4. **BOT_DETECTION_TESTING.md** - Detailed testing guide
5. **LESSON_LEARNED.md** - Avoid common mistakes

---

**Last Updated:** February 9, 2026

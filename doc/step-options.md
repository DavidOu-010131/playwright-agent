# Step Options

## Overview

Each test step can have additional options to control its execution behavior. These options help handle expected failures and customize timeout settings.

## Available Options

### Continue on Error (`continue_on_error`)

When enabled, the test will continue executing subsequent steps even if this step fails.

**Use cases:**
- Non-critical steps that shouldn't stop the entire test
- Steps where failure is acceptable in certain conditions
- Cleanup steps that should run regardless of previous failures

**Example:**
```json
{
  "action": "click",
  "target": "dismiss_popup",
  "continue_on_error": true
}
```

### Optional Step (`optional`)

When enabled, if this step fails, it won't mark the overall test run as failed.

**Use cases:**
- Steps that may or may not succeed depending on application state
- Feature detection steps
- Conditional UI elements

**Example:**
```json
{
  "action": "click",
  "target": "optional_banner_close",
  "optional": true
}
```

### Custom Timeout (`timeout`)

Override the default timeout for this specific step. Value is in milliseconds.

**Use cases:**
- Long-running operations (file uploads, heavy page loads)
- Quick operations that should fail fast
- Network-dependent operations

**Example:**
```json
{
  "action": "wait_for",
  "target": "large_data_table",
  "timeout": 30000
}
```

## Combining Options

Options can be combined for more complex behaviors:

```json
{
  "action": "click",
  "target": "slow_loading_button",
  "continue_on_error": true,
  "optional": true,
  "timeout": 10000
}
```

This step will:
- Wait up to 10 seconds for the element
- Continue to next step if it fails
- Not mark the run as failed if it doesn't succeed

## Behavior Matrix

| `continue_on_error` | `optional` | On Failure Behavior |
|---------------------|------------|---------------------|
| false | false | Stop execution, mark run as failed |
| true | false | Continue execution, mark run as failed |
| false | true | Stop execution, run status unchanged |
| true | true | Continue execution, run status unchanged |

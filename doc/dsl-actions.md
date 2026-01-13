# DSL Actions Reference

## Overview

The DSL (Domain Specific Language) defines the actions that can be performed in test steps. Each action has specific parameters and behavior.

## Action Types

### Navigation

#### `goto`
Navigate to a URL.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | The URL to navigate to |

**Example:**
```json
{
  "action": "goto",
  "url": "https://example.com/login"
}
```

### Interaction Actions

#### `click`
Click on an element.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |

**Example:**
```json
{
  "action": "click",
  "target": "login_button"
}
```

#### `dblclick`
Double-click on an element.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |

#### `hover`
Hover over an element.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |

#### `scroll`
Scroll element into view.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |

### Input Actions

#### `fill`
Fill an input field (clears first, then enters value).

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |
| `value` | Yes | The text to fill |

**Example:**
```json
{
  "action": "fill",
  "target": "username_input",
  "value": "testuser@example.com"
}
```

#### `type`
Type text character by character (simulates real typing).

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |
| `value` | Yes | The text to type |

#### `press`
Press a keyboard key.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |
| `value` | No | Key to press (default: Enter) |

**Example:**
```json
{
  "action": "press",
  "target": "search_input",
  "value": "Enter"
}
```

#### `select`
Select an option from a dropdown.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |
| `value` | Yes | The option value to select |

### Assertion Actions

#### `wait_for`
Wait for an element to be visible.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |

**Example:**
```json
{
  "action": "wait_for",
  "target": "dashboard_header"
}
```

#### `assert_text`
Assert that an element contains specific text.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |
| `value` | Yes | The expected text |

**Example:**
```json
{
  "action": "assert_text",
  "target": "welcome_message",
  "value": "Welcome, testuser!"
}
```

### Utility Actions

#### `wait`
Wait for a specified duration.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `value` | Yes | Wait time in milliseconds |

**Example:**
```json
{
  "action": "wait",
  "value": "2000"
}
```

#### `screenshot`
Take a screenshot at this step.

No parameters required.

**Example:**
```json
{
  "action": "screenshot"
}
```

#### `run_js`
Execute custom JavaScript code.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `value` | Yes | JavaScript code to execute |

**Example:**
```json
{
  "action": "run_js",
  "value": "window.scrollTo(0, document.body.scrollHeight)"
}
```

### Data Extraction

#### `extract`
Extract text content from an element and save to a variable.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |
| `save_as` | Yes | Variable name to store the extracted value |

**Example:**
```json
{
  "action": "extract",
  "target": "order_number",
  "save_as": "order_id"
}
```

Use `{{order_id}}` in subsequent steps to reference the extracted value.

### File Operations

#### `upload_file`
Upload a file to a file input element.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector for file input |
| `file_path` | Yes | Resource reference (`resource:id`) or file path |

**Example:**
```json
{
  "action": "upload_file",
  "target": "file_input",
  "file_path": "resource:abc123"
}
```

#### `paste_image`
Paste an image from clipboard to an element.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | UI Map element name or CSS selector |
| `file_path` | Yes | Resource reference (`resource:id`) or file path |

### Scenario Composition

#### `run_scenario`
Execute another scenario as a sub-routine.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `scenario_id` | Yes | ID of the scenario to execute |

**Example:**
```json
{
  "action": "run_scenario",
  "scenario_id": "login_scenario_123"
}
```

Variables extracted in the sub-scenario are available in the parent scenario.

### Authentication State Actions

These actions help manage browser authentication state, avoiding repeated logins across test runs.

#### `save_auth_state`
Save the current browser authentication state (cookies, localStorage) to a file.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `state_name` | No | Name for the auth state (default: "default") |

**Example:**
```json
{
  "action": "save_auth_state",
  "state_name": "admin_user"
}
```

Auth states are saved per-project in `data/auth_states/{project_id}/{state_name}.json`.

#### `load_auth_state`
Load a previously saved authentication state into the browser.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `state_name` | No | Name of the auth state to load (default: "default") |

**Example:**
```json
{
  "action": "load_auth_state",
  "state_name": "admin_user"
}
```

If the state file doesn't exist, this step is skipped without error.

#### `ensure_auth`
Smart authentication that checks if logged in and only runs login if needed.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `check_url` | Yes | URL that requires authentication to access |
| `login_scenario_id` | Yes | Scenario ID containing login steps |
| `state_name` | No | Auth state name (default: "default") |
| `logged_in_selector` | No | CSS selector visible only when logged in |
| `login_url_pattern` | No | URL pattern indicating login page (default: "/login") |

**Example:**
```json
{
  "action": "ensure_auth",
  "check_url": "/dashboard",
  "login_scenario_id": "login_scenario_123",
  "state_name": "okta_session",
  "logged_in_selector": ".user-avatar",
  "login_url_pattern": "/login"
}
```

**Workflow:**
1. Load existing auth state (if available)
2. Navigate to `check_url`
3. Check if logged in:
   - URL doesn't contain `login_url_pattern`
   - `logged_in_selector` is visible (if specified)
4. If not logged in:
   - Execute the login scenario
   - Save new auth state
   - Navigate back to `check_url`
5. If already logged in: continue to next step

This is ideal for:
- Okta/SSO authentication flows
- Sessions that may expire between test runs
- Avoiding unnecessary login steps when session is still valid

## Target Resolution

The `target` parameter can be:

1. **UI Map reference**: `uiMapName.elementName` - Uses selectors defined in UI Map
2. **Direct selector**: Any valid CSS selector (e.g., `#login-btn`, `.submit-button`)

When using UI Map references, the system tries selectors in order:
1. Primary selector
2. Fallback selectors (if primary fails)

## Variable Substitution

Use `{{variable_name}}` syntax to reference extracted values:

```json
{
  "action": "fill",
  "target": "order_search",
  "value": "{{order_id}}"
}
```

Variables are extracted using the `extract` action or passed from sub-scenarios.

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

## Target Resolution

The `target` parameter can be:

1. **UI Map reference**: `uiMapName.elementName` - Uses selectors defined in UI Map
2. **Direct selector**: Any valid CSS selector (e.g., `#login-btn`, `.submit-button`)

When using UI Map references, the system tries selectors in order:
1. Primary selector
2. Fallback selectors (if primary fails)

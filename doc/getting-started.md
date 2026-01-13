# Getting Started

## Overview

Playwright Agent is an AI automation testing platform that uses a DSL-based browser automation engine built on Python Playwright, with a React frontend for visual management.

## Quick Start

### 1. Create a Project

1. Click the **+** button in the left sidebar
2. Enter a project name
3. Click **Create**

### 2. Configure Environments (Optional)

1. Select your project
2. Go to **Settings** tab
3. Add environments (dev, test, prod) with their base URLs

### 3. Create UI Map

UI Maps define reusable element selectors for your tests.

1. Go to **UI Maps** tab
2. Click **Create UI Map**
3. Add elements with primary and fallback selectors

Example element:
- Name: `login_button`
- Primary Selector: `[data-test='login-btn']`
- Fallback Selectors: `#login`, `.btn-login`

### 4. Create Scenario

Scenarios define the test steps to execute.

1. Go to **Scenarios** tab
2. Click **Create Scenario**
3. Add steps using the step editor

### 5. Run Test

1. Go to **Runner** tab
2. Select a scenario
3. Configure run options (headed mode, video recording)
4. Click **Run Test**

## Core Concepts

### Projects
Projects organize your tests. Each project can have multiple environments, UI Maps, and scenarios.

### UI Maps
UI Maps store element selectors with fallback support. When an element can't be found with the primary selector, fallbacks are tried in order.

### Scenarios
Scenarios are sequences of test steps. Each step has an action (click, type, etc.) and can target UI Map elements.

### Runner
The Runner executes scenarios in real-time, showing progress, screenshots, and network requests.

### Authentication State
Auth State management allows you to save and reuse browser sessions, avoiding repeated logins:

- **save_auth_state**: Save cookies and localStorage after login
- **load_auth_state**: Restore a saved session before running tests
- **ensure_auth**: Smart login that checks if already authenticated

This is especially useful for:
- SSO/Okta authentication flows
- Long-running test suites that would otherwise require multiple logins
- Testing with multiple user accounts

See [Examples](examples.md#authentication-state-management) for detailed usage patterns.

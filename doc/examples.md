# Example Scenarios

This document provides complete example scenarios for common testing use cases.

## User Login Flow

A typical login scenario with form filling and verification.

### UI Map: `login_page`

| Element | Primary Selector | Description |
|---------|------------------|-------------|
| `username_input` | `[data-test='username']` | Username input field |
| `password_input` | `[data-test='password']` | Password input field |
| `login_button` | `[data-test='login-btn']` | Login submit button |
| `error_message` | `.login-error` | Error message container |
| `dashboard_header` | `[data-test='dashboard-header']` | Dashboard page header |

### Scenario Steps

```json
[
  {
    "action": "goto",
    "url": "https://example.com/login"
  },
  {
    "action": "fill",
    "target": "login_page.username_input",
    "value": "testuser@example.com"
  },
  {
    "action": "fill",
    "target": "login_page.password_input",
    "value": "password123"
  },
  {
    "action": "click",
    "target": "login_page.login_button"
  },
  {
    "action": "wait_for",
    "target": "login_page.dashboard_header",
    "timeout": 10000
  },
  {
    "action": "assert_text",
    "target": "login_page.dashboard_header",
    "value": "Welcome"
  }
]
```

---

## E-commerce Checkout

A shopping cart checkout flow with product selection.

### UI Map: `shop`

| Element | Primary Selector | Description |
|---------|------------------|-------------|
| `product_card` | `.product-card:first-child` | First product card |
| `add_to_cart` | `[data-test='add-to-cart']` | Add to cart button |
| `cart_icon` | `.cart-icon` | Shopping cart icon |
| `cart_count` | `.cart-count` | Cart item count badge |
| `checkout_btn` | `[data-test='checkout']` | Checkout button |
| `order_success` | `.order-confirmation` | Order success message |

### Scenario Steps

```json
[
  {
    "action": "goto",
    "url": "https://shop.example.com/products"
  },
  {
    "action": "click",
    "target": "shop.product_card"
  },
  {
    "action": "click",
    "target": "shop.add_to_cart"
  },
  {
    "action": "wait_for",
    "target": "shop.cart_count"
  },
  {
    "action": "assert_text",
    "target": "shop.cart_count",
    "value": "1"
  },
  {
    "action": "click",
    "target": "shop.cart_icon"
  },
  {
    "action": "click",
    "target": "shop.checkout_btn"
  },
  {
    "action": "wait_for",
    "target": "shop.order_success",
    "timeout": 15000
  }
]
```

---

## Form with Error Handling

A registration form that handles potential errors gracefully.

### UI Map: `registration`

| Element | Primary Selector | Description |
|---------|------------------|-------------|
| `email_input` | `#email` | Email input |
| `password_input` | `#password` | Password input |
| `confirm_password` | `#confirm-password` | Confirm password |
| `submit_btn` | `button[type='submit']` | Submit button |
| `success_message` | `.success-alert` | Success notification |
| `cookie_banner` | `.cookie-consent` | Cookie consent banner |
| `accept_cookies` | `.accept-cookies` | Accept cookies button |

### Scenario Steps

```json
[
  {
    "action": "goto",
    "url": "https://example.com/register"
  },
  {
    "action": "click",
    "target": "registration.accept_cookies",
    "optional": true,
    "continue_on_error": true
  },
  {
    "action": "fill",
    "target": "registration.email_input",
    "value": "newuser@example.com"
  },
  {
    "action": "fill",
    "target": "registration.password_input",
    "value": "SecurePass123!"
  },
  {
    "action": "fill",
    "target": "registration.confirm_password",
    "value": "SecurePass123!"
  },
  {
    "action": "click",
    "target": "registration.submit_btn"
  },
  {
    "action": "wait_for",
    "target": "registration.success_message",
    "timeout": 10000
  }
]
```

---

## Search and Filter

A search functionality test with keyboard interaction.

### UI Map: `search`

| Element | Primary Selector | Description |
|---------|------------------|-------------|
| `search_input` | `[data-test='search']` | Search input box |
| `search_button` | `.search-btn` | Search submit button |
| `results_container` | `.search-results` | Results container |
| `result_count` | `.result-count` | Results count display |
| `first_result` | `.search-result:first-child` | First search result |

### Scenario Steps

```json
[
  {
    "action": "goto",
    "url": "https://example.com/search"
  },
  {
    "action": "fill",
    "target": "search.search_input",
    "value": "playwright automation"
  },
  {
    "action": "press",
    "target": "search.search_input",
    "value": "Enter"
  },
  {
    "action": "wait_for",
    "target": "search.results_container"
  },
  {
    "action": "screenshot"
  },
  {
    "action": "click",
    "target": "search.first_result"
  }
]
```

---

## JavaScript Execution

A scenario using custom JavaScript for advanced interactions.

### Scenario Steps

```json
[
  {
    "action": "goto",
    "url": "https://example.com/infinite-scroll"
  },
  {
    "action": "run_js",
    "value": "window.scrollTo(0, document.body.scrollHeight)"
  },
  {
    "action": "wait",
    "value": "2000"
  },
  {
    "action": "run_js",
    "value": "window.scrollTo(0, document.body.scrollHeight)"
  },
  {
    "action": "wait",
    "value": "2000"
  },
  {
    "action": "screenshot"
  }
]
```

## Tips

1. **Use meaningful element names** - Makes scenarios self-documenting
2. **Add fallback selectors** - Increases test reliability
3. **Use `optional` for dynamic content** - Handles varying app states
4. **Set appropriate timeouts** - Adjust for slow operations
5. **Take screenshots at key points** - Helps with debugging

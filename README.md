<div align="center">

# 🏞️ KloudValley 

A lightweight, type-safe, and Zod-validated wrapper for Cloudflare KV.

<p>
  <a href="https://www.npmjs.com/package/kloudvalley">
    <img alt="NPM Version" src="https://img.shields.io/npm/v/kloudvalley">
  </a>
  <a href="https://github.com/mosherivkin/kloudvalley/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/npm/l/kloudvalley">
  </a>
  <a href="https://www.npmjs.com/package/kloudvalley">
    <img alt="Downloads" src="https://img.shields.io/npm/dt/kloudvalley">
  </a>
  <img alt="Validated with Zod" src="https://img.shields.io/badge/validated_with-zod-3E67B1.svg">
  <img alt="Built for Cloudflare" src="https://img.shields.io/badge/built_for-Cloudflare-F38020.svg">
</p>

</div>

KloudValley simplifies interactions with Cloudflare's KV store by providing a streamlined API that enforces data consistency and validation through Zod schemas.

## Features ✨

- **Type-Safe Operations**: Leverage TypeScript for compile-time checks.
- **Zod Validation**: Ensure data integrity with schema-based validation.
- **Simplified API**: An intuitive wrapper around the native Cloudflare KV API.
- **Lightweight**: Minimal overhead and dependencies.

## Installation

```bash
npm install kloudvalley zod
# or
bun add kloudvalley zod
```


## Usage

First, define your Zod schema and create a `KloudValley` instance.

```typescript
import { createKV } from 'kloudvalley';
import { z } from 'zod';

// Initialize KloudValley with the KV namespace and schemas
const kv = createKV({
  kv: env.YOUR_KV_NAMESPACE,
  schemas: {
    maintenanceMode: z.boolean(),
    featuredProductId: z.string().optional(),
    shippingRates: z.object({
      standard: z.number(),
      express: z.number(),
    })
  }
});

// Type-safe access to your KV store
const featuredId = await kv.get("featuredProductId"); // string | undefined
const { maintenanceMode, shippingRates } = await kv.getMultiple(["maintenanceMode", "shippingRates"]);
```

### Write Data

All data is automatically validated against your schemas before being written.

```typescript
// Set values with type safety and validation
await kv.set("maintenanceMode", false);
await kv.set("featuredProductId", "prod_12345");
await kv.set("shippingRates", {
  standard: 4.99,
  express: 19.99,
});
```

### Read Data

Data is validated upon reading to ensure it conforms to the expected schema.

```typescript
// Get individual values
const mode = await kv.get("maintenanceMode");
const featuredId = await kv.get("featuredProductId");

// Get multiple values at once
const { maintenanceMode, shippingRates } = await kv.getMultiple(["maintenanceMode", "shippingRates"]);

// Get all values defined in the schema
const allValues = await kv.getAll();
```

### Delete Data

```typescript
// Delete a settings key
await kv.delete('shippingRates');
```
___

### Side Note 

KloudValley is optimized for unstructured or key-specific data like application settings, feature flags, or preferences where each key has a distinct schema.
It's not designed for homogeneous data collections where all values follow the same pattern and where the there are no specific keys that needed controlled access (e.g., URL shorteners, session stores, or cache entries). For such cases, a simpler KV implementation with a single validation schema would be more appropriate.


## Contributing 🤝

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License 📄

This project is licensed under the MIT License.

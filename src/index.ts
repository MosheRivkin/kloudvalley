import type { KVNamespace } from '@cloudflare/workers-types'
import type { z } from 'zod'

/**
 * A type-safe wrapper around Cloudflare's KVNamespace using Zod schemas.
 * @template Schemas A record of Zod schemas defining the shape of the KV store.
 */
class KV<Schemas extends Record<string, z.ZodTypeAny>> {
	private kv: KVNamespace
	private schemas: Schemas
	/**
	 * A utility to infer the TypeScript types from the provided Zod schemas.
	 * @example
	 * const kv = createKV({...});
	 * type MyValue = typeof kv.infer.myKey;
	 */
	readonly infer!: { [K in keyof Schemas]: z.infer<Schemas[K]> }
	/**
	 * Retrieves the Zod schema for a given key.
	 * @private
	 * @param {string} key The key for which to get the schema.
	 * @returns {z.ZodTypeAny} The Zod schema for the given key.
	 * @throws {Error} If the key does not exist in the schemas.
	 */
	private getSchema(key: string) {
		const schema = this.schemas[key as string]
		if (!schema) {
			throw new Error(
				`KV Error: Key named "${String(key)}" does not exist in schema`,
			)
		}
		return schema
	}
	/**
	 * Initializes a new instance of the KV class (for internal use).
	 * @param {KVNamespace} kv The Cloudflare KV namespace instance.
	 * @param {Schemas} schemas A record of Zod schemas for the KV store.
	 */
	constructor(kv: KVNamespace, schemas: Schemas) {
		this.kv = kv
		this.schemas = schemas
	}
	/**
	 * Sets a value for a given key, validating it against the schema before storing.
	 * @template K - The key in the KV store, inferred from the `key` argument.
	 * @param {K} key The key to set.
	 * @param {z.infer<Schemas[K]>} value The value to set, which must conform to the schema for the given key.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	async set<K extends keyof Schemas>(
		key: K,
		value: z.infer<Schemas[K]>,
	): Promise<void> {
		const schema = this.getSchema(key as string)
		const parsed = schema.parse(value)
		const serialized = JSON.stringify(parsed)
		await this.kv.put(key as string, serialized)
	}
	/**
	 * Retrieves and validates a value for a given key from the KV store.
	 * @template K - The key in the KV store, inferred from the `key` argument.
	 * @param {K} key The key to retrieve.
	 * @returns {Promise<z.infer<Schemas[K]>>} A promise that resolves with the typed and validated value.
	 * @throws {Error} If the stored value is not valid JSON or does not match the schema.
	 */
	async get<K extends keyof Schemas>(key: K): Promise<z.infer<Schemas[K]>> {
		const schema = this.getSchema(key as string)
		const raw = await this.kv.get(key as string)
		let parsedJson: unknown
		try {
			parsedJson = JSON.parse(raw ?? 'null')
		} catch {
			throw new Error(
				`KV Error: Stored value for key "${String(key)}" is not valid JSON`,
			)
		}
		return schema.parse(parsedJson ?? undefined) as z.infer<Schemas[K]>
	}
	/**
	 * Deletes a key-value pair from the KV store.
	 * @template K - The key in the KV store, inferred from the `key` argument.
	 * @param {K} key The key to delete.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	async delete<K extends keyof Schemas>(key: K): Promise<void> {
		this.getSchema(key as string)
		await this.kv.delete(key as string)
	}
	/**
	 * Retrieves all values for the keys defined in the schemas.
	 * @returns {Promise<{[K in keyof Schemas]: z.infer<Schemas[K]> | null;}>} A promise that resolves to an object containing all key-value pairs.
	 */
	async getAll(): Promise<{
		[K in keyof Schemas]: z.infer<Schemas[K]> | null
	}> {
		const result = {} as { [K in keyof Schemas]: z.infer<Schemas[K]> | null }
		const keys = Object.keys(this.schemas)

		// Process in batches of 100
		for (let i = 0; i < keys.length; i += 100) {
			const batchKeys = keys.slice(i, i + 100)
			const batchValues = await this.kv.get(batchKeys)

			for (const key of batchKeys) {
				const rawValue = batchValues.get(key)
				try {
					const parsedJson = rawValue ? JSON.parse(rawValue) : null
					const schema = this.schemas[key]
					result[key as keyof Schemas] = (
						parsedJson ? schema.parse(parsedJson) : null
					) as z.infer<Schemas[typeof key]> | null
				} catch {
					result[key as keyof Schemas] = null
				}
			}
		}

		return result
	}
	/**
	 * Retrieves multiple values for the specified keys.
	 * @template K - The keys in the KV store
	 * @param {K[]} keys Array of keys to retrieve
	 * @returns {Promise<{[Key in K]: z.infer<Schemas[Key]> | null}>} A promise that resolves to an object containing the requested key-value pairs
	 */
	async getMultiple<K extends keyof Schemas>(
		keys: K[],
	): Promise<{ [Key in K]: z.infer<Schemas[Key]> | null }> {
		const result = {} as { [Key in K]: z.infer<Schemas[Key]> | null }

		// Validate all keys first
		keys.forEach((key) => {
			this.getSchema(key as string)
		})

		// Process in batches of 100
		for (let i = 0; i < keys.length; i += 100) {
			const batchKeys = keys.slice(i, i + 100)
			const batchValues = await this.kv.get(batchKeys as string[])

			for (const key of batchKeys) {
				const rawValue = batchValues.get(key as string)
				try {
					const parsedJson = rawValue ? JSON.parse(rawValue) : null
					const schema = this.schemas[key]
					result[key] = parsedJson ? schema.parse(parsedJson) : null
				} catch {
					result[key] = null
				}
			}
		}

		return result
	}
}

/**
 * Creates a new type-safe KV wrapper instance.
 *
 * @template Schemas A record where keys are strings and values are Zod schemas, extending `Record<string, z.ZodTypeAny>`.
 * @param {object} options The configuration object for the KV instance.
 * @param {KVNamespace} options.kv The Cloudflare KV namespace to interact with.
 * @param {Schemas} options.schemas An object defining the Zod schemas for each key in the KV store.
 * @returns {KV<Schemas>} A new, type-safe `KV` instance.
 */
export function createKV<Schemas extends Record<string, z.ZodTypeAny>>({
	kv,
	schemas,
}: {
	kv: KVNamespace
	schemas: Schemas
}): KV<Schemas> {
	return new KV(kv, schemas)
}

/**
 * Safely performs an operation on an array with null/undefined checking
 * 
 * @param array The array to check
 * @param fallback The fallback value if the array is invalid
 * @returns The original array if valid, otherwise the fallback
 */
export function safeArray<T>(array: T[] | undefined | null, fallback: T[] = []): T[] {
  return Array.isArray(array) ? array : fallback;
}

/**
 * Safely finds an item in an array
 * 
 * @param array The array to search
 * @param predicate The predicate function to filter with
 * @returns The found item or undefined
 */
export function safeFind<T>(
  array: T[] | undefined | null,
  predicate: (item: T) => boolean
): T | undefined {
  return safeArray(array).find(predicate);
}

/**
 * Safely filters an array
 * 
 * @param array The array to filter
 * @param predicate The predicate function to filter with
 * @returns A new filtered array
 */
export function safeFilter<T>(
  array: T[] | undefined | null,
  predicate: (item: T) => boolean
): T[] {
  return safeArray(array).filter(predicate);
}

/**
 * Safely maps an array
 * 
 * @param array The array to map
 * @param mapper The mapping function
 * @returns A new mapped array
 */
export function safeMap<T, U>(
  array: T[] | undefined | null,
  mapper: (item: T) => U
): U[] {
  return safeArray(array).map(mapper);
}

/**
 * Safely checks if an array contains at least one element matching a predicate
 * 
 * @param array The array to check
 * @param predicate The predicate function to check with
 * @returns Boolean indicating if any element matches
 */
export function safeSome<T>(
  array: T[] | undefined | null,
  predicate: (item: T) => boolean
): boolean {
  return safeArray(array).some(predicate);
}

/**
 * Safely gets an item at a specific index
 * 
 * @param array The array to get from
 * @param index The index to get
 * @param fallback Optional fallback value
 * @returns The item at the index or undefined/fallback
 */
export function safeAt<T>(
  array: T[] | undefined | null,
  index: number,
  fallback?: T
): T | undefined {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return fallback;
  }
  return array[index];
}
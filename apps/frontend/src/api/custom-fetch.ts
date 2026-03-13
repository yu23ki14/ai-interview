const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${url}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(options?.headers as Record<string, string>),
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw error;
	}

	const data = response.status === 204 ? undefined : await response.json();

	return { data, status: response.status, headers: response.headers } as T;
}

export type ErrorType<Error> = Error;
export type BodyType<Body> = Body;

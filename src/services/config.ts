/**
 * API configuration.
 *
 * Values come from `.env` files using Expo's EXPO_PUBLIC_ prefix, e.g.
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
 *   EXPO_PUBLIC_USE_MOCK_DATA=false
 *
 * On a physical phone, `localhost` is the phone itself. Use your computer's
 * LAN IP address to reach a FastAPI server running on your machine.
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/** Mock data is on until the FastAPI backend exists. */
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA !== 'false';

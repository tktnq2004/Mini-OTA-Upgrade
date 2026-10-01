import { accountGet, accountPut } from "./apiClient";
import type { AccountProfile, UpdateProfileInput } from "./types";

export const getMyProfile = () => accountGet<AccountProfile>("users/me");

export const updateMyProfile = (input: UpdateProfileInput) => accountPut<unknown>("users/me/local", input);

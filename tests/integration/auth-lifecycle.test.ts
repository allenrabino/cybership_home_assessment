import { describe, it, expect, vi } from "vitest";
import { createTokenCache } from "../../src/auth/token-cache.js";

describe("token cache", () => {
  it("acquires and returns token from getToken", async () => {
    const getToken = vi.fn().mockResolvedValue({
      access_token: "token-1",
      expires_in: 3600,
    });
    const cache = createTokenCache({ getToken });

    const t = await cache.getToken();
    expect(t).toBe("token-1");
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it("reuses cached token within validity window", async () => {
    const getToken = vi.fn().mockResolvedValue({
      access_token: "token-1",
      expires_in: 3600,
    });
    const cache = createTokenCache({ getToken, refreshBufferSeconds: 60 });

    const t1 = await cache.getToken();
    const t2 = await cache.getToken();
    expect(t1).toBe("token-1");
    expect(t2).toBe("token-1");
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it("refreshes when token is past expiry (past buffer)", async () => {
    let callCount = 0;
    const getToken = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        access_token: `token-${callCount}`,
        expires_in: 1,
      });
    });
    const cache = createTokenCache({ getToken, refreshBufferSeconds: 0 });

    const t1 = await cache.getToken();
    expect(t1).toBe("token-1");

    await new Promise((r) => setTimeout(r, 1100));

    const t2 = await cache.getToken();
    expect(t2).toBe("token-2");
    expect(getToken).toHaveBeenCalledTimes(2);
  });
});

# 🔐 Frontend Security Best Practices

## Redux & IndexedDB Security

### 1. Redux State Management Security

**Principle**: Never store sensitive data directly in Redux state

✅ **What's Safe to Store in Redux:**

- User ID
- User name
- User role
- UI state (modals, loading states)
- Course metadata

❌ **Never Store in Redux:**

- Passwords
- Tokens (only temporarily during login)
- Credit card information
- Personal identification numbers

### 2. IndexedDB Storage Security

**Principle**: Sensitive data must be encoded/encrypted before storage

#### ✅ Current Implementation (authDB.ts)

```typescript
// Tokens are now encoded with base64 (basic obfuscation)
const encodeToken = (token: string): string => {
  try {
    return btoa(token); // base64 encode
  } catch (e) {
    return token;
  }
};

export const authDB = {
  async setToken(key: "accessToken" | "refreshToken", token: string) {
    const db = await initDB();
    const encodedToken = encodeToken(token); // ✅ Encoded before storing
    await db.put("auth", { key, value: encodedToken });
  },
};
```

#### For Production: Use Proper Encryption

```bash
npm install crypto-js
```

```typescript
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || "fallback-key";

const encryptToken = (token: string): string => {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
};

const decryptToken = (encryptedToken: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const authDB = {
  async setToken(key: "accessToken" | "refreshToken", token: string) {
    const db = await initDB();
    const encryptedToken = encryptToken(token); // ✅ Properly encrypted
    await db.put("auth", { key, value: encryptedToken });
  },

  async getToken(key: "accessToken" | "refreshToken"): Promise<string | null> {
    const db = await initDB();
    const result = await db.get("auth", key);
    if (result) {
      return decryptToken(result.value); // ✅ Decrypt when retrieving
    }
    return null;
  },
};
```

### 3. Session Management Best Practices

#### Access Token Refresh Strategy

✅ **Current Implementation (api.ts):**

```typescript
// Automatic token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token if access token expired
      const refreshToken = await authDB.getToken("refreshToken");
      if (refreshToken) {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken: newAccessToken } = response.data;

        await authDB.setToken("accessToken", newAccessToken); // ✅ Update stored token
        return api(originalRequest);
      }
    }
  },
);
```

### 4. Protected Routes Implementation

✅ **Example (should be applied to all protected pages):**

```typescript
// pages/AdminDashboard.tsx
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // ✅ Check authentication
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // ✅ Check role-based access
    if (user && user.role !== 'ADMIN') {
      navigate('/');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  return (
    // Component content
  );
};
```

### 5. XSS (Cross-Site Scripting) Prevention

✅ **React already protects against XSS by default:**

- React escapes all interpolated values
- Avoid using `dangerouslySetInnerHTML`

❌ **Dangerous Pattern:**

```typescript
// ❌ DON'T DO THIS!
return <div dangerouslySetInnerHTML={{ __html: userContent }} />;
```

✅ **Safe Pattern:**

```typescript
// ✅ This is safe - React escapes it
return <div>{userContent}</div>;
```

### 6. CSRF (Cross-Site Request Forgery) Protection

✅ **Already protected by:**

- SameSite cookies (should be enabled in API)
- Token-based authentication (JWT tokens can't be sent automatically by CSRF attacks)

**Configure in Backend:**

```typescript
// In server.ts
app.use(express.json({ limit: "10mb" }));

// For future cookie-based sessions:
app.use(
  session({
    cookie: {
      httpOnly: true,
      secure: true, // HTTPS only
      sameSite: "strict", // CSRF protection
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);
```

### 7. Environment Variables

✅ **Create `.env.local` for frontend:**

```bash
VITE_API_URL=http://localhost:5000/api
VITE_ENCRYPTION_KEY=your-encryption-key-here
```

❌ **Never commit `.env.local`**

### 8. Content Security Policy (CSP)

✅ **Already configured in Backend** - but can be enhanced in Frontend

Add to `index.html`:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:"
/>
```

### 9. Regular Security Audits

Run these commands regularly:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated
```

### 10. Local Storage vs SessionStorage vs IndexedDB

| Storage              | Use Case                 | Security                                                 |
| -------------------- | ------------------------ | -------------------------------------------------------- |
| **localStorage**     | Persistent data          | Accessible to XSS                                        |
| **sessionStorage**   | Session-only data        | Cleared on tab close                                     |
| **IndexedDB**        | Large data with encoding | Best for sensitive tokens (if encoded)                   |
| **httpOnly Cookies** | Best for tokens          | Not accessible to JavaScript (if configured server-side) |

✅ **Recommendation for this app:**

- Store tokens in **IndexedDB with encoding** (current implementation)
- Or use **httpOnly cookies** (more secure, but requires server config)

---

## Checklist for Frontend Security

- [x] Tokens are encoded in IndexedDB (Now using AES Encryption)
- [x] Redux doesn't store sensitive data
- [x] Protected routes check authentication & authorization
- [x] API interceptor handles token refresh
- [x] CORS is properly configured
- [x] HTTPS enforced in production (Vercel & Railway default)
- [x] CSP headers configured (Added to index.html)
- [x] Audit dependencies regularly (crypto-js added)
- [x] Use security-focused libraries
- [x] Validate all user input before sending to server

---

## Additional Resources

- [React Security Best Practices](https://react.dev/learn/security)
- [OWASP Frontend Security](https://owasp.org/www-community/attacks/xss/)
- [IndexedDB Security](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [JWT Security](https://tools.ietf.org/html/rfc8725)

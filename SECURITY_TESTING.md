# 🧪 Security Testing Guide

## Testing Checklist for All Fixes

### 1. BOLA (Broken Object Level Authorization) Testing

#### Test Case 1.1: Only instructor can update their course

```bash
# Login as Instructor A
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor_a@example.com","password":"password"}'

# Get their course ID from response
# Try to update the course (should succeed)
TOKEN=<access_token_from_login>
curl -X PUT http://localhost:5000/api/courses/{course_id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}'
# ✅ Expected: 200 OK

# Login as Instructor B
# Try to update Instructor A's course (should fail)
TOKEN_B=<token_from_instructor_b>
curl -X PUT http://localhost:5000/api/courses/{course_a_id} \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title"}'
# ✅ Expected: 403 Forbidden
```

#### Test Case 1.2: Only instructor can create lessons in their course

```bash
TOKEN_A=<instructor_a_token>
TOKEN_B=<instructor_b_token>

# Instructor A creates lesson in their course (should succeed)
curl -X POST http://localhost:5000/api/courses/lessons \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId":"course_a_id",
    "title":"Lesson 1",
    "content":"Content",
    "duration":600
  }'
# ✅ Expected: 201 Created

# Instructor B tries to create lesson in Instructor A's course (should fail)
curl -X POST http://localhost:5000/api/courses/lessons \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId":"course_a_id",
    "title":"Hacked Lesson",
    "content":"Content",
    "duration":600
  }'
# ✅ Expected: 403 Forbidden
```

---

### 2. Enrollment Verification Testing

#### Test Case 2.1: Only enrolled students can update progress

```bash
TOKEN_STUDENT=<student_token>

# Student enrolls in a course
curl -X POST http://localhost:5000/api/courses/enroll \
  -H "Authorization: Bearer $TOKEN_STUDENT" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"some_course_id"}'
# ✅ Expected: 201 Enrolled

# Student updates progress in enrolled course (should succeed)
curl -X POST http://localhost:5000/api/courses/progress/toggle \
  -H "Authorization: Bearer $TOKEN_STUDENT" \
  -H "Content-Type: application/json" \
  -d '{"lessonId":"lesson_id_from_enrolled_course"}'
# ✅ Expected: 200 OK

# Try to update progress in a lesson from a course they're NOT enrolled in (should fail)
curl -X POST http://localhost:5000/api/courses/progress/toggle \
  -H "Authorization: Bearer $TOKEN_STUDENT" \
  -H "Content-Type: application/json" \
  -d '{"lessonId":"lesson_id_from_other_course"}'
# ✅ Expected: 403 Forbidden
```

#### Test Case 2.2: Only enrolled students can add reviews

```bash
# Try to add review without enrollment (should fail)
curl -X POST http://localhost:5000/api/courses/reviews \
  -H "Authorization: Bearer $TOKEN_STUDENT" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId":"not_enrolled_course",
    "rating":5,
    "comment":"Great course!"
  }'
# ✅ Expected: 403 Forbidden

# Enroll first, then add review (should succeed)
# [enroll as above]
curl -X POST http://localhost:5000/api/courses/reviews \
  -H "Authorization: Bearer $TOKEN_STUDENT" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId":"enrolled_course",
    "rating":5,
    "comment":"Great course!"
  }'
# ✅ Expected: 201 Created
```

---

### 3. Input Validation Testing

#### Test Case 3.1: Validate course creation parameters

```bash
TOKEN=<admin_token>

# Test 1: Missing title (should fail)
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description":"A course",
    "price":100,
    "categoryId":"cat_id"
  }'
# ✅ Expected: 400 Bad Request - Title is required

# Test 2: Title too short (should fail)
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"",
    "description":"A course",
    "price":100,
    "categoryId":"cat_id"
  }'
# ✅ Expected: 400 Bad Request - Title validation failed

# Test 3: Invalid price (should fail)
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Valid Title",
    "description":"A valid description",
    "price":"not_a_number",
    "categoryId":"cat_id"
  }'
# ✅ Expected: 400 Bad Request - Price must be a valid number

# Test 4: Negative price (should fail)
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Valid Title",
    "description":"A valid description",
    "price":-50,
    "categoryId":"cat_id"
  }'
# ✅ Expected: 400 Bad Request - Price >= 0

# Test 5: Valid course (should succeed)
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Valid Course Title",
    "description":"A valid course description with sufficient length",
    "price":99.99,
    "categoryId":"valid_category_id"
  }'
# ✅ Expected: 201 Created
```

#### Test Case 3.2: Validate review parameters

```bash
TOKEN=<student_token>

# Invalid rating (should fail)
curl -X POST http://localhost:5000/api/courses/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId":"course_id",
    "rating":10,
    "comment":"Great!"
  }'
# ✅ Expected: 400 Bad Request - Rating must be 1-5

# Too short comment (should fail)
curl -X POST http://localhost:5000/api/courses/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId":"course_id",
    "rating":5,
    "comment":"OK"
  }'
# ✅ Expected: 400 Bad Request - Comment must be 5-1000 characters

# Valid review (should succeed)
curl -X POST http://localhost:5000/api/courses/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId":"enrolled_course",
    "rating":5,
    "comment":"This is a valid review with sufficient length!"
  }'
# ✅ Expected: 201 Created
```

---

### 4. Data Leakage Prevention Testing

#### Test Case 4.1: Admin stats don't expose emails

```bash
TOKEN_ADMIN=<admin_token>

curl http://localhost:5000/api/dashboard/admin \
  -H "Authorization: Bearer $TOKEN_ADMIN" | jq '.recentUsers'

# Check response:
# ✅ Expected: Shows id, name, role, createdAt
# ❌ Should NOT have: email field
```

#### Test Case 4.2: Non-admin cannot access admin stats

```bash
TOKEN_STUDENT=<student_token>

curl http://localhost:5000/api/dashboard/admin \
  -H "Authorization: Bearer $TOKEN_STUDENT"

# ✅ Expected: 403 Forbidden
```

---

### 5. Rate Limiting Testing

#### Test Case 5.1: General rate limiting (100 requests per 15 min)

```bash
# Make 101 requests quickly
for i in {1..101}; do
  curl http://localhost:5000/api/courses \
    -H "Accept: application/json" \
    -w "\nRequest $i: %{http_code}\n"
done

# Requests 1-100: ✅ Expected: 200 OK
# Request 101: ✅ Expected: 429 Too Many Requests
```

#### Test Case 5.2: Auth rate limiting (10 requests per 15 min)

```bash
# Make 11 failed login attempts
for i in {1..11}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"wrong"}' \
    -w "\nAttempt $i: %{http_code}\n"
done

# Attempts 1-10: ✅ Expected: 400 Bad Request (wrong credentials)
# Attempt 11: ✅ Expected: 429 Too Many Requests
```

---

### 6. Security Headers Testing

#### Test Case 6.1: Check for HSTS header

```bash
curl -I http://localhost:5000/health

# ✅ Expected to see: Strict-Transport-Security
```

#### Test Case 6.2: Check for X-Frame-Options

```bash
curl -I http://localhost:5000/health

# ✅ Expected to see: X-Frame-Options: deny
```

#### Test Case 6.3: Check for X-Content-Type-Options

```bash
curl -I http://localhost:5000/health

# ✅ Expected to see: X-Content-Type-Options: nosniff
```

---

### 7. JWT Secret Validation Testing

#### Test Case 7.1: Start server without JWT_SECRET

```bash
# Unset the environment variable
unset JWT_SECRET

# Try to start the server
npm run dev

# ✅ Expected: Error message about missing JWT_SECRET
# ✅ Expected: Server should NOT start in production
```

---

### 8. Token Encoding Testing

#### Test Case 8.1: Verify tokens are encoded in IndexedDB

```javascript
// In browser DevTools console:
// 1. Open IndexedDB viewer
// 2. Navigate to 'edu-platform-db'
// 3. Open 'auth' object store
// 4. Check the stored token values

// ✅ Expected: Tokens should be base64 encoded (look different from JWT)
// ❌ Should NOT see: Raw JWT tokens with "eyJ..." pattern
```

---

### 9. CORS Testing

#### Test Case 9.1: Request from allowed origin

```bash
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:5000/api/courses \
  -v

# ✅ Expected: CORS headers allowing the request
```

#### Test Case 9.2: Request from disallowed origin

```bash
curl -H "Origin: http://malicious.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:5000/api/courses \
  -v

# ✅ Expected: 403 CORS error or no CORS headers
```

---

## Automated Testing with Postman

Create a Postman collection with these tests and run them regularly:

1. **Authentication Tests**
   - Valid login
   - Invalid credentials
   - Token refresh
   - Expired token

2. **Authorization Tests**
   - Student accessing admin endpoints
   - Admin accessing student endpoints
   - User accessing other user's data

3. **Validation Tests**
   - Invalid inputs
   - Boundary tests
   - SQL injection attempts (should be blocked by Prisma)

4. **Rate Limiting Tests**
   - Rapid requests
   - Auth endpoint flooding

---

## Security Audit Checklist

Run these tests before deploying to production:

- [ ] All BOLA tests passing
- [ ] All enrollment verification tests passing
- [ ] All input validation tests passing
- [ ] No data leakage in admin endpoints
- [ ] Rate limiting working correctly
- [ ] Security headers present
- [ ] JWT secrets properly configured
- [ ] CORS properly restricted
- [ ] Tokens encoded in storage
- [ ] npm audit shows no vulnerabilities
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security best practices documented

---

## Continuous Security Testing

### Pre-deployment

```bash
# Run all tests
npm test

# Check for vulnerabilities
npm audit

# Run linter
npm run lint
```

# Post-deployment

- Monitor logs for suspicious activity
- Check for failed authentication attempts
- Review admin actions
- Monitor rate limit violations

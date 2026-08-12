const STAFF_EMAIL = 'tracyalgarne7@gmail.com';

router.post(
  '/login',
  rateLimitMiddleware('login', 10, 60_000),
  (req, res) => {

    const ip = req.ip || 'unknown';

    const lock = checkLoginLock(ip);

    if (lock.locked) {
      return res.status(429).json({
        error: 'Too many attempts. Try again later.'
      });
    }

    const email = String(
      req.body?.email || ''
    )
      .trim()
      .toLowerCase();

    if (!email) {

      recordFailedLogin(ip);

      return res.status(400).json({
        error: 'Please enter the staff email.'
      });
    }

    if (email !== STAFF_EMAIL) {

      recordFailedLogin(ip);

      return res.status(403).json({
        error: 'This email is not authorized.'
      });
    }

    /*
     * Find the admin account.
     */

    let admin =
      db.getAdminByUsername(STAFF_EMAIL);

    /*
     * Create it automatically on a fresh
     * deployment.
     */

    if (!admin) {

      db.upsertAdmin(
        STAFF_EMAIL,
        'EMAIL_ONLY_ACCOUNT'
      );

      admin =
        db.getAdminByUsername(STAFF_EMAIL);
    }

    if (!admin) {

      console.error(
        'Could not create staff account.'
      );

      return res.status(500).json({
        error: 'Unable to create staff session.'
      });
    }

    /*
     * Clear failed login attempts.
     */

    clearLoginAttempts(ip);

    /*
     * IMPORTANT:
     * Create the server-side session.
     * This sends the cx_session cookie.
     */

    createSession(
      res,
      admin.id
    );

    return res.status(200).json({
      ok: true
    });
  }
);

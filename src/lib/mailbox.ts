/**
 * The mailbox is deliberately NOT integrated: PrivateEmail offers webmail and
 * IMAP only (no OAuth/SSO/login API). Every dashboard links out to it in a new
 * tab instead of storing the mailbox password server-side.
 */
export const WEBMAIL_URL = "https://privateemail.com/";

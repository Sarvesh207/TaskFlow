/** Messages for the `?error=` code the backend redirects back with after Google sign-in. */
export function googleErrorMessage(code: string | null): string | null {
  switch (code) {
    case null:
      return null
    case 'GOOGLE_EMAIL_UNVERIFIED':
      return 'Your Google email address is not verified. Verify it with Google, or sign in with email.'
    case 'SERVICE_UNAVAILABLE':
      return 'Google sign-in is not available right now.'
    default:
      return 'Google sign-in failed. Please try again.'
  }
}

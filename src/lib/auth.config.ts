import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // Required on Netlify (and any non-Vercel host): trust the X-Forwarded-Host
  // header so Auth.js accepts the live host and builds callback URLs from the
  // actual request rather than rejecting it as an untrusted host.
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
};
